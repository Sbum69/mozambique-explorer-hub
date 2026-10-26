-- FAV-1: favourites in the database and atomic preference saving.
-- * public.favorites: one row per (user, item type, item); each user reads, adds and removes only their own.
--   The item must exist and be visible to that user (SECURITY INVOKER trigger: the existing RLS of
--   destinations / experiences / routes applies, so nothing hidden is revealed).
-- * save_my_preferences(): profile + provinces in one transaction (all or nothing), validated server-side.

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('place','experience','itinerary')),
  item_id text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own favorites"   ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own favorites"    ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own favorites" ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.favorites FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;

-- SECURITY INVOKER: the item must be visible to this user under the existing RLS (no existence leak).
CREATE OR REPLACE FUNCTION public.favorites_validate_item() RETURNS trigger
 LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  is_uuid boolean := NEW.item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  ok boolean;
BEGIN
  -- Computed first: PL/pgSQL would cut "IF NOT CASE ... THEN" at the THEN inside the CASE.
  ok := CASE NEW.item_type
    WHEN 'place'      THEN EXISTS (SELECT 1 FROM destinations WHERE slug = NEW.item_id)
    WHEN 'experience' THEN is_uuid AND EXISTS (SELECT 1 FROM experiences WHERE id = NEW.item_id::uuid)
    WHEN 'itinerary'  THEN is_uuid AND EXISTS (SELECT 1 FROM routes WHERE id = NEW.item_id::uuid)
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER favorites_validate_item BEFORE INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.favorites_validate_item();

-- All or nothing; SECURITY INVOKER, so the existing "own row" policies of profiles/profile_provinces apply.
CREATE OR REPLACE FUNCTION public.save_my_preferences(
  _province text, _duration_days integer, _interests text[], _provinces text[] DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _province IS NULL OR NOT (EXISTS (SELECT 1 FROM destinations WHERE slug = _province)
       OR EXISTS (SELECT 1 FROM provinces WHERE code = _province AND active)) THEN
    RAISE EXCEPTION 'INVALID_PROVINCE'; END IF;
  IF _duration_days IS NULL OR _duration_days NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(coalesce(_interests, '{}')) i WHERE i NOT IN
       ('beach','culture','food','nature','community','heritage','festival','adventure')) THEN
    RAISE EXCEPTION 'INVALID_INTEREST'; END IF;
  IF _provinces IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(_provinces) c
       WHERE NOT EXISTS (SELECT 1 FROM provinces p WHERE p.code = c AND p.active)) THEN
    RAISE EXCEPTION 'INVALID_PROVINCE'; END IF;
  UPDATE profiles SET province = _province, duration_days = _duration_days,
         interests = coalesce(_interests, '{}') WHERE id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  IF _provinces IS NOT NULL THEN
    DELETE FROM profile_provinces WHERE profile_id = uid;
    INSERT INTO profile_provinces (profile_id, province_id)
    SELECT uid, id FROM provinces WHERE code = ANY (_provinces);
  END IF;
END $;
REVOKE ALL ON FUNCTION public.save_my_preferences(text, integer, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_preferences(text, integer, text[], text[]) TO authenticated;
