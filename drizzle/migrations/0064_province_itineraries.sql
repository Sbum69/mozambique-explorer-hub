-- 0064 — Itineraries by province (Bloco A). Extends the existing routes model; no parallel system.
--  * every route has a province (all 35 rows already have one);
--  * recommended season (PT/EN);
--  * route_provinces: the ordered provinces of a multi-province trip (7–21 days);
--  * route_stops: the source of a custom place (link to OSM or the official site), and "travel"
--    stops between provinces (time only when sourced, otherwise null = "a confirmar");
--  * travel stops need no photo proof.
-- RLS: route_provinces readable exactly when the route is (can_view_route); only admins write.

ALTER TABLE public.routes ALTER COLUMN province_id SET NOT NULL;

ALTER TABLE public.routes
  ADD COLUMN best_season_pt text CHECK (best_season_pt IS NULL OR length(best_season_pt) <= 200),
  ADD COLUMN best_season_en text CHECK (best_season_en IS NULL OR length(best_season_en) <= 200);

CREATE TABLE public.route_provinces (
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  province_id uuid NOT NULL REFERENCES public.provinces(id),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 11),
  PRIMARY KEY (route_id, province_id),
  UNIQUE (route_id, position)
);
CREATE INDEX route_provinces_province_idx ON public.route_provinces (province_id);
ALTER TABLE public.route_provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View provinces of viewable routes" ON public.route_provinces
  FOR SELECT TO anon, authenticated USING (public.can_view_route(route_id));
CREATE POLICY "Admins manage route provinces" ON public.route_provinces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.route_provinces FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.route_provinces TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.route_provinces TO authenticated;

ALTER TABLE public.route_stops
  ADD COLUMN source_url text CHECK (source_url IS NULL OR (source_url ~ '^https://' AND length(source_url) <= 500)),
  ADD COLUMN source_label text CHECK (source_label IS NULL OR length(source_label) <= 120),
  ADD COLUMN travel_minutes integer CHECK (travel_minutes IS NULL OR travel_minutes BETWEEN 1 AND 2880);

ALTER TABLE public.route_stops DROP CONSTRAINT route_stops_type_check;
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_type_check
  CHECK (stop_type = ANY (ARRAY['destination', 'activity', 'community_experience', 'custom_stop', 'travel']));
ALTER TABLE public.route_stops DROP CONSTRAINT route_stops_one_ref;
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_one_ref CHECK (
  num_nonnulls(destination_id, experience_id, community_experience_id) = 1
  OR (stop_type IN ('custom_stop', 'travel')
      AND num_nonnulls(destination_id, experience_id, community_experience_id) = 0
      AND custom_title_pt IS NOT NULL));
-- New confirmed custom places must cite where their coordinates come from (old rows untouched).
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_custom_source CHECK (
  stop_type <> 'custom_stop' OR validation_status <> 'confirmed' OR source_url IS NOT NULL) NOT VALID;
-- Travel time is only stored with a source.
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_travel_source CHECK (
  stop_type <> 'travel' OR travel_minutes IS NULL OR source_url IS NOT NULL);

-- A route is fully proven when every stop except travel stops has an approved photo.
CREATE OR REPLACE FUNCTION public.route_progress_fully_proven(_progress_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id
                 JOIN public.route_progress p ON p.route_id=d.route_id
                 WHERE p.id=_progress_id AND s.stop_type IS DISTINCT FROM 'travel')
     AND NOT EXISTS (
       SELECT 1 FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id
       JOIN public.route_progress p ON p.route_id=d.route_id
       WHERE p.id=_progress_id AND s.stop_type IS DISTINCT FROM 'travel' AND NOT EXISTS (
         SELECT 1 FROM public.route_stop_progress sp WHERE sp.progress_id=p.id AND sp.route_stop_id=s.id
           AND sp.photo_path IS NOT NULL AND btrim(sp.photo_path)<>''
           AND sp.review_status IN ('verified', 'approved')))
$function$;

-- No proof (and so no points) on a travel stop: there is nothing to photograph there.
CREATE OR REPLACE FUNCTION public.route_stop_progress_no_travel()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.route_stops WHERE id = NEW.route_stop_id AND stop_type = 'travel') THEN
    RAISE EXCEPTION 'travel_stop_has_no_proof';
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER route_stop_progress_no_travel BEFORE INSERT ON public.route_stop_progress
  FOR EACH ROW EXECUTE FUNCTION public.route_stop_progress_no_travel();
