-- Fix: the content-photos policies (0051) compared the business id with storage.foldername(b.name),
-- the business NAME, instead of the object path, so owners could never upload, update or delete
-- their photos (only the admin could). The folder is the business id: "<business_id>/<file>".
-- Same rules as before: the admin, or the owner of the business whose id is the first folder.
-- UPDATE now also has WITH CHECK, so an object cannot be moved into another business's folder.

DROP POLICY IF EXISTS "Content photos: admin or own business can upload" ON storage.objects;
DROP POLICY IF EXISTS "Content photos: admin or own business can update" ON storage.objects;
DROP POLICY IF EXISTS "Content photos: admin or own business can delete" ON storage.objects;

CREATE POLICY "Content photos: admin or own business can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND (storage.foldername(objects.name))[1] = b.id::text)));

CREATE POLICY "Content photos: admin or own business can update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND (storage.foldername(objects.name))[1] = b.id::text)))
  WITH CHECK (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND (storage.foldername(objects.name))[1] = b.id::text)));

CREATE POLICY "Content photos: admin or own business can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'content-photos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.owner_id = auth.uid() AND (storage.foldername(objects.name))[1] = b.id::text)));
