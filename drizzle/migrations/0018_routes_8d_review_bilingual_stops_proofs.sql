-- Routes: review workflow + bilingual content + import source
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS subtitle_pt text,
  ADD COLUMN IF NOT EXISTS subtitle_en text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intensity text CHECK (intensity IS NULL OR intensity IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS source_route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS routes_owner_source_unique ON public.routes (owner_id, source_route_id) WHERE source_route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS routes_review_status_idx ON public.routes (review_status);

ALTER TABLE public.route_days ADD COLUMN IF NOT EXISTS title_en text;

-- Province cover image reference (one image per province, reused by its routes)
ALTER TABLE public.provinces ADD COLUMN IF NOT EXISTS cover_image text;

-- Public visibility now also requires approval
DROP POLICY IF EXISTS "Anyone can view public active routes" ON public.routes;
CREATE POLICY "Anyone can view approved public active routes" ON public.routes
  FOR SELECT TO anon, authenticated
  USING (is_public AND status = 'active' AND review_status = 'approved');

CREATE OR REPLACE FUNCTION public.can_view_route(_route_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = _route_id
      AND ((r.is_public AND r.status = 'active' AND r.review_status = 'approved')
        OR r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'))
  )
$$;

-- Non-admin: public routes always go to review; decision fields are admin-only
CREATE OR REPLACE FUNCTION public.routes_review_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'UPDATE' AND NEW.review_status IS DISTINCT FROM OLD.review_status THEN
      NEW.decided_at := now();
      NEW.decided_by := auth.uid();
      IF NEW.review_status <> 'rejected' THEN NEW.rejection_reason := NULL; END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.decided_at := NULL; NEW.decided_by := NULL; NEW.rejection_reason := NULL;
    IF NEW.is_public THEN
      NEW.review_status := 'pending'; NEW.submitted_at := now();
    ELSE
      NEW.review_status := 'approved';
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE by owner
  NEW.decided_at := OLD.decided_at; NEW.decided_by := OLD.decided_by;
  NEW.rejection_reason := OLD.rejection_reason; NEW.source_route_id := OLD.source_route_id;
  IF NEW.is_public THEN
    NEW.review_status := 'pending'; NEW.submitted_at := now();
  ELSE
    NEW.review_status := 'approved';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER routes_review_guard_ins BEFORE INSERT ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.routes_review_guard();
CREATE TRIGGER routes_review_guard_upd BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.routes_review_guard();

CREATE OR REPLACE FUNCTION public.routes_notify_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     AND NEW.review_status IN ('approved','rejected')
     AND NEW.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
    VALUES (NEW.owner_id, 'route',
      CASE WHEN NEW.review_status = 'approved' THEN 'Roteiro aprovado' ELSE 'Roteiro rejeitado' END,
      CASE WHEN NEW.review_status = 'approved' THEN 'Route approved' ELSE 'Route rejected' END,
      CASE WHEN NEW.review_status = 'approved'
        THEN 'O teu roteiro "' || NEW.title || '" foi aprovado. Código: ' || NEW.unique_code
        ELSE 'O teu roteiro "' || NEW.title || '" foi rejeitado.' || COALESCE(' Motivo: ' || NULLIF(NEW.rejection_reason,''), '') END,
      CASE WHEN NEW.review_status = 'approved'
        THEN 'Your route "' || COALESCE(NEW.title_en, NEW.title) || '" was approved. Code: ' || NEW.unique_code
        ELSE 'Your route "' || COALESCE(NEW.title_en, NEW.title) || '" was rejected.' || COALESCE(' Reason: ' || NULLIF(NEW.rejection_reason,''), '') END,
      '/itinerary/' || NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER routes_notify_decision AFTER UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.routes_notify_decision();

-- Stops: explicit type + community experiences + custom stops
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS stop_type text,
  ADD COLUMN IF NOT EXISTS community_experience_id uuid REFERENCES public.community_experiences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_title_pt text,
  ADD COLUMN IF NOT EXISTS custom_title_en text,
  ADD COLUMN IF NOT EXISTS description_pt text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS lat numeric CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lng numeric CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS is_free boolean;

UPDATE public.route_stops SET stop_type = CASE WHEN destination_id IS NOT NULL THEN 'destination' WHEN experience_id IS NOT NULL THEN 'activity' ELSE 'custom_stop' END WHERE stop_type IS NULL;
ALTER TABLE public.route_stops ALTER COLUMN stop_type SET DEFAULT 'destination';
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_type_check
  CHECK (stop_type IN ('destination','activity','community_experience','custom_stop')) NOT VALID;
ALTER TABLE public.route_stops VALIDATE CONSTRAINT route_stops_type_check;

-- Photo proof on stop completion (private storage path)
ALTER TABLE public.route_stop_progress
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

CREATE OR REPLACE FUNCTION public.route_stop_progress_require_photo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.photo_path IS NULL OR btrim(NEW.photo_path) = '' THEN
    RAISE EXCEPTION 'PHOTO_REQUIRED';
  END IF;
  IF split_part(NEW.photo_path, '/', 1) <> auth.uid()::text AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'PHOTO_NOT_OWNED';
  END IF;
  NEW.completed_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER route_stop_progress_require_photo BEFORE INSERT ON public.route_stop_progress
  FOR EACH ROW EXECUTE FUNCTION public.route_stop_progress_require_photo();

CREATE POLICY "Admins view all route progress" ON public.route_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all stop progress" ON public.route_stop_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for private bucket route-proofs
CREATE POLICY "Route proofs upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'route-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Route proofs read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'route-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Route proofs delete own or admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'route-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));