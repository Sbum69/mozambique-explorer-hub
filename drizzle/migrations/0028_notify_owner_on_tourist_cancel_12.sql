CREATE OR REPLACE FUNCTION public.bookings_notify_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t_pt text; t_en text; b_pt text; b_en text; exp_pt text; exp_en text; r_pt text; r_en text; owner uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status NOT IN ('confirmed','rejected','cancelled') THEN
    RETURN NEW;
  END IF;
  SELECT title_pt, COALESCE(title_en, title_pt) INTO exp_pt, exp_en FROM public.experiences WHERE id = NEW.experience_id;
  r_pt := COALESCE(' Motivo: ' || NULLIF(NEW.decision_reason, ''), '');
  r_en := COALESCE(' Reason: ' || NULLIF(NEW.decision_reason, ''), '');
  -- Tourist cancelled their own booking: tell the business owner, not the tourist.
  IF NEW.status = 'cancelled' AND auth.uid() IS NOT NULL AND auth.uid() = NEW.customer_id THEN
    SELECT b.owner_id INTO owner FROM public.businesses b WHERE b.id = NEW.business_id;
    IF owner IS NOT NULL AND owner <> NEW.customer_id THEN
      INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
      VALUES (owner, 'booking', 'Reserva cancelada pelo cliente', 'Booking cancelled by customer',
        'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" em ' || NEW.date || ' foi cancelada pelo cliente.',
        'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" on ' || NEW.date || ' was cancelled by the customer.',
        '/business-dashboard');
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'confirmed' THEN
    t_pt := 'Reserva confirmada'; t_en := 'Booking confirmed';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi confirmada.';
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was confirmed.';
  ELSIF NEW.status = 'rejected' THEN
    t_pt := 'Reserva rejeitada'; t_en := 'Booking rejected';
    b_pt := 'A tua reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi rejeitada pelo anfitrião.' || r_pt;
    b_en := 'Your booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was rejected by the host.' || r_en;
  ELSE
    t_pt := 'Reserva cancelada'; t_en := 'Booking cancelled';
    b_pt := 'A reserva ' || NEW.code || ' para "' || COALESCE(exp_pt,'') || '" foi cancelada.' || r_pt;
    b_en := 'Booking ' || NEW.code || ' for "' || COALESCE(exp_en,'') || '" was cancelled.' || r_en;
  END IF;
  INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
  VALUES (NEW.customer_id, 'booking', t_pt, t_en, b_pt, b_en, '/bookings');
  RETURN NEW;
END;
$function$;