ALTER TABLE public.community_experiences
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS additional_info text,
  ADD COLUMN IF NOT EXISTS image_path text;

CREATE INDEX IF NOT EXISTS community_experiences_status_idx ON public.community_experiences (status);
CREATE INDEX IF NOT EXISTS community_experiences_submitted_by_idx ON public.community_experiences (submitted_by);

DROP POLICY IF EXISTS "Public reads active community experiences" ON public.community_experiences;
CREATE POLICY "Public reads approved active community experiences"
  ON public.community_experiences FOR SELECT TO anon, authenticated
  USING (active = true AND status = 'approved');
CREATE POLICY "Submitters read own community experiences"
  ON public.community_experiences FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());
CREATE POLICY "Authenticated submit pending community experiences"
  ON public.community_experiences FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.community_experiences_prepare_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.submitted_at := now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := 'pending';
    NEW.active := true;
    NEW.submitted_by := auth.uid();
    NEW.decided_at := NULL;
    NEW.decided_by := NULL;
    NEW.rejection_reason := NULL;
  ELSIF auth.uid() IS NOT NULL THEN
    NEW.submitted_by := COALESCE(NEW.submitted_by, auth.uid());
    IF NEW.status <> 'pending' THEN
      NEW.decided_at := now();
      NEW.decided_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER community_experiences_prepare_insert
  BEFORE INSERT ON public.community_experiences
  FOR EACH ROW EXECUTE FUNCTION public.community_experiences_prepare_insert();

CREATE OR REPLACE FUNCTION public.community_experiences_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change community experiences';
  END IF;
  NEW.submitted_by := OLD.submitted_by;
  NEW.submitted_at := OLD.submitted_at;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.decided_at := now();
    NEW.decided_by := auth.uid();
    IF NEW.status <> 'rejected' THEN NEW.rejection_reason := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER community_experiences_guard_update
  BEFORE UPDATE ON public.community_experiences
  FOR EACH ROW EXECUTE FUNCTION public.community_experiences_guard_update();

CREATE OR REPLACE FUNCTION public.community_experiences_notify_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved','rejected')
     AND NEW.submitted_by IS NOT NULL
     AND NEW.submitted_by IS DISTINCT FROM auth.uid() THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.submitted_by, 'community_experience_approved',
        'Experiência aprovada', 'Experience approved',
        'A tua proposta "' || NEW.title_pt || '" foi aprovada e já está pública.',
        'Your proposal "' || NEW.title_en || '" was approved and is now public.',
        '/community-experiences');
    ELSE
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.submitted_by, 'community_experience_rejected',
        'Experiência rejeitada', 'Experience rejected',
        'A tua proposta "' || NEW.title_pt || '" foi rejeitada.' || COALESCE(' Motivo: ' || NULLIF(NEW.rejection_reason, ''), ''),
        'Your proposal "' || NEW.title_en || '" was rejected.' || COALESCE(' Reason: ' || NULLIF(NEW.rejection_reason, ''), ''),
        '/community-experiences');
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER community_experiences_notify_decision
  AFTER UPDATE ON public.community_experiences
  FOR EACH ROW EXECUTE FUNCTION public.community_experiences_notify_decision();

-- Storage: private bucket community-photos. Upload into own folder; read only approved/own/admin.
CREATE POLICY "Community photos upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Community photos read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'community-photos' AND (
    EXISTS (SELECT 1 FROM public.community_experiences ce WHERE ce.image_path = storage.objects.name AND ce.status = 'approved' AND ce.active = true)
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR public.has_role(auth.uid(), 'admin')
  ));
CREATE POLICY "Community photos admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Community photos delete own or admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));