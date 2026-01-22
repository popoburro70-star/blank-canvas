// Lovable Cloud backend function: validate-license
// Public endpoint (verify_jwt=false) intended for desktop/python client validation.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing backend env vars");
      return json({ ok: false, error: "server_misconfigured" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null;

    const body = await req.json().catch(() => null) as null | {
      username?: string;
      license_key?: string;
      hwid?: string;
    };

    const username = (body?.username ?? "").trim();
    const licenseKey = (body?.license_key ?? "").trim();
    const hwid = (body?.hwid ?? "").trim();

    if (!username || !licenseKey || !hwid) {
      return json({ ok: false, status: "invalid_input" }, 400);
    }

    const [keyHash, hwidHash] = await Promise.all([
      sha256Hex(licenseKey),
      sha256Hex(hwid),
    ]);

    const { data: user, error: userErr } = await admin
      .from("license_users")
      .select("id, enabled")
      .eq("username", username)
      .maybeSingle();

    if (userErr) {
      console.error("license_users lookup error", userErr);
      return json({ ok: false, error: "db_error" }, 500);
    }

    if (!user) return json({ ok: false, status: "user_not_found" }, 200);
    if (!user.enabled) return json({ ok: false, status: "user_disabled" }, 200);

    const { data: lic, error: licErr } = await admin
      .from("license_keys")
      .select("id, valid_days, max_activations, first_activated_at, expires_at, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (licErr) {
      console.error("license_keys lookup error", licErr);
      return json({ ok: false, error: "db_error" }, 500);
    }

    if (!lic) return json({ ok: false, status: "invalid_key" }, 200);
    if (lic.revoked_at) return json({ ok: false, status: "revoked" }, 200);

    // Activation lookup (1 machine per key enforced by unique index)
    const { data: activation, error: actErr } = await admin
      .from("license_activations")
      .select("id, hwid_hash")
      .eq("license_key_id", lic.id)
      .maybeSingle();

    if (actErr) {
      console.error("license_activations lookup error", actErr);
      return json({ ok: false, error: "db_error" }, 500);
    }

    // If activated: HWID must match
    if (activation && activation.hwid_hash !== hwidHash) {
      return json({ ok: false, status: "hwid_mismatch" }, 200);
    }

    // Ensure first_activated_at + expires_at are set on first successful validation
    const now = new Date();
    let firstActivatedAt = lic.first_activated_at ? new Date(lic.first_activated_at) : null;
    let expiresAt = lic.expires_at ? new Date(lic.expires_at) : null;

    if (!activation) {
      // activation slot available?
      if ((lic.max_activations ?? 1) < 1) {
        return json({ ok: false, status: "activation_limit" }, 200);
      }

      // Create activation
      const { error: insErr } = await admin.from("license_activations").insert({
        license_key_id: lic.id,
        license_user_id: user.id,
        hwid_hash: hwidHash,
        last_seen_at: now.toISOString(),
        last_ip: ip,
      });

      if (insErr) {
        // Unique violation => already activated concurrently
        console.error("activation insert error", insErr);
        return json({ ok: false, status: "activation_limit" }, 200);
      }
    } else {
      // Update last_seen
      const { error: updActErr } = await admin
        .from("license_activations")
        .update({ last_seen_at: now.toISOString(), last_ip: ip })
        .eq("id", activation.id);
      if (updActErr) console.error("activation update error", updActErr);
    }

    if (!firstActivatedAt) {
      firstActivatedAt = now;
    }

    if (!expiresAt) {
      const days = Math.max(1, Number(lic.valid_days ?? 30));
      expiresAt = new Date(firstActivatedAt.getTime() + days * 24 * 60 * 60 * 1000);
    }

    // Persist computed dates if needed
    if (!lic.first_activated_at || !lic.expires_at) {
      const { error: updLicErr } = await admin
        .from("license_keys")
        .update({
          first_activated_at: firstActivatedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", lic.id);

      if (updLicErr) {
        console.error("license_keys update error", updLicErr);
        // Non-fatal: continue with computed values
      }
    }

    if (expiresAt.getTime() < now.getTime()) {
      return json(
        {
          ok: false,
          status: "expired",
          first_activated_at: firstActivatedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        200,
      );
    }

    return json(
      {
        ok: true,
        status: "valid",
        first_activated_at: firstActivatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      200,
    );
  } catch (e) {
    console.error("validate-license unexpected error", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
