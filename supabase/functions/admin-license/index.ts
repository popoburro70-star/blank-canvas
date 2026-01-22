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

function randomKey(): string {
  // 32 chars (UUID without dashes) + prefix
  return `COC-${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
}

const UsernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/, "invalid_username");

const RequestSchema = z.object({
  action: z.enum([
    "list_users",
    "create_user",
    "set_user_enabled",
    "list_keys",
    "create_key",
    "revoke_key",
  ]),
  payload: z.record(z.unknown()).optional(),
});

// NOTE: Edge runtime type inference for SupabaseClient generics can be overly strict.
// We intentionally accept `any` here to avoid typecheck failures while keeping runtime safety.
async function requireAdmin(req: Request, admin: any) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";

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

    const { action, payload } = parsed.data;

    if (action === "list_users") {
      const { data, error } = await admin
        .from("license_users")
        .select("id, username, enabled, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("list_users error", error);
        return json({ ok: false, error: "db_error" }, 500);
      }
      return json({ ok: true, users: data ?? [] });
    }

    if (action === "create_user") {
      const username = UsernameSchema.safeParse(payload?.username);
      if (!username.success) return json({ ok: false, error: "invalid_username" }, 400);

      const { data, error } = await admin
        .from("license_users")
        .insert({ username: username.data, enabled: true })
        .select("id, username, enabled, created_at")
        .single();

      if (error) {
        console.error("create_user error", error);
        const msg = (error as any)?.code === "23505" ? "user_exists" : "db_error";
        return json({ ok: false, error: msg }, 400);
      }

      return json({ ok: true, user: data });
    }

    if (action === "set_user_enabled") {
      const id = z.string().uuid().safeParse(payload?.id);
      const enabled = z.boolean().safeParse(payload?.enabled);
      if (!id.success || !enabled.success) return json({ ok: false, error: "invalid_input" }, 400);

      const { data, error } = await admin
        .from("license_users")
        .update({ enabled: enabled.data })
        .eq("id", id.data)
        .select("id, username, enabled, created_at")
        .maybeSingle();

      if (error) {
        console.error("set_user_enabled error", error);
        return json({ ok: false, error: "db_error" }, 500);
      }
      if (!data) return json({ ok: false, error: "not_found" }, 404);
      return json({ ok: true, user: data });
    }

    if (action === "list_keys") {
      const { data, error } = await admin
        .from("license_keys")
        .select("id, valid_days, max_activations, first_activated_at, expires_at, revoked_at, note, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("list_keys error", error);
        return json({ ok: false, error: "db_error" }, 500);
      }
      return json({ ok: true, keys: data ?? [] });
    }

    if (action === "create_key") {
      const validDays = z.number().int().min(1).max(3650).safeParse(payload?.valid_days);
      const note = z.string().trim().max(200).optional().safeParse(payload?.note);
      if (!validDays.success || !note.success) return json({ ok: false, error: "invalid_input" }, 400);

      const keyPlain = randomKey();
      const keyHash = await sha256Hex(keyPlain);

      const { data, error } = await admin
        .from("license_keys")
        .insert({
          key_hash: keyHash,
          valid_days: validDays.data,
          max_activations: 1,
          note: note.data,
        })
        .select("id, valid_days, max_activations, first_activated_at, expires_at, revoked_at, note, created_at")
        .single();

      if (error) {
        console.error("create_key error", error);
        return json({ ok: false, error: "db_error" }, 500);
      }

      // Return plaintext key ONLY once
      return json({ ok: true, key: keyPlain, record: data });
    }

    if (action === "revoke_key") {
      const id = z.string().uuid().safeParse(payload?.id);
      if (!id.success) return json({ ok: false, error: "invalid_input" }, 400);

      const { data, error } = await admin
        .from("license_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id.data)
        .select("id, valid_days, max_activations, first_activated_at, expires_at, revoked_at, note, created_at")
        .maybeSingle();

      if (error) {
        console.error("revoke_key error", error);
        return json({ ok: false, error: "db_error" }, 500);
      }
      if (!data) return json({ ok: false, error: "not_found" }, 404);
      return json({ ok: true, key: data });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (e) {
    console.error("admin-license unexpected error", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
