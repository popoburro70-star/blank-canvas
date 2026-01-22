-- Fix user_roles SELECT RLS: restrictive-only policies deny all rows because restrictive policies are ANDed with the OR of permissive policies.

BEGIN;

-- Ensure RLS enabled (idempotent)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop the restrictive policy if present
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

-- Recreate as a PERMISSIVE policy for authenticated users
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

COMMIT;