CREATE OR REPLACE FUNCTION public.community_experiences_notify_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved','rejected')
     AND NEW.submitted_by IS NOT NULL
     AND NEW.submitted_by IS DISTINCT FROM auth.uid() THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.submitted_by, 'community',
        'Experiência aprovada', 'Experience approved',
        'A tua proposta "' || NEW.title_pt || '" foi aprovada e já está pública.',
        'Your proposal "' || NEW.title_en || '" was approved and is now public.',
        '/community-experiences');
    ELSE
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.submitted_by, 'community',
        'Experiência rejeitada', 'Experience rejected',
        'A tua proposta "' || NEW.title_pt || '" foi rejeitada.' || COALESCE(' Motivo: ' || NULLIF(NEW.rejection_reason, ''), ''),
        'Your proposal "' || NEW.title_en || '" was rejected.' || COALESCE(' Reason: ' || NULLIF(NEW.rejection_reason, ''), ''),
        '/community-experiences');
    END IF;
  END IF;
  RETURN NEW;
END $$;