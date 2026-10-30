-- CONTEÚDO-1: real content without SQL.
-- * experience_missing / business_missing: one list of what is missing to publish (single source of
--   truth for the admin, the business panel and the activation rule).
-- * experiences_require_ready: an experience can only be (or stay) active when nothing is missing.
-- * admin_import_content: admin-only import of businesses and experiences as drafts (businesses
--   pending without owner, experiences inactive), with a dry run, row errors and duplicate checks.
-- * business_invites: single-use, expiring links for the owner to take over an imported business.
-- * content-photos: public bucket for business and experience photos (admin, or the owner in the
--   folder of their own business).
-- No changes to existing data or policies.

-- ---------------------------------------------------------------------------------------------
-- Readiness
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.business_missing(b public.businesses)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT array_remove(ARRAY[
    CASE WHEN btrim(coalesce(b.name, '')) = '' THEN 'name' END,
    CASE WHEN b.category_code IS NULL THEN 'category' END,
    CASE WHEN b.province_id IS NULL THEN 'province' END,
    CASE WHEN length(btrim(coalesce(b.description, ''))) < 20 THEN 'description' END,
    CASE WHEN btrim(coalesce(b.location ->> 'address', '')) = '' THEN 'address' END,
    CASE WHEN btrim(coalesce(b.contact ->> 'phone', '')) = ''
          AND btrim(coalesce(b.contact ->> 'email', '')) = ''
          AND btrim(coalesce(b.contact ->> 'whatsapp', '')) = '' THEN 'contact' END
  ], NULL);
$function$;

CREATE OR REPLACE FUNCTION public.experience_missing(e public.experiences)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT array_remove(ARRAY[
    CASE WHEN coalesce(e.price_mzn, 0) <= 0 THEN 'price' END,
    CASE WHEN coalesce(e.capacity, 0) <= 0 THEN 'capacity' END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.experience_availability a
                           WHERE a.experience_id = e.id AND a.active AND a.accepts_new_bookings)
         THEN 'schedule' END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.destinations d
                           WHERE d.id = e.destination_id AND d.lat IS NOT NULL AND d.lng IS NOT NULL)
         THEN 'location' END,
    CASE WHEN coalesce(array_length(e.images, 1), 0) = 0 THEN 'photo' END,
    CASE WHEN btrim(coalesce(e.title_en, '')) = '' THEN 'title_en' END,
    CASE WHEN length(btrim(coalesce(e.description_pt, ''))) < 20 THEN 'description_pt' END,
    CASE WHEN length(btrim(coalesce(e.description_en, ''))) < 20 THEN 'description_en' END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = e.business_id
                           AND (btrim(coalesce(b.contact ->> 'phone', '')) <> ''
                             OR btrim(coalesce(b.contact ->> 'email', '')) <> ''
                             OR btrim(coalesce(b.contact ->> 'whatsapp', '')) <> ''))
         THEN 'business_contact' END
  ], NULL);
$function$;
REVOKE ALL ON FUNCTION public.business_missing(public.businesses) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.experience_missing(public.experiences) FROM PUBLIC, anon, authenticated;

-- What is missing and what only needs attention, for the admin or the business owner.
CREATE OR REPLACE FUNCTION public.content_readiness(_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = _business_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin') OR b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN jsonb_build_object(
    'business_id', b.id,
    'missing', to_jsonb(public.business_missing(b)),
    'warnings', to_jsonb(array_remove(ARRAY[
      CASE WHEN b.status <> 'approved' THEN 'not_approved' END,
      CASE WHEN b.owner_id IS NULL THEN 'no_owner' END,
      CASE WHEN coalesce(array_length(b.images, 1), 0) = 0 THEN 'no_photo' END
    ], NULL)),
    'experiences', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', e.id, 'title_pt', e.title_pt, 'active', e.active,
               'missing', to_jsonb(public.experience_missing(e)))
             ORDER BY e.title_pt)
        FROM public.experiences e WHERE e.business_id = b.id), '[]'::jsonb)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.content_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.content_readiness(uuid) TO authenticated;

