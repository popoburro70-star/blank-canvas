import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const AdminResponseSchema = z.object({ ok: z.boolean() }).passthrough();

export type LicenseUser = {
  id: string;
  username: string;
  enabled: boolean;
  created_at: string;
};

export type LicenseKey = {
  id: string;
  valid_days: number;
  max_activations: number;
  first_activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  note: string | null;
  created_at: string;
};

async function invoke<T>(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-license", {
    body: { action, payload },
  });
  if (error) throw error;
  const parsed = AdminResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid server response");
  return data as T;
}

export const adminLicenseApi = {
  listUsers: async () => {
    const res = await invoke<{ ok: true; users: LicenseUser[] }>("list_users");
    return res.users;
  },
  createUser: async (username: string) => {
    const res = await invoke<{ ok: true; user: LicenseUser }>("create_user", { username });
    return res.user;
  },
  setUserEnabled: async (id: string, enabled: boolean) => {
    const res = await invoke<{ ok: true; user: LicenseUser }>("set_user_enabled", { id, enabled });
    return res.user;
  },
  listKeys: async () => {
    const res = await invoke<{ ok: true; keys: LicenseKey[] }>("list_keys");
    return res.keys;
  },
  createKey: async (validDays: number, note?: string) => {
    const res = await invoke<{ ok: true; key: string; record: LicenseKey }>("create_key", {
      valid_days: validDays,
      note: note ?? null,
    });
    return res;
  },
  revokeKey: async (id: string) => {
    const res = await invoke<{ ok: true; key: LicenseKey }>("revoke_key", { id });
    return res.key;
  },
};
