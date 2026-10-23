CREATE OR REPLACE FUNCTION public.route_stop_progress_require_photo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.route_progress; rid uuid;
BEGIN
 SELECT * INTO p FROM public.route_progress WHERE id=NEW.progress_id FOR UPDATE;
 IF p.id IS NULL OR (p.user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'PROGRESS_NOT_OWNED'; END IF;
 SELECT d.route_id INTO rid FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id WHERE s.id=NEW.route_stop_id;
 IF rid IS DISTINCT FROM p.route_id THEN RAISE EXCEPTION 'STOP_NOT_IN_ROUTE'; END IF;
 IF NEW.photo_path IS NULL OR btrim(NEW.photo_path)='' THEN RAISE EXCEPTION 'PHOTO_REQUIRED'; END IF;
 IF split_part(NEW.photo_path,'/',1) IS DISTINCT FROM p.user_id::text THEN RAISE EXCEPTION 'PHOTO_NOT_OWNED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='route-proofs' AND name=NEW.photo_path) THEN RAISE EXCEPTION 'PHOTO_NOT_FOUND'; END IF;
 NEW.completed_at:=now(); RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.route_progress_integrity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.route_id IS DISTINCT FROM OLD.route_id OR NEW.started_at IS DISTINCT FROM OLD.started_at) THEN RAISE EXCEPTION 'PROGRESS_IDENTITY_IMMUTABLE'; END IF;
 IF NEW.current_day < 1 OR NOT EXISTS(SELECT 1 FROM public.route_days WHERE route_id=NEW.route_id AND day_number=NEW.current_day) THEN RAISE EXCEPTION 'INVALID_PROGRESS_DAY'; END IF;
 IF NEW.status='completed' THEN
  IF TG_OP='INSERT' OR NOT public.route_progress_fully_proven(NEW.id) THEN RAISE EXCEPTION 'ROUTE_PROOFS_INCOMPLETE'; END IF;
  NEW.completed_at:=CASE WHEN OLD.status='completed' THEN OLD.completed_at ELSE now() END;
 ELSE NEW.completed_at:=NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER route_progress_integrity_guard BEFORE INSERT OR UPDATE ON public.route_progress FOR EACH ROW EXECUTE FUNCTION public.route_progress_integrity_guard();
CREATE OR REPLACE FUNCTION public.route_proof_removed_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.route_progress WHERE id=OLD.progress_id FOR UPDATE;
 UPDATE public.route_progress SET status='in_progress',completed_at=NULL WHERE id=OLD.progress_id AND status='completed';
 RETURN OLD;
END $$;
CREATE TRIGGER route_proof_removed_guard BEFORE DELETE ON public.route_stop_progress FOR EACH ROW EXECUTE FUNCTION public.route_proof_removed_guard();
CREATE OR REPLACE FUNCTION public.route_plan_evidence_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;
BEGIN
 IF TG_TABLE_NAME='routes' THEN rid:=OLD.id;
 ELSIF TG_TABLE_NAME='route_days' THEN rid:=OLD.route_id;
 ELSE SELECT route_id INTO rid FROM public.route_days WHERE id=OLD.route_day_id;
 END IF;
 IF EXISTS(SELECT 1 FROM public.route_progress p JOIN public.route_stop_progress sp ON sp.progress_id=p.id WHERE p.route_id=rid) THEN RAISE EXCEPTION 'ROUTE_HAS_PROOFS'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER route_plan_evidence_guard BEFORE DELETE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.route_plan_evidence_guard();
