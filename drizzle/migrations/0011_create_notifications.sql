-- ============ BLOCK 7D — NOTIFICATIONS ============

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title_pt text NOT NULL,
  title_en text,
  body_pt text NOT NULL,
  body_en text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN ('system','booking','itinerary','experience','community','route','reward','safety','promo','event')),
  CONSTRAINT notifications_title_check CHECK (char_length(btrim(title_pt)) BETWEEN 2 AND 160),
  CONSTRAINT notifications_body_check CHECK (char_length(btrim(body_pt)) BETWEEN 2 AND 2000),
  CONSTRAINT notifications_link_check CHECK (link IS NULL OR link LIKE '/%')
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Each user reads only their own notifications.
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins may inspect all notifications (uses the existing role system).
CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users may only flip the read state of their own rows; no content edits.
CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notifications_immutable_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id
     OR NEW.type <> OLD.type
     OR NEW.title_pt <> OLD.title_pt
     OR COALESCE(NEW.title_en, '') <> COALESCE(OLD.title_en, '')
     OR NEW.body_pt <> OLD.body_pt
     OR COALESCE(NEW.body_en, '') <> COALESCE(OLD.body_en, '')
     OR COALESCE(NEW.link, '') <> COALESCE(OLD.link, '')
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only the read state of a notification can be updated';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_immutable_content_trg
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_immutable_content();
