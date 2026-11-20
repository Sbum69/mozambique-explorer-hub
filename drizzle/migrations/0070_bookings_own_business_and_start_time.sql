-- =====================================================================
-- EKAYA — 0070 — Reservas: dono não reserva o próprio negócio + hora de início futura
-- (PROPOSTA, NÃO APLICADA) — 2026-11-20
--
-- Problema confirmado a 16/11: o dono de um negócio reservava a PRÓPRIA experiência,
-- com hora já passada hoje, confirmava, concluía e recebia 100 pontos (booking_completed).
--
-- Regras:
--  * Não apaga nem altera o histórico de pontos (points_ledger).
--  * Não mexe em RLS. Só substitui 2 funções de trigger existentes.
--  * Verificado em produção (leitura): 0 reservas próprias e 0 pontos de reservas
--    próprias já existentes, por isso não há dados a corrigir.
--  * As funções abaixo são cópias das atuais (confirmadas idênticas em produção a
--    20/11) com apenas os blocos marcados "NOVO" acrescentados.
--
-- Fora desta migração (decisão à parte): esconder decided_by/decided_at do anónimo
-- na tabela businesses (precisa de rever os select('*') do frontend).
-- =====================================================================

-- 1) bookings_validate_insert: bloquear reserva do dono ao próprio
--    negócio e reservas cuja hora de início já passou (hora de Maputo,
--    igual à usada em bookings_guard_update).
CREATE OR REPLACE FUNCTION public.bookings_validate_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  exp_business_id uuid;
  exp_active boolean;
  slot_capacity integer;
  occupied integer;
BEGIN
  NEW.code := public.generate_booking_code();
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.status := 'pending';
  END IF;
  IF NEW.date < current_date THEN
    RAISE EXCEPTION 'Booking date cannot be in the past';
  END IF;
  -- NOVO: a hora de início também não pode ter passado (fuso de Maputo)
  IF (NEW.date + NEW."time") < (now() AT TIME ZONE 'Africa/Maputo') THEN
    RAISE EXCEPTION 'Booking start time cannot be in the past';
  END IF;
  SELECT e.business_id, e.active INTO exp_business_id, exp_active
  FROM public.experiences e
  WHERE e.id = NEW.experience_id;
  IF exp_business_id IS NULL THEN
    RAISE EXCEPTION 'Experience not found';
  END IF;
  IF NEW.business_id IS DISTINCT FROM exp_business_id THEN
    RAISE EXCEPTION 'business_id does not match the owner business of the selected experience';
  END IF;
  -- NOVO: o dono não pode reservar o seu próprio negócio (admin isento)
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND EXISTS (
       SELECT 1 FROM public.businesses b
        WHERE b.id = NEW.business_id AND b.owner_id = NEW.customer_id
     ) THEN
    RAISE EXCEPTION 'OWN_BUSINESS_BOOKING_NOT_ALLOWED';
  END IF;
  IF exp_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Experience is not active and cannot be booked';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.experience_id::text || '|' || NEW.date::text || '|' || NEW."time"::text, 0)
  );
  SELECT a.capacity INTO slot_capacity
  FROM public.experience_availability a
  WHERE a.experience_id = NEW.experience_id
    AND a.active = true
    AND a.accepts_new_bookings = true
    AND a.day_of_week = EXTRACT(DOW FROM NEW.date)::int
    AND NEW."time" >= a.start_time
    AND NEW."time" < a.end_time
  ORDER BY a.start_time
  LIMIT 1;
  IF slot_capacity IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.experience_availability a
      WHERE a.experience_id = NEW.experience_id
        AND a.active = true
        AND a.accepts_new_bookings = false
        AND a.day_of_week = EXTRACT(DOW FROM NEW.date)::int
        AND NEW."time" >= a.start_time
        AND NEW."time" < a.end_time
    ) THEN
      RAISE EXCEPTION 'Schedule closed to new bookings';
    END IF;
    RAISE EXCEPTION 'No availability configured for the requested date/time';
  END IF;
  SELECT COALESCE(SUM(b.people), 0)::integer INTO occupied
  FROM public.bookings b
  WHERE b.experience_id = NEW.experience_id
    AND b.date = NEW.date
    AND b."time" = NEW."time"
    AND b.status IN ('pending'::public.booking_status, 'confirmed'::public.booking_status);
  IF occupied + NEW.people > slot_capacity THEN
    RAISE EXCEPTION 'Capacity exceeded: % of % seats already booked for this slot', occupied, slot_capacity;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) points_on_booking: defesa em profundidade — nunca atribuir pontos
--    quando o cliente é o dono do negócio da reserva. A reversão
--    (ELSIF) fica igual. Pontos já atribuídos NÃO são apagados.
CREATE OR REPLACE FUNCTION public.points_on_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- NOVO: sem pontos se o cliente é o dono do negócio
    IF NOT EXISTS (
      SELECT 1 FROM public.businesses b
       WHERE b.id = NEW.business_id AND b.owner_id = NEW.customer_id
    ) THEN
      INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
      VALUES (NEW.customer_id, public.points_value('booking_completed'),'award','booking_completed','booking',NEW.id)
      ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
    END IF;
  ELSIF OLD.status='completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
    SELECT l.user_id, -l.points,'reversal','booking_completed','booking',NEW.id FROM public.points_ledger l
     WHERE l.user_id=OLD.customer_id AND l.source_type='booking' AND l.source_id=NEW.id AND l.kind='award'
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;