CREATE TRIGGER route_days_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON public.route_days FOR EACH ROW EXECUTE FUNCTION public.route_plan_evidence_guard();
CREATE TRIGGER route_stops_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON public.route_stops FOR EACH ROW EXECUTE FUNCTION public.route_plan_evidence_guard();
CREATE OR REPLACE FUNCTION public.save_route_plan(_route_id uuid, _input jsonb, _curated boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE rid uuid; d jsonb; s jsonb; did uuid; dn integer:=0; sn integer; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF _curated AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF jsonb_typeof(_input->'days') IS DISTINCT FROM 'array' OR jsonb_array_length(_input->'days')<1 OR btrim(coalesce(_input->>'title',''))='' THEN RAISE EXCEPTION 'INVALID_PLAN'; END IF;
 IF _route_id IS NULL THEN
  INSERT INTO public.routes(owner_id,title,title_en,description,description_en,subtitle_pt,subtitle_en,province_id,interests,intensity,is_public,is_curated,duration_days,source_route_id)
  VALUES(CASE WHEN _curated THEN NULL ELSE uid END,_input->>'title',_input->>'titleEn',_input->>'description',_input->>'descriptionEn',_input->>'subtitlePt',_input->>'subtitleEn',(_input->>'provinceId')::uuid,ARRAY(SELECT jsonb_array_elements_text(coalesce(_input->'interests','[]'))),_input->>'intensity',coalesce((_input->>'isPublic')::boolean,false),_curated,jsonb_array_length(_input->'days'),(_input->>'sourceRouteId')::uuid) RETURNING id INTO rid;
 ELSE
  SELECT id INTO rid FROM public.routes WHERE id=_route_id AND public.can_edit_route(id) FOR UPDATE;
  IF rid IS NULL THEN RAISE EXCEPTION 'ROUTE_NOT_EDITABLE'; END IF;
  IF EXISTS(SELECT 1 FROM public.route_progress p JOIN public.route_stop_progress sp ON sp.progress_id=p.id WHERE p.route_id=rid) THEN RAISE EXCEPTION 'ROUTE_HAS_PROOFS'; END IF;
  UPDATE public.routes SET title=_input->>'title',title_en=_input->>'titleEn',description=_input->>'description',description_en=_input->>'descriptionEn',subtitle_pt=_input->>'subtitlePt',subtitle_en=_input->>'subtitleEn',province_id=(_input->>'provinceId')::uuid,interests=ARRAY(SELECT jsonb_array_elements_text(coalesce(_input->'interests','[]'))),intensity=_input->>'intensity',is_public=coalesce((_input->>'isPublic')::boolean,false),duration_days=jsonb_array_length(_input->'days') WHERE id=rid;
  DELETE FROM public.route_days WHERE route_id=rid;
 END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(_input->'days') LOOP
  dn:=dn+1;
  INSERT INTO public.route_days(route_id,day_number,title,title_en,description,is_unassigned) VALUES(rid,dn,d->>'title',d->>'titleEn',d->>'description',coalesce((d->>'isUnassigned')::boolean,false)) RETURNING id INTO did;
  sn:=0;
  FOR s IN SELECT value FROM jsonb_array_elements(d->'stops') LOOP
   sn:=sn+1;
   IF s->>'kind' NOT IN ('destination','experience','community','custom') THEN RAISE EXCEPTION 'INVALID_STOP_KIND'; END IF;
   INSERT INTO public.route_stops(route_day_id,stop_order,stop_type,destination_id,experience_id,community_experience_id,custom_title_pt,custom_title_en,description_pt,description_en,location,lat,lng,is_free,notes,estimated_duration_minutes,validation_status,community_candidate)
   VALUES(did,sn,CASE s->>'kind' WHEN 'experience' THEN 'activity' WHEN 'community' THEN 'community_experience' WHEN 'custom' THEN 'custom_stop' ELSE 'destination' END,CASE WHEN s->>'kind'='destination' THEN (s->>'refId')::uuid END,CASE WHEN s->>'kind'='experience' THEN (s->>'refId')::uuid END,CASE WHEN s->>'kind'='community' THEN (s->>'refId')::uuid END,CASE WHEN s->>'kind'='custom' THEN s->>'title' END,s->>'titleEn',s->>'descriptionPt',s->>'descriptionEn',s->>'location',(s->>'lat')::numeric,(s->>'lng')::numeric,(s->>'isFree')::boolean,s->>'notes',(s->>'estimatedDurationMinutes')::integer,CASE WHEN coalesce((s->>'pendingValidation')::boolean,false) THEN 'pending_validation' ELSE 'confirmed' END,coalesce((s->>'communityCandidate')::boolean,false));
  END LOOP;
 END LOOP;
 UPDATE public.route_progress SET current_day=1 WHERE route_id=rid AND current_day>dn;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.save_route_plan(uuid,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_route_plan(uuid,jsonb,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.reset_my_route_progress(_progress_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.route_progress WHERE id=_progress_id AND user_id=auth.uid() FOR UPDATE) THEN RAISE EXCEPTION 'PROGRESS_NOT_OWNED'; END IF;
 DELETE FROM public.route_stop_progress WHERE progress_id=_progress_id;
 UPDATE public.route_progress SET status='in_progress',completed_at=NULL,current_day=1 WHERE id=_progress_id;
END $$;
REVOKE ALL ON FUNCTION public.reset_my_route_progress(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_my_route_progress(uuid) TO authenticated;