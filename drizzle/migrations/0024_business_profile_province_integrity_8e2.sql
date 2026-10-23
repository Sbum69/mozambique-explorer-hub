CREATE OR REPLACE FUNCTION public.business_profile_province_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (NEW.province_id IS DISTINCT FROM OLD.province_id OR NEW.province IS DISTINCT FROM OLD.province) AND EXISTS(SELECT 1 FROM public.experiences WHERE business_id=OLD.id) THEN RAISE EXCEPTION 'PROVINCE_HAS_ACTIVITIES'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER businesses_profile_province_integrity BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.business_profile_province_guard();