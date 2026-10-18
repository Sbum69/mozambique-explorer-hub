CREATE OR REPLACE FUNCTION public.commercial_activity_public(_business_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.businesses WHERE id=_business_id AND status='approved'); $$;
REVOKE ALL ON FUNCTION public.commercial_activity_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commercial_activity_public(uuid) TO anon, authenticated, service_role;
ALTER POLICY "Anyone can view active experiences" ON public.experiences USING (active AND public.commercial_activity_public(business_id));
ALTER POLICY "Anyone can view availability of active experiences" ON public.experience_availability USING (active AND EXISTS(SELECT 1 FROM public.experiences e WHERE e.id=experience_id AND e.active AND public.commercial_activity_public(e.business_id)));
CREATE OR REPLACE FUNCTION public.commercial_booking_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.experiences;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('commercial:'||NEW.experience_id::text,0));
 SELECT * INTO e FROM public.experiences WHERE id=NEW.experience_id;
 IF e.id IS NULL OR NOT e.active OR NOT public.commercial_activity_public(e.business_id) THEN RAISE EXCEPTION 'Activity not active or business not approved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.experience_availability a WHERE a.experience_id=e.id AND a.active AND a.day_of_week=extract(dow FROM NEW.date)::int AND a.start_time=NEW.time) THEN RAISE EXCEPTION 'No availability configured for requested start time'; END IF;
 NEW.total_mzn := e.price_mzn * NEW.people;
 RETURN NEW;
END $$;
CREATE TRIGGER bookings_00_commercial_guard BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.commercial_booking_guard();
CREATE OR REPLACE FUNCTION public.commercial_activity_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('commercial:'||NEW.id::text,0));
 IF TG_OP='UPDATE' AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
  NEW.id:=OLD.id; NEW.created_at:=OLD.created_at; NEW.rating:=OLD.rating; NEW.reviews:=OLD.reviews;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER experiences_00_management_guard BEFORE INSERT OR UPDATE ON public.experiences FOR EACH ROW EXECUTE FUNCTION public.commercial_activity_guard();
CREATE OR REPLACE FUNCTION public.availability_integrity_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE exp_id uuid; row_id uuid; old_day int; old_start time;
BEGIN
 IF TG_OP='DELETE' THEN exp_id:=OLD.experience_id; ELSE exp_id:=NEW.experience_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('commercial:'||exp_id::text,0));
 IF TG_OP<>'INSERT' THEN
  row_id:=OLD.id; old_day:=OLD.day_of_week; old_start:=OLD.start_time;
  IF EXISTS(SELECT 1 FROM public.bookings b WHERE b.experience_id=OLD.experience_id AND b.date>=current_date AND extract(dow FROM b.date)::int=old_day AND b.time=old_start AND b.status IN ('pending','confirmed')) THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'EXISTING_BOOKINGS'; END IF;
   IF NEW.experience_id<>OLD.experience_id OR NEW.day_of_week<>old_day OR NEW.start_time<>old_start OR NEW.end_time<>OLD.end_time OR NOT NEW.active THEN RAISE EXCEPTION 'EXISTING_BOOKINGS'; END IF;
   IF EXISTS(SELECT 1 FROM public.bookings b WHERE b.experience_id=exp_id AND b.date>=current_date AND b.time=old_start AND extract(dow FROM b.date)::int=old_day AND b.status IN ('pending','confirmed') GROUP BY b.date HAVING sum(b.people)>NEW.capacity) THEN RAISE EXCEPTION 'CAPACITY_BELOW_BOOKED'; END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND NEW.experience_id<>OLD.experience_id THEN RAISE EXCEPTION 'Cannot move availability'; END IF;
 IF NEW.active AND EXISTS(SELECT 1 FROM public.experience_availability a WHERE a.experience_id=exp_id AND a.day_of_week=NEW.day_of_week AND a.active AND a.id IS DISTINCT FROM row_id AND a.start_time<NEW.end_time AND a.end_time>NEW.start_time) THEN RAISE EXCEPTION 'OVERLAPPING_AVAILABILITY'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER availability_00_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.experience_availability FOR EACH ROW EXECUTE FUNCTION public.availability_integrity_guard();
CREATE OR REPLACE FUNCTION public.get_experience_availability(_experience_id uuid,_date date) RETURNS TABLE(experience_id uuid,date date,start_time time,end_time time,capacity integer,booked_people integer,remaining_capacity integer,available boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT a.experience_id,_date,a.start_time,a.end_time,a.capacity,public.booked_people(a.experience_id,_date,a.start_time),greatest(0,a.capacity-public.booked_people(a.experience_id,_date,a.start_time)),(_date>=current_date AND a.capacity>public.booked_people(a.experience_id,_date,a.start_time)) FROM public.experience_availability a JOIN public.experiences e ON e.id=a.experience_id WHERE a.experience_id=_experience_id AND a.active AND e.active AND public.commercial_activity_public(e.business_id) AND a.day_of_week=extract(dow FROM _date)::int ORDER BY a.start_time;
$$;