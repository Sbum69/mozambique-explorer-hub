-- SEG-2: administrators must use two-factor authentication (TOTP, Supabase Auth MFA).
-- has_role(auth.uid(), 'admin') is the check behind every admin RLS policy (60) and admin
-- function (26). It now answers true for the signed-in admin only when the session is aal2
-- (password + TOTP code). Unchanged:
--   * checks about other users (has_role(other_id, 'admin'), e.g. "last admin" rules);
--   * server jobs and service-role calls without a user session (auth.uid() is null);
--   * every other role.
-- An admin with an aal1 session is treated as a normal signed-in user until they enter the code.
-- No table, data or policy changes.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND NOT (
    _role = 'admin'::public.app_role
    AND _user_id IS NOT DISTINCT FROM auth.uid()
    AND auth.uid() IS NOT NULL
    AND COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
  )
$function$;
