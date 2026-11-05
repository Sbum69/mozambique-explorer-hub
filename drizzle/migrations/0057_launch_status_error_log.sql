-- Launch preparation.
-- * admin_launch_status(): one read for Admin → "Estado do lançamento" — approved businesses and
--   active activities against the minimums, what each one is missing, pending "Para negócios"
--   requests, admins without two-step verification and highlights waiting for the admin.
--   Internal accounts (tests and team) are left out of the counts. Needs 0054 and 0055.
-- * app_errors: simple error monitoring. No personal data: page path (no query string), a short
--   message with emails and long numbers masked, the app version. Written only through
--   log_app_error() with a daily ceiling; read only by the admin; kept 30 days (pg_cron).

CREATE OR REPLACE FUNCTION public.admin_launch_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  WITH real_biz AS (
    SELECT b.* FROM public.businesses b
     WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = b.owner_id AND p.is_internal)
  ), exps AS (
    SELECT e.*, public.experience_missing(e) AS missing FROM public.experiences e
     WHERE e.business_id IN (SELECT id FROM real_biz)
  )
  SELECT jsonb_build_object(
    'min_businesses', 5,
    'min_experiences', 5,
    'approved_businesses', (SELECT count(*) FROM real_biz WHERE status = 'approved'),
    'active_experiences', (SELECT count(*) FROM exps e JOIN real_biz b ON b.id = e.business_id
                            WHERE e.active AND b.status = 'approved'),
    'businesses', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'status', b.status, 'has_owner', b.owner_id IS NOT NULL,
        'missing', public.business_missing(b),
        'experiences', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title_pt,
                          'active', e.active, 'missing', e.missing) ORDER BY e.title_pt)
                         FROM exps e WHERE e.business_id = b.id), '[]'::jsonb))
        ORDER BY b.status, b.name) FROM real_biz b WHERE b.status IN ('approved', 'pending')), '[]'::jsonb),
    'pending_leads', (SELECT count(*) FROM public.business_leads WHERE status = 'new'),
    'placements_waiting', (SELECT count(*) FROM public.sponsored_placements
                            WHERE status IN ('requested', 'awaiting_payment')),
    'admins_without_2fa', (SELECT count(*) FROM public.user_roles ur
                             JOIN public.profiles p ON p.id = ur.user_id AND p.deleted_at IS NULL
                            WHERE ur.role = 'admin'
                              AND NOT EXISTS (SELECT 1 FROM auth.mfa_factors f
                                               WHERE f.user_id = ur.user_id AND f.status = 'verified')),
    'errors_7d', (SELECT count(*) FROM public.app_errors WHERE created_at > now() - interval '7 days'),
    'read_at', now()
  ) INTO out;
  RETURN out;
END;
$function$;

CREATE TABLE public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('client', 'server')),
  route text NOT NULL CHECK (char_length(route) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 300),
  release text CHECK (release IS NULL OR char_length(release) <= 20),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_errors_created_idx ON public.app_errors (created_at DESC);
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_errors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.app_errors TO authenticated;
CREATE POLICY "Admins read app errors" ON public.app_errors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- admin_launch_status reads app_errors, so it is granted after the table exists.
REVOKE ALL ON FUNCTION public.admin_launch_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_launch_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.log_app_error(_kind text, _route text, _message text, _release text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r text := left(split_part(split_part(coalesce(_route, '/'), '?', 1), '#', 1), 200);
  m text := left(regexp_replace(btrim(coalesce(_message, '')), '\s+', ' ', 'g'), 300);
BEGIN
  IF m = '' THEN RETURN; END IF;
  -- No personal data: emails, long numbers and UUIDs are masked.
  m := regexp_replace(m, '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g');
  m := regexp_replace(m, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '[id]', 'gi');
  m := regexp_replace(m, '[0-9][0-9 ]{6,}[0-9]', '[número]', 'g');
  r := regexp_replace(r, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '$id', 'gi');
  IF (SELECT count(*) FROM public.app_errors WHERE created_at > now() - interval '1 day') >= 2000 THEN RETURN; END IF;
  INSERT INTO public.app_errors (kind, route, message, release)
  VALUES (CASE WHEN _kind = 'server' THEN 'server' ELSE 'client' END, CASE WHEN r = '' THEN '/' ELSE r END, m,
          left(nullif(btrim(coalesce(_release, '')), ''), 20));
END;
$function$;
REVOKE ALL ON FUNCTION public.log_app_error(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_app_error(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.app_errors_purge()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  DELETE FROM public.app_errors WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.app_errors_purge() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.schedule('ekaya-app-errors-purge', '20 1 * * *', 'SELECT public.app_errors_purge()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%): schedule public.app_errors_purge() elsewhere', SQLERRM;
END $$;
