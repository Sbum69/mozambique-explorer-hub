-- Route rewards require an approved public plan and a completed set of proofs.
-- A durable completion log enforces one route completion per user every 72 hours,
-- including private routes and progress that is later reset or deleted.
CREATE TABLE public.route_completion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_id uuid NOT NULL,
  progress_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX route_completion_history_user_time_idx
  ON public.route_completion_history (user_id, completed_at DESC);
ALTER TABLE public.route_completion_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.route_completion_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.route_completion_history TO service_role;

-- Existing completed progress is the only recoverable history; resets before this
-- migration have already erased their completion timestamps.
INSERT INTO public.route_completion_history (user_id, route_id, progress_id, completed_at)
SELECT user_id, route_id, id, completed_at
FROM public.route_progress
WHERE status = 'completed' AND completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.route_progress_integrity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.route_id IS DISTINCT FROM OLD.route_id OR
    NEW.started_at IS DISTINCT FROM OLD.started_at
  ) THEN RAISE EXCEPTION 'PROGRESS_IDENTITY_IMMUTABLE'; END IF;

  IF NEW.current_day < 1 OR NOT EXISTS (
    SELECT 1 FROM public.route_days
    WHERE route_id = NEW.route_id AND day_number = NEW.current_day
  ) THEN RAISE EXCEPTION 'INVALID_PROGRESS_DAY'; END IF;

  IF NEW.status = 'completed' THEN
    -- Plan edits take this lock too, so proof checks and approval cannot race them.
    PERFORM 1 FROM public.routes WHERE id = NEW.route_id FOR UPDATE;
    IF TG_OP = 'INSERT' OR NOT public.route_progress_fully_proven(NEW.id) THEN
      RAISE EXCEPTION 'ROUTE_PROOFS_INCOMPLETE';
    END IF;
    IF OLD.status IS DISTINCT FROM 'completed' THEN
      -- Serialize concurrent completions of different routes by the same user.
      PERFORM 1 FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;
      IF EXISTS (
        SELECT 1 FROM public.route_completion_history
        WHERE user_id = NEW.user_id AND completed_at > now() - interval '72 hours'
      ) THEN RAISE EXCEPTION 'ROUTE_COOLDOWN_72H'; END IF;
      NEW.completed_at := now();
      INSERT INTO public.route_completion_history (user_id, route_id, progress_id, completed_at)
      VALUES (NEW.user_id, NEW.route_id, NEW.id, NEW.completed_at);
    ELSE
      NEW.completed_at := OLD.completed_at;
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

-- Lock the route before changing its days or stops. This serializes plan edits
-- with completion and preserves the existing proof-evidence guard.
CREATE OR REPLACE FUNCTION public.route_plan_evidence_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid; next_rid uuid;
BEGIN
  IF TG_TABLE_NAME = 'routes' THEN
    rid := OLD.id;
  ELSIF TG_TABLE_NAME = 'route_days' THEN
    rid := CASE WHEN TG_OP = 'INSERT' THEN NEW.route_id ELSE OLD.route_id END;
    IF TG_OP = 'UPDATE' THEN next_rid := NEW.route_id; END IF;
  ELSE
    SELECT route_id INTO rid FROM public.route_days
    WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.route_day_id ELSE OLD.route_day_id END;
    IF TG_OP = 'UPDATE' THEN
      SELECT route_id INTO next_rid FROM public.route_days WHERE id = NEW.route_day_id;
    END IF;
  END IF;
  -- DELETE already locks its route row; day and stop edits need the same lock.
  IF TG_TABLE_NAME <> 'routes' THEN
    PERFORM 1 FROM public.routes WHERE id IN (rid, next_rid) ORDER BY id FOR UPDATE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.route_progress p
    JOIN public.route_stop_progress sp ON sp.progress_id = p.id
    WHERE p.route_id IN (rid, next_rid)
  ) THEN RAISE EXCEPTION 'ROUTE_HAS_PROOFS'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- A user's edits to the structure of an approved public route invalidate the
-- admin decision. This also covers direct table writes outside save_route_plan.
CREATE OR REPLACE FUNCTION public.routes_reopen_review_on_plan_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_route_id uuid; new_route_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NULL;
  END IF;
  IF TG_TABLE_NAME = 'route_days' THEN
    IF TG_OP <> 'INSERT' THEN old_route_id := OLD.route_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_route_id := NEW.route_id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN
      SELECT route_id INTO old_route_id FROM public.route_days WHERE id = OLD.route_day_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT route_id INTO new_route_id FROM public.route_days WHERE id = NEW.route_day_id;
    END IF;
  END IF;
  UPDATE public.routes r SET review_status = 'pending'
  WHERE r.id = ANY (array_remove(ARRAY[old_route_id, new_route_id], NULL::uuid))
    AND r.owner_id = auth.uid()
    AND r.is_public AND r.review_status = 'approved';
  RETURN NULL;
END $$;
CREATE TRIGGER route_days_reopen_review
AFTER INSERT OR UPDATE OR DELETE ON public.route_days
FOR EACH ROW EXECUTE FUNCTION public.routes_reopen_review_on_plan_edit();
CREATE TRIGGER route_stops_reopen_review
AFTER INSERT OR UPDATE OR DELETE ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.routes_reopen_review_on_plan_edit();
REVOKE ALL ON FUNCTION public.routes_reopen_review_on_plan_edit() FROM PUBLIC, anon, authenticated;

-- No points are issued for individual proofs. They are awarded atomically with
-- the completion bonus, after the whole route and its approval are checked.
DROP TRIGGER IF EXISTS route_stop_progress_points_trg ON public.route_stop_progress;
DROP FUNCTION public.points_on_stop_proof();

CREATE OR REPLACE FUNCTION public.points_on_route_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NOT public.route_progress_fully_proven(NEW.id) THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = NEW.route_id
      AND r.is_public AND r.status = 'active' AND r.review_status = 'approved'
      AND NOT r.requires_validation
      AND NOT EXISTS (
        SELECT 1 FROM public.route_stops s
        JOIN public.route_days d ON d.id = s.route_day_id
        WHERE d.route_id = r.id AND s.validation_status <> 'confirmed'
      )
  ) THEN RETURN NEW; END IF;

  INSERT INTO public.points_ledger (user_id, points, kind, reason, source_type, source_id)
  SELECT NEW.user_id, public.points_value('route_stop_proof'), 'award',
         'route_stop_proof', 'route_stop', sp.route_stop_id
  FROM public.route_stop_progress sp
  WHERE sp.progress_id = NEW.id AND sp.review_status IN ('verified', 'approved')
    AND sp.photo_path IS NOT NULL AND btrim(sp.photo_path) <> ''
  ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;

  INSERT INTO public.points_ledger (user_id, points, kind, reason, source_type, source_id)
  VALUES (NEW.user_id, public.points_value('route_completed'), 'award',
          'route_completed', 'route', NEW.route_id)
  ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.points_on_route_completed() FROM PUBLIC, anon, authenticated;
