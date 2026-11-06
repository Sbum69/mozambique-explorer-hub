-- admin_set_user_role now writes its own admin_audit row (action role.grant / role.revoke), in the
-- same transaction as the change, with the roles before and after. Until now only the 05/11/2026
-- revoke was audited, by hand. Same checks and errors as 0039; the row is written only when the
-- roles actually change (granting a role the user already has writes nothing).
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result text[];
  before_roles text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _role NOT IN ('business_small', 'business_large', 'admin') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  -- Serialise role changes so two admins cannot remove the last admin at the same time.
  PERFORM pg_advisory_xact_lock(hashtext('admin_roles'));
  SELECT coalesce(array_agg(role::text ORDER BY role::text), '{}') INTO before_roles
    FROM public.user_roles WHERE user_id = _user_id;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
    IF _role IN ('business_small', 'business_large') THEN
      DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'tourist';
    END IF;
  ELSE
    IF _role = 'admin' AND _user_id = auth.uid() THEN RAISE EXCEPTION 'CANNOT_REVOKE_OWN_ADMIN'; END IF;
    IF _role = 'admin' AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' AND user_id <> _user_id) THEN
      RAISE EXCEPTION 'LAST_ADMIN';
    END IF;
    IF _role IN ('business_small', 'business_large') AND EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
      RAISE EXCEPTION 'OWNS_BUSINESS';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'tourist');
    END IF;
  END IF;
  SELECT array_agg(role::text ORDER BY role::text) INTO result FROM public.user_roles WHERE user_id = _user_id;
  IF result IS DISTINCT FROM before_roles THEN
    INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
    VALUES (
      auth.uid(),
      CASE WHEN _grant THEN 'role.grant' ELSE 'role.revoke' END,
      'user_roles',
      _user_id::text,
      jsonb_build_object('roles', to_jsonb(before_roles)),
      jsonb_build_object('roles', to_jsonb(result)),
      _role::text
    );
  END IF;
  RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO authenticated;
