-- 0068 — First-entry guide of the panels (traveller and business).
-- The account remembers that it finished, skipped or dismissed the guide, so it is not shown again
-- on another device (no localStorage). Written only through set_my_guide, as the user (SECURITY
-- INVOKER: the existing RLS "Users can update own profile" applies); the date is set on the server.

ALTER TABLE public.profiles
  ADD COLUMN guide_tourist text CHECK (guide_tourist IN ('completed', 'skipped', 'dismissed')),
  ADD COLUMN guide_tourist_at timestamptz,
  ADD COLUMN guide_business text CHECK (guide_business IN ('completed', 'skipped', 'dismissed')),
  ADD COLUMN guide_business_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_my_guide(_guide text, _status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); n integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _status IS NULL OR _status NOT IN ('completed', 'skipped', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  IF _guide = 'tourist' THEN
    UPDATE public.profiles SET guide_tourist = _status, guide_tourist_at = now() WHERE id = uid;
  ELSIF _guide = 'business' THEN
    UPDATE public.profiles SET guide_business = _status, guide_business_at = now() WHERE id = uid;
  ELSE
    RAISE EXCEPTION 'unknown_guide';
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'profile_not_found'; END IF;
END $function$;

REVOKE ALL ON FUNCTION public.set_my_guide(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_guide(text, text) TO authenticated;
