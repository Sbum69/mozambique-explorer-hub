-- Apply least-privilege grants to the authentication foundation.
-- RLS policies, functions, triggers and roles are NOT changed.

-- === public.profiles ===
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
-- service_role keeps full access (already has it; re-affirm explicitly)
GRANT ALL ON public.profiles TO service_role;

-- === public.user_roles ===
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM authenticated;

GRANT SELECT ON public.user_roles TO authenticated;
-- service_role keeps full access
GRANT ALL ON public.user_roles TO service_role;