-- An experience can only be active when nothing is missing (also blocks removing the last photo
-- or the price of an active one). Applies to everyone, including the admin and server jobs.
CREATE OR REPLACE FUNCTION public.experiences_require_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m text[];
BEGIN
  IF NEW.active THEN
    m := public.experience_missing(NEW);
    IF coalesce(array_length(m, 1), 0) > 0 THEN
      RAISE EXCEPTION 'EXPERIENCE_NOT_READY:%', array_to_string(m, ',');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER experiences_require_ready BEFORE INSERT OR UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.experiences_require_ready();

-- ---------------------------------------------------------------------------------------------
-- Import (admin only). Rows: { kind: 'business' | 'experience', ... }. Returns one result per row.
-- _dry_run = true validates and checks duplicates without writing.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.content_slug(_name text)
 RETURNS text
 LANGUAGE sql
 VOLATILE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(nullif(left(trim(both '-' FROM regexp_replace(lower(
           translate(coalesce(_name, ''), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
                                          'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
           '[^a-z0-9]+', '-', 'g')), 40), ''), 'item') || '-' || substr(md5(random()::text), 1, 6);
$function$;
REVOKE ALL ON FUNCTION public.content_slug(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_import_content(_rows jsonb, _dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb;
  i int := 0;
  out jsonb := '[]'::jsonb;
  errs text[];
  prov public.provinces;
  cat text;
  biz uuid;
  dest uuid;
  new_id uuid;
  dup boolean;
  d text;
  dow int;
  days text[];
  t_start time;
  t_end time;
  slot_cap int;
  kind text;
  price numeric;
  cap int;
  dur numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 500 THEN RAISE EXCEPTION 'INVALID_ROWS'; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    i := i + 1;
    errs := ARRAY[]::text[];
    dup := false;
    new_id := NULL;
    kind := lower(btrim(coalesce(r ->> 'kind', '')));
    SELECT * INTO prov FROM public.provinces
     WHERE code = lower(btrim(coalesce(r ->> 'province', r ->> 'business_province', ''))) AND active;

    IF kind = 'business' THEN
      IF btrim(coalesce(r ->> 'name', '')) = '' THEN errs := errs || 'name'; END IF;
      IF prov.id IS NULL THEN errs := errs || 'province'; END IF;
      SELECT code INTO cat FROM public.business_categories
       WHERE code = lower(btrim(coalesce(r ->> 'category', ''))) AND active;
      IF cat IS NULL THEN errs := errs || 'category'; END IF;
      IF coalesce(r ->> 'type', 'small') NOT IN ('small', 'large') THEN errs := errs || 'type'; END IF;
      IF prov.id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses b
         WHERE lower(btrim(b.name)) = lower(btrim(r ->> 'name')) AND b.province_id = prov.id) THEN
        dup := true;
      END IF;
      IF cardinality(errs) = 0 AND NOT dup AND NOT _dry_run THEN
        INSERT INTO public.businesses (name, slug, type, category, category_code, province, province_id,
                                       description, location, contact, status, verified)
        VALUES (btrim(r ->> 'name'), public.content_slug(r ->> 'name'), coalesce(r ->> 'type', 'small'),
                cat, cat, prov.code, prov.id, nullif(btrim(coalesce(r ->> 'description', '')), ''),
                jsonb_build_object('address', btrim(coalesce(r ->> 'address', ''))),
                jsonb_strip_nulls(jsonb_build_object(
                  'phone', nullif(btrim(coalesce(r ->> 'phone', '')), ''),
                  'email', nullif(btrim(coalesce(r ->> 'email', '')), ''),
                  'whatsapp', nullif(btrim(coalesce(r ->> 'whatsapp', '')), ''),
                  'website', nullif(btrim(coalesce(r ->> 'website', '')), ''))),
                'pending', false)
        RETURNING id INTO new_id;
      END IF;

    ELSIF kind = 'experience' THEN
      biz := NULL;
      IF prov.id IS NOT NULL THEN
        SELECT b.id INTO biz FROM public.businesses b
         WHERE lower(btrim(b.name)) = lower(btrim(coalesce(r ->> 'business_name', '')))
           AND b.province_id = prov.id
         LIMIT 1;
      END IF;
      -- A business created earlier in the same file only exists after a real run.
      IF biz IS NULL AND NOT (_dry_run AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(_rows) x
           WHERE lower(x ->> 'kind') = 'business'
             AND lower(btrim(x ->> 'name')) = lower(btrim(coalesce(r ->> 'business_name', '')))
             AND lower(btrim(x ->> 'province')) = prov.code)) THEN
        errs := errs || 'business';
      END IF;
      IF btrim(coalesce(r ->> 'title_pt', '')) = '' THEN errs := errs || 'title_pt'; END IF;
      IF coalesce(r ->> 'category', '') NOT IN ('beach', 'culture', 'food', 'nature', 'community', 'adventure') THEN
        errs := errs || 'category';
      END IF;
      BEGIN price := (r ->> 'price_mzn')::numeric; EXCEPTION WHEN OTHERS THEN price := NULL; END;
      IF price IS NULL OR price < 0 THEN errs := errs || 'price'; END IF;
      BEGIN cap := (r ->> 'capacity')::int; EXCEPTION WHEN OTHERS THEN cap := NULL; END;
      IF cap IS NULL OR cap < 1 OR cap > 100 THEN errs := errs || 'capacity'; END IF;
      BEGIN dur := nullif(r ->> 'duration_hours', '')::numeric; EXCEPTION WHEN OTHERS THEN dur := -1; END;
      IF dur IS NOT NULL AND dur <= 0 THEN errs := errs || 'duration'; END IF;
      dest := NULL;
      IF btrim(coalesce(r ->> 'destination', '')) <> '' THEN
        SELECT id INTO dest FROM public.destinations WHERE slug = btrim(r ->> 'destination');
        IF dest IS NULL THEN errs := errs || 'destination'; END IF;
      END IF;
      -- Optional schedule: days "0-6" or "dom,seg,ter,qua,qui,sex,sab", times HH:MM.
      days := ARRAY[]::text[];
      IF btrim(coalesce(r ->> 'days', '')) <> '' THEN
        days := regexp_split_to_array(lower(btrim(r ->> 'days')), '\s*[,;]\s*');
        BEGIN
          t_start := (r ->> 'start_time')::time;
          t_end := (r ->> 'end_time')::time;
        EXCEPTION WHEN OTHERS THEN t_start := NULL; t_end := NULL;
        END;
        IF t_start IS NULL OR t_end IS NULL OR t_end <= t_start THEN errs := errs || 'times'; END IF;
        BEGIN slot_cap := coalesce(nullif(r ->> 'slot_capacity', '')::int, cap);
        EXCEPTION WHEN OTHERS THEN slot_cap := NULL; END;
        IF slot_cap IS NULL OR slot_cap < 1 OR slot_cap > 100 THEN errs := errs || 'slot_capacity'; END IF;
        FOREACH d IN ARRAY days LOOP
          IF array_position(ARRAY['dom','seg','ter','qua','qui','sex','sab'], d) IS NULL
             AND d !~ '^[0-6]$' THEN
            errs := errs || 'days';
            EXIT;
          END IF;
        END LOOP;
      END IF;
      IF biz IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.experiences e
         WHERE e.business_id = biz AND lower(btrim(e.title_pt)) = lower(btrim(r ->> 'title_pt'))) THEN
        dup := true;
      END IF;
      IF cardinality(errs) = 0 AND NOT dup AND NOT _dry_run THEN
        INSERT INTO public.experiences (business_id, destination_id, slug, title_pt, title_en,
                                        description_pt, description_en, category, price_mzn,
                                        duration_hours, capacity, location, province, active)
        VALUES (biz, dest, public.content_slug(r ->> 'title_pt'), btrim(r ->> 'title_pt'),
                nullif(btrim(coalesce(r ->> 'title_en', '')), ''),
                nullif(btrim(coalesce(r ->> 'description_pt', '')), ''),
                nullif(btrim(coalesce(r ->> 'description_en', '')), ''),
                r ->> 'category', price, dur, cap,
                nullif(btrim(coalesce(r ->> 'location', '')), ''), prov.code, false)
        RETURNING id INTO new_id;
        FOREACH d IN ARRAY days LOOP
          dow := coalesce(array_position(ARRAY['dom','seg','ter','qua','qui','sex','sab'], d) - 1, d::int);
          INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time,
                                                      capacity, active, accepts_new_bookings)
          VALUES (new_id, dow, t_start, t_end, slot_cap, true, true);
        END LOOP;
      END IF;

    ELSE
      errs := errs || 'kind';
    END IF;

    out := out || jsonb_build_object(
      'row', i, 'kind', kind, 'errors', to_jsonb(errs), 'duplicate', dup, 'id', new_id,
      'status', CASE WHEN cardinality(errs) > 0 THEN 'error' WHEN dup THEN 'duplicate'
                     WHEN _dry_run THEN 'ok' ELSE 'created' END);
  END LOOP;
  RETURN out;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_import_content(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_import_content(jsonb, boolean) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Owner invites (single use, expiring, recorded). Only a hash of the token is stored.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.business_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users (id),
  revoked_at timestamptz,
  CONSTRAINT business_invites_expiry CHECK (expires_at > created_at)
);
CREATE INDEX business_invites_business_idx ON public.business_invites (business_id);
ALTER TABLE public.business_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.business_invites TO authenticated;
CREATE POLICY "Admins read business invites" ON public.business_invites
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.admin_create_business_invite(_business_id uuid, _days int DEFAULT 14)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE b public.businesses; token text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _days IS NULL OR _days < 1 OR _days > 60 THEN RAISE EXCEPTION 'INVALID_DAYS'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = _business_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF b.owner_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_OWNED'; END IF;
  -- One open invite per business: older open ones are revoked.
  UPDATE public.business_invites SET revoked_at = now()
   WHERE business_id = b.id AND used_at IS NULL AND revoked_at IS NULL;
  token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.business_invites (business_id, token_hash, created_by, expires_at)
  VALUES (b.id, encode(digest(token, 'sha256'), 'hex'), auth.uid(), now() + make_interval(days => _days));
  RETURN token;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_create_business_invite(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_business_invite(uuid, int) TO authenticated;

-- Name of the business behind a valid invite (shown before the person accepts).
CREATE OR REPLACE FUNCTION public.business_invite_preview(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE inv public.business_invites; b public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO inv FROM public.business_invites WHERE token_hash = encode(digest(coalesce(_token, ''), 'sha256'), 'hex');
  IF inv.id IS NULL OR inv.used_at IS NOT NULL OR inv.revoked_at IS NOT NULL OR inv.expires_at < now() THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id = inv.business_id;
  RETURN jsonb_build_object('business_name', b.name, 'expires_at', inv.expires_at);
END;
$function$;
REVOKE ALL ON FUNCTION public.business_invite_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_invite_preview(text) TO authenticated;

-- The signed-in person takes over the business (same rules as admin_assign_business_owner).
CREATE OR REPLACE FUNCTION public.claim_business_invite(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE inv public.business_invites; b public.businesses; me uuid := auth.uid(); owner_role app_role;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO inv FROM public.business_invites
   WHERE token_hash = encode(digest(coalesce(_token, ''), 'sha256'), 'hex') FOR UPDATE;
  IF inv.id IS NULL OR inv.used_at IS NOT NULL OR inv.revoked_at IS NOT NULL OR inv.expires_at < now() THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = me AND role = 'admin') THEN
    RAISE EXCEPTION 'USER_IS_ADMIN';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = me) THEN RAISE EXCEPTION 'USER_HAS_BUSINESS'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = inv.business_id FOR UPDATE;
  IF b.owner_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_OWNED'; END IF;
  UPDATE public.businesses SET owner_id = me, updated_at = now() WHERE id = b.id;
  UPDATE public.business_invites SET used_at = now(), used_by = me WHERE id = inv.id;
  owner_role := CASE WHEN b.type = 'large' THEN 'business_large'::app_role ELSE 'business_small'::app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (me, owner_role) ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = me AND role = 'tourist';
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (me, 'business', 'Negócio atribuído', 'Business assigned',
    'Passaste a gerir o negócio "' || b.name || '" no EKAYA. Revê o perfil, as atividades e os horários no teu painel.',
    'You now manage the business "' || b.name || '" on EKAYA. Review its profile, activities and schedules in your dashboard.',
    '/business-dashboard');
  RETURN b.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.claim_business_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_business_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Photos: public bucket, 5 MB, images only. Path: <business_id>/<file>.
-- ---------------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('content-photos', 'content-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Content photos: admin or own business can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND b.id::text = (storage.foldername(name))[1])));
CREATE POLICY "Content photos: admin or own business can update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND b.id::text = (storage.foldername(name))[1])));
CREATE POLICY "Content photos: admin or own business can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND b.id::text = (storage.foldername(name))[1])));
