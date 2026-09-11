-- BLOCO 5.1 — experience_availability
CREATE TABLE IF NOT EXISTS public.experience_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_availability_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT experience_availability_capacity_check CHECK (capacity > 0),
  CONSTRAINT experience_availability_time_order_check CHECK (end_time > start_time),
  CONSTRAINT experience_availability_unique_slot UNIQUE (experience_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_experience_availability_experience_id ON public.experience_availability(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_availability_day_of_week ON public.experience_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_experience_availability_exp_day_active ON public.experience_availability(experience_id, day_of_week, active);

DROP TRIGGER IF EXISTS experience_availability_set_updated_at ON public.experience_availability;
CREATE TRIGGER experience_availability_set_updated_at
  BEFORE UPDATE ON public.experience_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- helper: dono do negócio da experiência
CREATE OR REPLACE FUNCTION public.owns_experience(_experience_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.experiences e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.id = _experience_id
      AND b.owner_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.owns_experience(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_experience(uuid) TO authenticated, service_role;

-- trigger de proteção: não permitir associar/transferir para experiência de outro negócio
CREATE OR REPLACE FUNCTION public.experience_availability_guard_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.experience_id IS DISTINCT FROM OLD.experience_id THEN
    RAISE EXCEPTION 'Cannot move availability to another experience';
  END IF;

  IF NOT public.owns_experience(NEW.experience_id) THEN
    RAISE EXCEPTION 'Availability must belong to an experience of one of your own businesses';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.experience_availability_guard_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS experience_availability_guard_owner ON public.experience_availability;
CREATE TRIGGER experience_availability_guard_owner
  BEFORE INSERT OR UPDATE ON public.experience_availability
  FOR EACH ROW EXECUTE FUNCTION public.experience_availability_guard_owner();

-- grants (least privilege)
REVOKE ALL ON TABLE public.experience_availability FROM anon, authenticated;
GRANT SELECT ON public.experience_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_availability TO authenticated;
GRANT ALL ON public.experience_availability TO service_role;

ALTER TABLE public.experience_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability of active experiences"
  ON public.experience_availability FOR SELECT TO anon, authenticated
  USING (
    active = true AND EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.active = true
    )
  );

CREATE POLICY "Owners can view availability of own experiences"
  ON public.experience_availability FOR SELECT TO authenticated
  USING (public.owns_experience(experience_id));

CREATE POLICY "Owners can create availability for own experiences"
  ON public.experience_availability FOR INSERT TO authenticated
  WITH CHECK (public.owns_experience(experience_id));

CREATE POLICY "Owners can update availability of own experiences"
  ON public.experience_availability FOR UPDATE TO authenticated
  USING (public.owns_experience(experience_id))
  WITH CHECK (public.owns_experience(experience_id));

CREATE POLICY "Owners can delete availability of own experiences"
  ON public.experience_availability FOR DELETE TO authenticated
  USING (public.owns_experience(experience_id));

CREATE POLICY "Admins can view all availability"
  ON public.experience_availability FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert any availability"
  ON public.experience_availability FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update any availability"
  ON public.experience_availability FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete any availability"
  ON public.experience_availability FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ocupação atual (apenas pending + confirmed)
CREATE OR REPLACE FUNCTION public.booked_people(_experience_id uuid, _date date, _time time)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(b.people), 0)::integer
  FROM public.bookings b
  WHERE b.experience_id = _experience_id
    AND b.date = _date
    AND b."time" = _time
    AND b.status IN ('pending'::public.booking_status, 'confirmed'::public.booking_status)
$$;

REVOKE ALL ON FUNCTION public.booked_people(uuid, date, time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booked_people(uuid, date, time) TO service_role;

-- consulta pública de disponibilidade (sem dados pessoais)
CREATE OR REPLACE FUNCTION public.get_experience_availability(_experience_id uuid, _date date)
RETURNS TABLE (
  experience_id uuid,
  date date,
  start_time time,
  end_time time,
  capacity integer,
  booked_people integer,
  remaining_capacity integer,
  available boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.experience_id,
    _date AS date,
    a.start_time,
    a.end_time,
    a.capacity,
    public.booked_people(a.experience_id, _date, a.start_time) AS booked_people,
    (a.capacity - public.booked_people(a.experience_id, _date, a.start_time)) AS remaining_capacity,
    ((a.capacity - public.booked_people(a.experience_id, _date, a.start_time)) > 0) AS available
  FROM public.experience_availability a
  JOIN public.experiences e ON e.id = a.experience_id
  WHERE a.experience_id = _experience_id
    AND a.active = true
    AND e.active = true
    AND a.day_of_week = EXTRACT(DOW FROM _date)::int
  ORDER BY a.start_time
$$;

GRANT EXECUTE ON FUNCTION public.get_experience_availability(uuid, date) TO anon, authenticated, service_role;