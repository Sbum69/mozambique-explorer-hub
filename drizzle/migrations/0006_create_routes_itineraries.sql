-- ============ ROUTES (itineraries) ============
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  province_id uuid REFERENCES public.provinces(id),
  unique_code text NOT NULL UNIQUE,
  duration_days integer NOT NULL DEFAULT 1,
  cover_image text,
  is_public boolean NOT NULL DEFAULT false,
  is_curated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT routes_status_check CHECK (status IN ('active','inactive')),
  CONSTRAINT routes_code_format CHECK (unique_code ~ '^EK-[A-Z0-9]{4,10}$'),
  CONSTRAINT routes_duration_check CHECK (duration_days BETWEEN 1 AND 30)
);

CREATE TABLE public.route_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number >= 1),
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, day_number)
);

CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_day_id uuid NOT NULL REFERENCES public.route_days(id) ON DELETE CASCADE,
  stop_order integer NOT NULL CHECK (stop_order >= 1),
  destination_id uuid REFERENCES public.destinations(id) ON DELETE CASCADE,
  experience_id uuid REFERENCES public.experiences(id) ON DELETE CASCADE,
  notes text,
  estimated_duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT route_stops_one_ref CHECK (
    (destination_id IS NOT NULL AND experience_id IS NULL)
    OR (destination_id IS NULL AND experience_id IS NOT NULL)
  )
);
CREATE INDEX route_stops_day_idx ON public.route_stops(route_day_id, stop_order);

CREATE TABLE public.route_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  current_day integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  CONSTRAINT route_progress_status_check CHECK (status IN ('in_progress','completed')),
  UNIQUE (user_id, route_id)
);

CREATE TABLE public.route_stop_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id uuid NOT NULL REFERENCES public.route_progress(id) ON DELETE CASCADE,
  route_stop_id uuid NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (progress_id, route_stop_id)
);

-- ============ GRANTS ============
GRANT SELECT ON public.routes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routes TO authenticated;
GRANT ALL ON public.routes TO service_role;

GRANT SELECT ON public.route_days TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_days TO authenticated;
GRANT ALL ON public.route_days TO service_role;

GRANT SELECT ON public.route_stops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_progress TO authenticated;
GRANT ALL ON public.route_progress TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stop_progress TO authenticated;
GRANT ALL ON public.route_stop_progress TO service_role;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.can_view_route(_route_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = _route_id
      AND (
        (r.is_public AND r.status = 'active')
        OR r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_route(_route_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = _route_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_route_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'EK-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.routes WHERE unique_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- code normalisation / auto-generation
CREATE OR REPLACE FUNCTION public.routes_prepare_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.unique_code IS NULL OR btrim(NEW.unique_code) = '' THEN
    NEW.unique_code := public.generate_route_code();
  ELSE
    NEW.unique_code := upper(btrim(NEW.unique_code));
    IF NEW.unique_code !~ '^EK-' THEN
      NEW.unique_code := 'EK-' || NEW.unique_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER routes_prepare_insert_trg
BEFORE INSERT ON public.routes
FOR EACH ROW EXECUTE FUNCTION public.routes_prepare_insert();

-- privileged fields cannot be changed by the owner
CREATE OR REPLACE FUNCTION public.routes_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'owner_id cannot be changed';
    END IF;
    IF NEW.is_curated IS DISTINCT FROM OLD.is_curated THEN
      RAISE EXCEPTION 'is_curated cannot be changed';
    END IF;
    IF NEW.unique_code IS DISTINCT FROM OLD.unique_code THEN
      RAISE EXCEPTION 'unique_code cannot be changed';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER routes_guard_update_trg
BEFORE UPDATE ON public.routes
FOR EACH ROW EXECUTE FUNCTION public.routes_guard_update();

-- ============ RLS ============
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stop_progress ENABLE ROW LEVEL SECURITY;

-- routes
CREATE POLICY "Anyone can view public active routes" ON public.routes
FOR SELECT TO anon, authenticated USING (is_public AND status = 'active');

CREATE POLICY "Owners can view own routes" ON public.routes
FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all routes" ON public.routes
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own routes" ON public.routes
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND is_curated = false);

CREATE POLICY "Admins can create any route" ON public.routes
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can update own routes" ON public.routes
FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can update any route" ON public.routes
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete own routes" ON public.routes
FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Admins can delete any route" ON public.routes
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- route_days
CREATE POLICY "View days of viewable routes" ON public.route_days
FOR SELECT TO anon, authenticated USING (public.can_view_route(route_id));

CREATE POLICY "Edit days of editable routes" ON public.route_days
FOR INSERT TO authenticated WITH CHECK (public.can_edit_route(route_id));

CREATE POLICY "Update days of editable routes" ON public.route_days
FOR UPDATE TO authenticated USING (public.can_edit_route(route_id)) WITH CHECK (public.can_edit_route(route_id));

CREATE POLICY "Delete days of editable routes" ON public.route_days
FOR DELETE TO authenticated USING (public.can_edit_route(route_id));

-- route_stops
CREATE POLICY "View stops of viewable routes" ON public.route_stops
FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.route_days d WHERE d.id = route_day_id AND public.can_view_route(d.route_id))
);

