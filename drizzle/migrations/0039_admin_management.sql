-- ADM-1: admin actions validated on the server.
-- * Suspend / reactivate an approved business (reason required to suspend). A suspended business is
--   not public and cannot be booked (commercial_activity_public requires 'approved'); its existing
--   pending/confirmed bookings are left as they are and reported back to the admin.
-- * Grant / revoke business and admin roles (never the caller's own admin role, never the last admin).
-- * Assign an owner to an ownerless business (confirmed account, no business yet, not an admin).
-- * Owners are notified of suspension, reactivation and assignment.
-- No table, data or RLS changes.

CREATE OR REPLACE FUNCTION public.admin_set_business_status(_business_id uuid, _status business_status, _reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.businesses; open_bookings integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = _business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _status = 'suspended' THEN
    IF b.status <> 'approved' THEN RAISE EXCEPTION 'NOT_APPROVED'; END IF;
    IF _reason IS NULL OR char_length(btrim(_reason)) < 3 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    UPDATE public.businesses
       SET status = 'suspended', verified = false, rejection_reason = left(btrim(_reason), 1000),
           decided_at = now(), decided_by = auth.uid()
     WHERE id = b.id;
  ELSIF _status = 'approved' THEN
    IF b.status <> 'suspended' THEN RAISE EXCEPTION 'NOT_SUSPENDED'; END IF;
    UPDATE public.businesses
       SET status = 'approved', verified = true, rejection_reason = NULL,
           decided_at = now(), decided_by = auth.uid()
     WHERE id = b.id;
  ELSE
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  SELECT count(*) INTO open_bookings FROM public.bookings
   WHERE business_id = b.id AND status IN ('pending', 'confirmed');
  RETURN jsonb_build_object('status', _status, 'open_bookings', open_bookings);
END $function$;

-- Owner notifications now also cover suspension and reactivation.
CREATE OR REPLACE FUNCTION public.businesses_notify_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','suspended') AND NEW.owner_id IS NOT NULL THEN
    IF NEW.status = 'approved' AND OLD.status = 'suspended' THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.owner_id, 'business', 'Negócio reativado', 'Business reactivated',
        'O teu negócio "' || NEW.name || '" foi reativado e voltou a estar visível em Negócios Locais.',
        'Your business "' || NEW.name || '" was reactivated and is listed in Local Businesses again.',
        '/business-dashboard');
    ELSIF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.owner_id, 'business', 'Negócio aprovado', 'Business approved',
        'O teu negócio "' || NEW.name || '" foi aprovado e já está visível em Negócios Locais.',
        'Your business "' || NEW.name || '" was approved and is now listed in Local Businesses.',
        '/business-dashboard');
    ELSIF NEW.status = 'suspended' THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.owner_id, 'business', 'Negócio suspenso', 'Business suspended',
        'O teu negócio "' || NEW.name || '" foi suspenso e deixou de estar visível e reservável.' || COALESCE(' Motivo: ' || NULLIF(NEW.rejection_reason,''), '') || ' As reservas já existentes mantêm-se; contacta a equipa Ekaya.',
        'Your business "' || NEW.name || '" was suspended and is no longer listed or bookable.' || COALESCE(' Reason: ' || NULLIF(NEW.rejection_reason,''), '') || ' Existing bookings remain; please contact the Ekaya team.',
        '/business-dashboard');
    ELSE
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.owner_id, 'business', 'Negócio rejeitado', 'Business rejected',
        'O teu negócio "' || NEW.name || '" foi rejeitado.' || COALESCE(' Motivo: ' || NULLIF(NEW.rejection_reason,''), '') || ' Corrige os dados ou contacta a equipa Ekaya.',
        'Your business "' || NEW.name || '" was rejected.' || COALESCE(' Reason: ' || NULLIF(NEW.rejection_reason,''), '') || ' Please fix the details or contact the Ekaya team.',
        '/business-dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Roles: tourist is the fallback role (restored when an account has no other role and removed when
-- a business role is granted, as in business registration).
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _role NOT IN ('business_small', 'business_large', 'admin') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  -- Serialise role changes so two admins cannot remove the last admin at the same time.
  PERFORM pg_advisory_xact_lock(hashtext('admin_roles'));
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
  RETURN result;
END $function$;

-- Ownerless (catalogue) business gets a confirmed, business-free, non-admin account as owner.
CREATE OR REPLACE FUNCTION public.admin_assign_business_owner(_business_id uuid, _email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE b public.businesses; target uuid; confirmed timestamptz; owner_role app_role;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = _business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF b.owner_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_OWNED'; END IF;
  SELECT u.id, u.email_confirmed_at INTO target, confirmed FROM auth.users u
   WHERE lower(u.email) = lower(btrim(_email)) LIMIT 1;
  IF target IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF confirmed IS NULL THEN RAISE EXCEPTION 'USER_NOT_CONFIRMED'; END IF;
  IF public.has_role(target, 'admin') THEN RAISE EXCEPTION 'USER_IS_ADMIN'; END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = target) THEN RAISE EXCEPTION 'USER_HAS_BUSINESS'; END IF;
  UPDATE public.businesses SET owner_id = target, updated_at = now() WHERE id = b.id;
  owner_role := CASE WHEN b.type = 'large' THEN 'business_large'::app_role ELSE 'business_small'::app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (target, owner_role) ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = target AND role = 'tourist';
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (target, 'business', 'Negócio atribuído', 'Business assigned',
    'Passaste a gerir o negócio "' || b.name || '" na Ekaya. Revê o perfil, as atividades e os horários no teu painel.',
    'You now manage the business "' || b.name || '" on Ekaya. Review its profile, activities and schedules in your dashboard.',
    '/business-dashboard');
  RETURN jsonb_build_object('business_id', b.id, 'owner_id', target, 'role', owner_role);
END $function$;

REVOKE ALL ON FUNCTION public.admin_set_business_status(uuid, business_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_business_status(uuid, business_status, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_assign_business_owner(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_business_owner(uuid, text) TO authenticated, service_role;
