-- Harden RLS for licensing tables: admin-only access (including SELECT) across all roles.

-- license_users
ALTER TABLE public.license_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_license_users" ON public.license_users;
DROP POLICY IF EXISTS "license_users_admin_only" ON public.license_users;
CREATE POLICY "license_users_admin_only"
ON public.license_users
AS RESTRICTIVE
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- license_activations
ALTER TABLE public.license_activations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_all_license_activations" ON public.license_activations;
DROP POLICY IF EXISTS "license_activations_admin_only" ON public.license_activations;
CREATE POLICY "license_activations_admin_only"
ON public.license_activations
AS RESTRICTIVE
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- license_keys (adjust to cover all roles explicitly)
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "license_keys_admin_only" ON public.license_keys;
CREATE POLICY "license_keys_admin_only"
ON public.license_keys
AS RESTRICTIVE
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));