ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['system','booking','itinerary','experience','community','route','reward','safety','promo','event','business']));

CREATE OR REPLACE FUNCTION public.businesses_guard_privileged_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending'; NEW.verified := false;
    NEW.rejection_reason := NULL; NEW.decided_at := NULL; NEW.decided_by := NULL;
    RETURN NEW;
  END IF;
  NEW.owner_id := OLD.owner_id; NEW.status := OLD.status; NEW.verified := OLD.verified;
  NEW.rejection_reason := OLD.rejection_reason; NEW.decided_at := OLD.decided_at; NEW.decided_by := OLD.decided_by;
  RETURN NEW;
END;
$$;

-- Atomic, admin-only decision; only from pending (blocks duplicate/stale decisions).
CREATE OR REPLACE FUNCTION public.admin_decide_business(_business_id uuid, _decision public.business_status, _reason text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;
  IF _decision = 'rejected' AND (_reason IS NULL OR char_length(btrim(_reason)) < 3) THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  UPDATE public.businesses
     SET status = _decision,
         verified = (_decision = 'approved'),
         rejection_reason = CASE WHEN _decision = 'rejected' THEN left(btrim(_reason), 1000) ELSE NULL END,
         decided_at = now(), decided_by = auth.uid()
   WHERE id = _business_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_decide_business(uuid, public.business_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_business(uuid, public.business_status, text) TO authenticated;

-- Owner emails for admins only.
CREATE OR REPLACE FUNCTION public.admin_business_owner_emails()
 RETURNS TABLE(business_id uuid, email text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY SELECT b.id, u.email::text FROM public.businesses b JOIN auth.users u ON u.id = b.owner_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_business_owner_emails() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_business_owner_emails() TO authenticated;

CREATE OR REPLACE FUNCTION public.businesses_notify_decision()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') AND NEW.owner_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.owner_id, 'business', 'Negócio aprovado', 'Business approved',
        'O teu negócio "' || NEW.name || '" foi aprovado e já está visível em Negócios Locais.',
        'Your business "' || NEW.name || '" was approved and is now listed in Local Businesses.',
        '/business-dashboard');
    ELSE
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (NEW.owner_id, 'business', 'Negócio rejeitado', 'Business rejected',
        'O teu negócio "' || NEW.name || '" foi rejeitado.' || COALESCE(' Motivo: ' || NULLIF(NEW.rejection_reason,''), '') || ' Corrige os dados ou contacta a equipa Ekaya.',
        'Your business "' || NEW.name || '" was rejected.' || COALESCE(' Reason: ' || NULLIF(NEW.rejection_reason,''), '') || ' Please fix the details or contact the Ekaya team.',
        '/business-dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS businesses_notify_decision ON public.businesses;
CREATE TRIGGER businesses_notify_decision AFTER UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.businesses_notify_decision();