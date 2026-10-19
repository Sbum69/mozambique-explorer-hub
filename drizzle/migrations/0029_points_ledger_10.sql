-- Bloco 10: persistent, server-awarded points ledger.
CREATE TABLE public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points <> 0),
  kind text NOT NULL CHECK (kind IN ('award','reversal')),
  reason text NOT NULL CHECK (reason IN ('booking_completed','route_stop_proof','route_completed')),
  source_type text NOT NULL CHECK (source_type IN ('booking','route_stop','route')),
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT points_ledger_once UNIQUE (user_id, source_type, source_id, kind)
);
CREATE INDEX points_ledger_user_created ON public.points_ledger (user_id, created_at DESC);
GRANT SELECT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON public.points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all points" ON public.points_ledger FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Central point values (mirrored in src/lib/points.ts).
CREATE OR REPLACE FUNCTION public.points_value(_reason text) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _reason WHEN 'booking_completed' THEN 100 WHEN 'route_stop_proof' THEN 20 WHEN 'route_completed' THEN 150 ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.my_points_total() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(sum(points),0)::int FROM public.points_ledger WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_points_total() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_points_total() TO authenticated;

-- Route completion is verifiable only if every stop of the route has a photo proof in this progress.
CREATE OR REPLACE FUNCTION public.route_progress_fully_proven(_progress_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id JOIN public.route_progress p ON p.route_id=d.route_id WHERE p.id=_progress_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.route_stops s JOIN public.route_days d ON d.id=s.route_day_id JOIN public.route_progress p ON p.route_id=d.route_id
       WHERE p.id=_progress_id AND NOT EXISTS (
         SELECT 1 FROM public.route_stop_progress sp WHERE sp.progress_id=p.id AND sp.route_stop_id=s.id AND sp.photo_path IS NOT NULL AND btrim(sp.photo_path)<>''))
$$;
REVOKE ALL ON FUNCTION public.route_progress_fully_proven(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.points_on_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
    VALUES (NEW.customer_id, public.points_value('booking_completed'),'award','booking_completed','booking',NEW.id)
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  ELSIF OLD.status='completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
    SELECT l.user_id, -l.points,'reversal','booking_completed','booking',NEW.id FROM public.points_ledger l
     WHERE l.user_id=OLD.customer_id AND l.source_type='booking' AND l.source_id=NEW.id AND l.kind='award'
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_points_trg AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.points_on_booking();

CREATE OR REPLACE FUNCTION public.points_on_stop_proof() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid;
BEGIN
  IF NEW.photo_path IS NULL OR btrim(NEW.photo_path)='' THEN RETURN NEW; END IF;
  SELECT user_id INTO uid FROM public.route_progress WHERE id=NEW.progress_id;
  IF uid IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
  VALUES (uid, public.points_value('route_stop_proof'),'award','route_stop_proof','route_stop',NEW.route_stop_id)
  ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER route_stop_progress_points_trg AFTER INSERT ON public.route_stop_progress FOR EACH ROW EXECUTE FUNCTION public.points_on_stop_proof();

CREATE OR REPLACE FUNCTION public.points_on_route_completed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' AND public.route_progress_fully_proven(NEW.id) THEN
    INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
    VALUES (NEW.user_id, public.points_value('route_completed'),'award','route_completed','route',NEW.route_id)
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER route_progress_points_trg AFTER UPDATE OF status ON public.route_progress FOR EACH ROW EXECUTE FUNCTION public.points_on_route_completed();

REVOKE ALL ON FUNCTION public.points_on_booking(), public.points_on_stop_proof(), public.points_on_route_completed() FROM PUBLIC, anon, authenticated;

-- Backfill already-verified actions (idempotent).
INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id,created_at)
SELECT b.customer_id, 100,'award','booking_completed','booking',b.id,b.updated_at FROM public.bookings b WHERE b.status='completed'
ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id,created_at)
SELECT DISTINCT ON (p.user_id, sp.route_stop_id) p.user_id, 20,'award','route_stop_proof','route_stop',sp.route_stop_id,sp.completed_at
FROM public.route_stop_progress sp JOIN public.route_progress p ON p.id=sp.progress_id
WHERE sp.photo_path IS NOT NULL AND btrim(sp.photo_path)<>'' ORDER BY p.user_id, sp.route_stop_id, sp.completed_at
ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id,created_at)
SELECT DISTINCT ON (p.user_id, p.route_id) p.user_id, 150,'award','route_completed','route',p.route_id,COALESCE(p.completed_at,now())
FROM public.route_progress p WHERE p.status='completed' AND public.route_progress_fully_proven(p.id) ORDER BY p.user_id, p.route_id, p.completed_at
ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;