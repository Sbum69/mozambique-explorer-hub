-- SEG-FINAL — Security hardening (defence in depth; no change for legitimate use).
-- 1) Visitors (anon) never write: RLS already refuses every anon write (no anon write policy
--    exists), but the default grants still listed INSERT/UPDATE/DELETE/TRUNCATE. TRUNCATE is not
--    subject to RLS, so it is also removed from authenticated.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 2) Functions only meaningful for signed-in users are not executable by visitors.
--    (can_view_route and commercial_activity_public stay: anon read policies use them.)
REVOKE EXECUTE ON FUNCTION public.business_decide_booking(uuid, public.booking_status, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_route(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_experience(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_route_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_decide_booking(uuid, public.booking_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_route(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_experience(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_route_code() TO authenticated;

-- 3) Notification links: in-app paths only; "//host" (protocol-relative, opens another site) is refused.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_link_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_link_check
  CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%'));

-- 4) Community photos: visitors could not read approved photos (the policy called has_role, which
--    anon cannot execute). Same rules, split by role so anon never evaluates has_role.
DROP POLICY IF EXISTS "Community photos read" ON storage.objects;
CREATE POLICY "Community photos read approved"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'community-photos'
    AND EXISTS (
      SELECT 1 FROM public.community_experiences ce
       WHERE ce.image_path = storage.objects.name AND ce.status = 'approved' AND ce.active = true
    )
  );
CREATE POLICY "Community photos read own or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );

-- 5) Uploads: images only (the app already checks image/*; the buckets now enforce it too).
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
 WHERE id IN ('community-photos', 'route-proofs', 'game-proofs');
