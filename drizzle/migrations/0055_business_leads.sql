-- M9: "Para negócios" — interest requests from businesses that want to join.
-- * business_leads: written only by submit_business_lead() (anon or signed in), read and changed
--   only by the admin. No direct grants to anon or authenticated.
-- * Anti-spam in the database: a honeypot field (filled = silently ignored) and a limit per IP per
--   day (the IP is never stored, only a daily hash), plus a global daily ceiling.
-- * founder_places_left(): remaining Founding Partner places for the public page.
-- * Admin: admin_set_lead_status() (novo, contactado, convertido, descartado), audited; "convert"
--   links the business created through the 0051 import.

CREATE TABLE public.business_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL CHECK (char_length(btrim(business_name)) BETWEEN 2 AND 120),
  province_id uuid NOT NULL REFERENCES public.provinces (id),
  category_code text NOT NULL REFERENCES public.business_categories (code),
  contact_name text NOT NULL CHECK (char_length(btrim(contact_name)) BETWEEN 2 AND 120),
  contact text NOT NULL CHECK (char_length(btrim(contact)) BETWEEN 6 AND 160),
  accepts_bookings boolean NOT NULL,
  message text CHECK (message IS NULL OR char_length(message) <= 1000),
  lang text NOT NULL DEFAULT 'pt' CHECK (lang IN ('pt', 'en')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'discarded')),
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  business_id uuid REFERENCES public.businesses (id) ON DELETE SET NULL,
  ip_day_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_leads_status_idx ON public.business_leads (status, created_at DESC);
CREATE INDEX business_leads_ip_idx ON public.business_leads (ip_day_hash, created_at);
ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.business_leads TO authenticated;
CREATE POLICY "Admins read leads" ON public.business_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Client IP from the request headers set by the API gateway (Cloudflare first).
CREATE OR REPLACE FUNCTION public.request_ip()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    nullif(current_setting('request.headers', true), '')::json->>'cf-connecting-ip',
    split_part(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', ',', 1),
    'unknown');
$function$;
REVOKE ALL ON FUNCTION public.request_ip() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_business_lead(_business_name text, _province_id uuid, _category_code text,
  _contact_name text, _contact text, _accepts_bookings boolean, _message text, _lang text, _website text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE h text; n int; lead public.business_leads;
BEGIN
  -- Honeypot: people never see this field; bots fill it. Answer as if it worked.
  IF coalesce(btrim(_website), '') <> '' THEN RETURN 'ok'; END IF;
  h := encode(digest(public.request_ip() || '|' || current_date::text || '|ekaya-leads', 'sha256'), 'hex');
  SELECT count(*) INTO n FROM public.business_leads WHERE ip_day_hash = h AND created_at > now() - interval '1 day';
  IF n >= 3 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
  SELECT count(*) INTO n FROM public.business_leads WHERE created_at > now() - interval '1 day';
  IF n >= 200 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provinces WHERE id = _province_id AND active) THEN RAISE EXCEPTION 'INVALID_PROVINCE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_categories WHERE code = _category_code AND active) THEN
    RAISE EXCEPTION 'INVALID_CATEGORY';
  END IF;
  IF _accepts_bookings IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  INSERT INTO public.business_leads (business_name, province_id, category_code, contact_name, contact,
    accepts_bookings, message, lang, ip_day_hash)
  VALUES (btrim(_business_name), _province_id, _category_code, btrim(_contact_name), btrim(_contact),
    _accepts_bookings, nullif(btrim(coalesce(_message, '')), ''), CASE WHEN _lang = 'en' THEN 'en' ELSE 'pt' END, h)
  RETURNING * INTO lead;
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  SELECT ur.user_id, 'business', 'Novo pedido em Para negócios', 'New request in For businesses',
         'Negócio: ' || lead.business_name || '.', 'Business: ' || lead.business_name || '.', '/admin'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN 'ok';
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_business_lead(text, uuid, text, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_business_lead(text, uuid, text, text, text, boolean, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_lead_status(_id uuid, _status text, _note text DEFAULT NULL, _business_id uuid DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE before jsonb; after jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _status NOT IN ('new', 'contacted', 'converted', 'discarded') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT to_jsonb(l) INTO before FROM public.business_leads l WHERE l.id = _id FOR UPDATE;
  IF before IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _business_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  UPDATE public.business_leads
     SET status = _status, admin_note = coalesce(nullif(btrim(coalesce(_note, '')), ''), admin_note),
         business_id = coalesce(_business_id, business_id), updated_at = now()
   WHERE id = _id RETURNING to_jsonb(business_leads.*) INTO after;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
  VALUES (auth.uid(), 'lead.' || _status, 'business_leads', _id::text, before - 'ip_day_hash', after - 'ip_day_hash',
          nullif(btrim(coalesce(_note, '')), ''));
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_lead_status(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_lead_status(uuid, text, text, uuid) TO authenticated;

-- Founding Partner places still open (every business that was ever a Founder counts, as in 0053).
CREATE OR REPLACE FUNCTION public.founder_places_left()
 RETURNS int
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT greatest(0, (public.current_commercial_config()).founder_cap
    - (SELECT count(*)::int FROM public.business_commercial_terms WHERE founder_since IS NOT NULL));
$function$;
REVOKE ALL ON FUNCTION public.founder_places_left() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_places_left() TO anon, authenticated;
