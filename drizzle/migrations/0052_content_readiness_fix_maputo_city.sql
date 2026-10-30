-- CONTEÚDO-1 follow-up.
-- 1. Security fix: content_readiness let any signed-in user read the checklist of a business
--    WITHOUT an owner (owner_id = auth.uid() is NULL there, and NOT (false OR NULL) is NULL, so the
--    FORBIDDEN branch was skipped). Use IS NOT DISTINCT FROM.
-- 2. Data fix: the destination "Maputo" is the capital city (description "A vibrante capital",
--    region "Capital", coordinates -25.9692, 32.5732 = Wikidata Q3889 Maputo: -25.96889, 32.57333)
--    but was linked to Maputo Province. It moves to Cidade de Maputo, so city businesses can use it.
--    Maputo Province is left without a destination until a real one is chosen (no invented data).

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
  IF NOT (public.has_role(auth.uid(), 'admin') OR b.owner_id IS NOT DISTINCT FROM auth.uid()) THEN
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

UPDATE public.destinations d
   SET province_id = p.id, province = p.code, updated_at = now()
  FROM public.provinces p
 WHERE d.slug = 'maputo' AND p.code = 'maputo-cidade';
