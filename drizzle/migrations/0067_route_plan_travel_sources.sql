-- 0067 — save_route_plan keeps travel stops and stop sources (Bloco A follow-up).
-- Since 0064 a confirmed custom stop needs source_url, and stop_type 'travel' exists, but
-- save_route_plan (import, copy and edit of a route) neither accepted 'travel' nor wrote the source
-- columns: importing any of the province itineraries failed. Same function, three changes:
-- * kind 'travel' -> stop_type 'travel' (title in custom_title_pt, like custom stops);
-- * sourceUrl / sourceLabel / travelMinutes -> source_url / source_label / travel_minutes
--   (the table constraints still require https and a source for any travel time);
-- * nothing else: same checks, same SECURITY INVOKER (RLS applies), same grants.

CREATE OR REPLACE FUNCTION public.save_route_plan(_route_id uuid, _input jsonb, _curated boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
   IF s->>'kind' NOT IN ('destination','experience','community','custom','travel') THEN RAISE EXCEPTION 'INVALID_STOP_KIND'; END IF;
   INSERT INTO public.route_stops(route_day_id,stop_order,stop_type,destination_id,experience_id,community_experience_id,custom_title_pt,custom_title_en,description_pt,description_en,location,lat,lng,is_free,notes,estimated_duration_minutes,validation_status,community_candidate,source_url,source_label,travel_minutes)
   VALUES(did,sn,CASE s->>'kind' WHEN 'experience' THEN 'activity' WHEN 'community' THEN 'community_experience' WHEN 'custom' THEN 'custom_stop' WHEN 'travel' THEN 'travel' ELSE 'destination' END,CASE WHEN s->>'kind'='destination' THEN (s->>'refId')::uuid END,CASE WHEN s->>'kind'='experience' THEN (s->>'refId')::uuid END,CASE WHEN s->>'kind'='community' THEN (s->>'refId')::uuid END,CASE WHEN s->>'kind' IN ('custom','travel') THEN s->>'title' END,s->>'titleEn',s->>'descriptionPt',s->>'descriptionEn',s->>'location',(s->>'lat')::numeric,(s->>'lng')::numeric,(s->>'isFree')::boolean,s->>'notes',(s->>'estimatedDurationMinutes')::integer,CASE WHEN coalesce((s->>'pendingValidation')::boolean,false) THEN 'pending_validation' ELSE 'confirmed' END,coalesce((s->>'communityCandidate')::boolean,false),nullif(btrim(s->>'sourceUrl'),''),nullif(btrim(s->>'sourceLabel'),''),(s->>'travelMinutes')::integer);
  END LOOP;
 END LOOP;
 UPDATE public.route_progress SET current_day=1 WHERE route_id=rid AND current_day>dn;
 RETURN rid;
END $function$;
