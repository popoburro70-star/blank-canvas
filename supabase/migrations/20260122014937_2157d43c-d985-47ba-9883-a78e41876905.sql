-- Harden access to role data: authenticated users can only read their own roles; anonymous users get no SELECT access.

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Replace the existing SELECT policy with an authenticated-only RESTRICTIVE policy
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
