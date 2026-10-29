-- UX-1 — Settings: avatars, in-app notification choices and deleting one's own account.

-- 1) Profile fields the user cannot change by themselves.
--    deleted_at: set only by delete_my_account (an anonymised account keeps its id for the records
--    that must stay, e.g. past bookings of a business).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
--    Notification types the user switched off (in-app). Bookings, business, safety and platform
--    notices ('system') can never be switched off.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS muted_notification_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_muted_notification_types_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_muted_notification_types_check
  CHECK (muted_notification_types <@ ARRAY['community', 'experience', 'route', 'itinerary', 'promo', 'event', 'reward']::text[]);

CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.deleted_at := OLD.deleted_at;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_privileged_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_guard_privileged_fields ON public.profiles;
CREATE TRIGGER profiles_guard_privileged_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_fields();

-- 2) Muted types are skipped when the notification is created (every producer goes through INSERT).
CREATE OR REPLACE FUNCTION public.notifications_skip_muted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = NEW.user_id AND NEW.type = ANY (p.muted_notification_types)) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notifications_skip_muted() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notifications_skip_muted ON public.notifications;
CREATE TRIGGER notifications_skip_muted BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_skip_muted();

-- 3) Avatars: public images (shown next to the user's name), at most 2 MB, written only in the
--    user's own folder (<user id>/…).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Avatars read own" ON storage.objects;
CREATE POLICY "Avatars read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Avatars upload own folder" ON storage.objects;
CREATE POLICY "Avatars upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Avatars update own" ON storage.objects;
CREATE POLICY "Avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Avatars delete own" ON storage.objects;
CREATE POLICY "Avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Delete my account.
--    Refused: last admin; future pending/confirmed bookings (as customer, or of a business I own).
--    No business and no bookings: the auth user is deleted and everything personal cascades.
--    Otherwise (past bookings or a business must stay for the other side's records): the account is
--    anonymised — personal data removed, bookings without name/contacts, own businesses suspended,
--    roles removed, sign-in disabled and the email freed.
--    Public approved itineraries and approved community experiences stay (without owner).
CREATE OR REPLACE FUNCTION public.delete_my_account(_confirm text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  keeps_records boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF coalesce(btrim(_confirm), '') NOT IN ('APAGAR', 'DELETE') THEN RAISE EXCEPTION 'CONFIRMATION_REQUIRED'; END IF;

  is_admin := public.has_role(uid, 'admin');
  IF is_admin AND (SELECT count(*) FROM public.user_roles r
                    JOIN public.profiles p ON p.id = r.user_id
                   WHERE r.role = 'admin' AND p.deleted_at IS NULL) <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b JOIN public.businesses s ON s.id = b.business_id
              WHERE s.owner_id = uid AND b.date >= current_date AND b.status IN ('pending', 'confirmed')) THEN
    RAISE EXCEPTION 'BUSINESS_HAS_FUTURE_BOOKINGS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b
              WHERE b.customer_id = uid AND b.date >= current_date AND b.status IN ('pending', 'confirmed')) THEN
    RAISE EXCEPTION 'HAS_FUTURE_BOOKINGS';
  END IF;

  -- Private or unapproved itineraries are only the user's; public approved ones stay for others.
  DELETE FROM public.routes WHERE owner_id = uid AND NOT (is_public AND review_status = 'approved');

  keeps_records := EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = uid)
                OR EXISTS (SELECT 1 FROM public.bookings WHERE customer_id = uid);
  IF NOT keeps_records THEN
    DELETE FROM auth.users WHERE id = uid;
    RETURN 'deleted';
  END IF;

  -- Anonymise. Personal rows go; rows other people rely on stay without personal data.
  DELETE FROM public.favorites WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.community_post_reactions WHERE user_id = uid;
  DELETE FROM public.community_posts WHERE author_id = uid;
  DELETE FROM public.destination_visits WHERE user_id = uid;
  DELETE FROM public.news_likes WHERE user_id = uid;
  DELETE FROM public.event_participations WHERE user_id = uid;
  DELETE FROM public.profile_provinces WHERE profile_id = uid;
  DELETE FROM public.route_progress WHERE user_id = uid;
  UPDATE public.bookings SET customer_name = 'Conta apagada', customer_phone = NULL,
         customer_email = NULL, notes = NULL
   WHERE customer_id = uid;
  -- The business guard keeps status for non-admins; the user's own claims are dropped for this
  -- transaction so the suspension applies (uid was read above).
  PERFORM set_config('request.jwt.claims', '', true);
  UPDATE public.businesses SET status = 'suspended' WHERE owner_id = uid AND status <> 'suspended';
  DELETE FROM public.user_roles WHERE user_id = uid;
  UPDATE public.profiles SET display_name = 'Conta apagada', avatar_url = NULL, phone = NULL,
         province = NULL, duration_days = NULL, interests = '{}', muted_notification_types = '{}',
         deleted_at = now()
   WHERE id = uid;

  DELETE FROM auth.sessions WHERE user_id = uid;
  DELETE FROM auth.refresh_tokens WHERE user_id = uid::text;
  DELETE FROM auth.identities WHERE user_id = uid;
  UPDATE auth.users SET email = 'deleted-' || uid::text || '@ekaya.invalid', phone = NULL,
         encrypted_password = NULL, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity'
   WHERE id = uid;
  RETURN 'anonymised';
END $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;
