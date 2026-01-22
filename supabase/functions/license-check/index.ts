// Lovable Cloud backend function: license-check
// Admin-only helper endpoint for the web panel to check a license WITHOUT activating/binding HWID.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

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

// NOTE: Edge runtime type inference for SupabaseClient generics can be overly strict.
// We intentionally accept `any` here to avoid typecheck failures while keeping runtime safety.
async function requireAdmin(req: Request, admin: any) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (!token) return { ok: false as const, status: 401 as const, error: "missing_token" };

  const { data: claims, error: claimsErr } = await admin.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    console.error("getClaims error", claimsErr);
    return { ok: false as const, status: 401 as const, error: "invalid_token" };
  }

  const userId = claims.claims.sub;
  const { data: roleRow, error: roleErr } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr) {
    console.error("role lookup error", roleErr);
    return { ok: false as const, status: 500 as const, error: "db_error" };
  }

  if (!roleRow) return { ok: false as const, status: 403 as const, error: "forbidden" };
  return { ok: true as const, userId };
}

const RequestSchema = z.object({
  username: z.string().trim().min(1).max(64),
  license_key: z.string().trim().min(1).max(128),
});

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

    const authz = await requireAdmin(req, admin);
    if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

    const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "invalid_input" }, 400);

    const { username, license_key: licenseKey } = parsed.data;
    const keyHash = await sha256Hex(licenseKey);

    const { data: user, error: userErr } = await admin
      .from("license_users")
      .select("id, enabled")
      .eq("username", username)
      .maybeSingle();

    if (userErr) {
      console.error("license_users lookup error", userErr);
      return json({ ok: false, error: "db_error" }, 500);
    }

    if (!user) return json({ ok: true, status: "user_not_found" }, 200);
    if (!user.enabled) return json({ ok: true, status: "user_disabled" }, 200);

    const { data: lic, error: licErr } = await admin
      .from("license_keys")
      .select("id, valid_days, max_activations, first_activated_at, expires_at, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (licErr) {
      console.error("license_keys lookup error", licErr);
      return json({ ok: false, error: "db_error" }, 500);
    }
    if (!lic) return json({ ok: true, status: "invalid_key" }, 200);
    if (lic.revoked_at) return json({ ok: true, status: "revoked" }, 200);

    const { data: activation, error: actErr } = await admin
      .from("license_activations")
      .select("id, hwid_hash, created_at, last_seen_at")
      .eq("license_key_id", lic.id)
      .maybeSingle();

    if (actErr) {
      console.error("license_activations lookup error", actErr);
      return json({ ok: false, error: "db_error" }, 500);
    }

    const now = new Date();
    const firstActivatedAt = lic.first_activated_at ? new Date(lic.first_activated_at) : null;
    const expiresAt = lic.expires_at ? new Date(lic.expires_at) : null;

    const computedWouldExpireAt = (() => {
      const days = Math.max(1, Number(lic.valid_days ?? 30));
      const base = firstActivatedAt ?? now;
      return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    })();

    const effectiveExpiresAt = expiresAt ?? computedWouldExpireAt;
    if (effectiveExpiresAt.getTime() < now.getTime()) {
      return json(
        {
          ok: true,
          status: "expired",
          first_activated_at: firstActivatedAt?.toISOString() ?? null,
          expires_at: effectiveExpiresAt.toISOString(),
          activated: Boolean(activation),
        },
        200,
      );
    }

    return json(
      {
        ok: true,
        status: activation ? "already_activated" : "not_activated",
        first_activated_at: firstActivatedAt?.toISOString() ?? null,
        expires_at: effectiveExpiresAt.toISOString(),
        activation: activation
          ? {
              id: activation.id,
              hwid_hash_prefix: String(activation.hwid_hash ?? "").slice(0, 12),
              created_at: activation.created_at,
              last_seen_at: activation.last_seen_at,
            }
          : null,
      },
      200,
    );
  } catch (e) {
    console.error("license-check unexpected error", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
