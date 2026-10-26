-- ADM-2C: admin notices (one user, all business owners or all users), PT/EN, with a record of the sender.
-- * admin_broadcasts: RLS on, no policies, no grants — read only through admin_list_broadcasts().
-- * admin_send_notification(): admin-only (has_role), max 10 notices per admin per hour; length and link
--   rules are the table CHECKs. Each recipient gets a 'system' notification linked to the broadcast.

-- Record of each notice: sender, audience, PT/EN texts, recipient count. Read only through admin RPCs.
CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  audience text NOT NULL CHECK (audience IN ('user','business_owners','all')),
  target_user uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title_pt text NOT NULL CHECK (char_length(btrim(title_pt)) BETWEEN 2 AND 160),
  title_en text NOT NULL CHECK (char_length(btrim(title_en)) BETWEEN 2 AND 160),
  body_pt  text NOT NULL CHECK (char_length(btrim(body_pt))  BETWEEN 2 AND 2000),
  body_en  text NOT NULL CHECK (char_length(btrim(body_en))  BETWEEN 2 AND 2000),
  link text CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%')),
  recipients integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;   -- no policies
REVOKE ALL ON public.admin_broadcasts FROM anon, authenticated;

ALTER TABLE public.notifications
  ADD COLUMN broadcast_id uuid REFERENCES public.admin_broadcasts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  _audience text, _user_id uuid, _title_pt text, _title_en text,
  _body_pt text, _body_en text, _link text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); bid uuid; n integer;
BEGIN
  IF me IS NULL OR NOT public.has_role(me, 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _audience NOT IN ('user','business_owners','all') THEN RAISE EXCEPTION 'INVALID_AUDIENCE'; END IF;
  IF _audience = 'user' AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  -- Anti-spam: at most 10 notices per admin per hour.
  IF (SELECT count(*) FROM admin_broadcasts WHERE sent_by = me AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMITED'; END IF;
  -- Length and link rules are enforced by the table CHECKs (TEXT_TOO_SHORT/LONG → check_violation).
  INSERT INTO admin_broadcasts (sent_by, audience, target_user, title_pt, title_en, body_pt, body_en, link)
  VALUES (me, _audience, CASE WHEN _audience = 'user' THEN _user_id END,
          btrim(_title_pt), btrim(_title_en), btrim(_body_pt), btrim(_body_en), nullif(btrim(_link), ''))
  RETURNING id INTO bid;
  INSERT INTO notifications (user_id, type, title_pt, title_en, body_pt, body_en, link, broadcast_id)
  SELECT r.uid, 'system', btrim(_title_pt), btrim(_title_en), btrim(_body_pt), btrim(_body_en),
         nullif(btrim(_link), ''), bid
    FROM (
      SELECT _user_id AS uid WHERE _audience = 'user'
      UNION SELECT DISTINCT owner_id FROM businesses WHERE _audience = 'business_owners' AND owner_id IS NOT NULL
      UNION SELECT id FROM profiles WHERE _audience = 'all'
    ) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE admin_broadcasts SET recipients = n WHERE id = bid;
  RETURN jsonb_build_object('broadcast_id', bid, 'recipients', n);
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_broadcasts(_limit integer DEFAULT 50)
 RETURNS TABLE (id uuid, created_at timestamptz, sender text, audience text, target text,
                title_pt text, title_en text, body_pt text, body_en text, link text, recipients integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT b.id, b.created_at, s.display_name, b.audience, t.display_name,
         b.title_pt, b.title_en, b.body_pt, b.body_en, b.link, b.recipients
    FROM admin_broadcasts b
    LEFT JOIN profiles s ON s.id = b.sent_by
    LEFT JOIN profiles t ON t.id = b.target_user
   ORDER BY b.created_at DESC
   LIMIT least(greatest(_limit, 1), 200);
END $$;

REVOKE ALL ON FUNCTION public.admin_send_notification(text, uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_broadcasts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_broadcasts(integer) TO authenticated;
