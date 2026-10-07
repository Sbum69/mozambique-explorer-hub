ALTER TABLE public.route_stops DROP CONSTRAINT route_stops_one_ref;
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_one_ref CHECK (
  (num_nonnulls(destination_id, experience_id, community_experience_id) = 1)
  OR (stop_type = 'custom_stop' AND num_nonnulls(destination_id, experience_id, community_experience_id) = 0 AND custom_title_pt IS NOT NULL)
) NOT VALID;
ALTER TABLE public.route_stops VALIDATE CONSTRAINT route_stops_one_ref;
CREATE UNIQUE INDEX IF NOT EXISTS routes_owner_source_unique ON public.routes (owner_id, source_route_id) WHERE source_route_id IS NOT NULL AND owner_id IS NOT NULL;