CREATE POLICY "Insert stops of editable routes" ON public.route_stops
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.route_days d WHERE d.id = route_day_id AND public.can_edit_route(d.route_id))
);

CREATE POLICY "Update stops of editable routes" ON public.route_stops
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.route_days d WHERE d.id = route_day_id AND public.can_edit_route(d.route_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.route_days d WHERE d.id = route_day_id AND public.can_edit_route(d.route_id))
);

CREATE POLICY "Delete stops of editable routes" ON public.route_stops
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.route_days d WHERE d.id = route_day_id AND public.can_edit_route(d.route_id))
);

-- progress (strictly own)
CREATE POLICY "Users manage own progress select" ON public.route_progress
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own progress insert" ON public.route_progress
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_view_route(route_id));
CREATE POLICY "Users manage own progress update" ON public.route_progress
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own progress delete" ON public.route_progress
FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users view own stop progress" ON public.route_stop_progress
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.route_progress p WHERE p.id = progress_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users insert own stop progress" ON public.route_stop_progress
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.route_progress p WHERE p.id = progress_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users delete own stop progress" ON public.route_stop_progress
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.route_progress p WHERE p.id = progress_id AND p.user_id = auth.uid())
);

-- ============ CURATED SEED (real destinations / experiences only) ============
INSERT INTO public.routes (id, owner_id, title, description, province_id, unique_code, duration_days, is_public, is_curated, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', NULL, 'Praias de Inhambane',
   'Mergulha nas praias paradisíacas e na cultura costeira de Inhambane.',
   '1eade7bd-9570-407f-a7b2-677a605b1fd7', 'EK-INH001', 2, true, true, 'active'),
  ('22222222-2222-4222-8222-222222222222', NULL, 'Maputo Cultural',
   'Descobre a história colonial e a arte vibrante da capital.',
   '48a3a6fc-95cd-492d-9f4d-c865477d2a95', 'EK-MAP002', 2, true, true, 'active');

INSERT INTO public.route_days (id, route_id, day_number, title)
VALUES
  ('aaaaaaa1-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 1, 'Inhambane'),
  ('aaaaaaa2-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 2, 'Vilankulo'),
  ('bbbbbbb1-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 1, 'Maputo'),
  ('bbbbbbb2-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 2, 'Maputo');

INSERT INTO public.route_stops (route_day_id, stop_order, destination_id, experience_id)
VALUES
  ('aaaaaaa1-1111-4111-8111-111111111111', 1, '05b866b9-a3c5-4fac-b954-62ad6c56f090', NULL),
  ('aaaaaaa1-1111-4111-8111-111111111111', 2, NULL, '4251e886-618c-4e12-a8ae-81e18ec5a9be'),
  ('aaaaaaa2-1111-4111-8111-111111111111', 1, '2094d5f5-b871-414b-85c0-9c0a2207d9f5', NULL),
  ('aaaaaaa2-1111-4111-8111-111111111111', 2, NULL, 'f4850186-e3f2-45ea-84de-d2787aaf34a3'),
  ('bbbbbbb1-2222-4222-8222-222222222222', 1, '622d5bb1-d8c1-44cd-bd6b-f26617628cce', NULL),
  ('bbbbbbb1-2222-4222-8222-222222222222', 2, NULL, '5f983f3a-dbba-42f9-b2cf-7b9d6aa7c8e7'),
  ('bbbbbbb2-2222-4222-8222-222222222222', 1, NULL, 'e23179d9-9202-421e-b349-8fa1881ba2e8');
