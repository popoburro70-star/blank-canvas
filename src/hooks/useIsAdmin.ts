import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(userId?: string) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(Boolean(data));
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { isAdmin, loading };
}
