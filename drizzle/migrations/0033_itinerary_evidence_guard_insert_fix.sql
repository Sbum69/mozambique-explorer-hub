CREATE OR REPLACE FUNCTION public.route_plan_evidence_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; next_rid uuid;
BEGIN
 IF TG_TABLE_NAME='routes' THEN rid:=OLD.id;
 ELSIF TG_TABLE_NAME='route_days' THEN
  rid:=CASE WHEN TG_OP='INSERT' THEN NEW.route_id ELSE OLD.route_id END;
  IF TG_OP='UPDATE' THEN next_rid:=NEW.route_id; END IF;
 ELSE
  SELECT route_id INTO rid FROM public.route_days WHERE id=CASE WHEN TG_OP='INSERT' THEN NEW.route_day_id ELSE OLD.route_day_id END;
  IF TG_OP='UPDATE' THEN SELECT route_id INTO next_rid FROM public.route_days WHERE id=NEW.route_day_id; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.route_progress p JOIN public.route_stop_progress sp ON sp.progress_id=p.id WHERE p.route_id IN (rid,next_rid)) THEN RAISE EXCEPTION 'ROUTE_HAS_PROOFS'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;