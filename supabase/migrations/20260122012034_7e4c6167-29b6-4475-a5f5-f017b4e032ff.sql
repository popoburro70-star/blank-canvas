-- Fix RLS policy for license_keys: admin-only access.

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_license_keys" ON public.license_keys;
DROP POLICY IF EXISTS "license_keys_admin_only" ON public.license_keys;

CREATE POLICY "license_keys_admin_only"
ON public.license_keys
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));