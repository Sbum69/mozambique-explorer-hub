-- =========================================================
-- BLOCO 3 — Destinations + Experiences
-- =========================================================

-- 1) DESTINATIONS -----------------------------------------
CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  province text NOT NULL,
  lat numeric,
  lng numeric,
  category text,
  description_pt text,
  description_en text,
  images text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX destinations_province_idx ON public.destinations (province);
CREATE INDEX destinations_category_idx ON public.destinations (category);

CREATE TRIGGER destinations_set_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.destinations TO anon;
GRANT SELECT ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view destinations"
  ON public.destinations FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert destinations"
  ON public.destinations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update destinations"
  ON public.destinations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete destinations"
  ON public.destinations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) EXPERIENCES ------------------------------------------
CREATE TABLE public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  title_pt text NOT NULL,
  title_en text,
  description_pt text,
  description_en text,
  province text,
  price_mzn numeric NOT NULL DEFAULT 0,
  duration_hours numeric,
  capacity integer,
  images text[],
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experiences_price_non_negative CHECK (price_mzn >= 0),
  CONSTRAINT experiences_duration_positive CHECK (duration_hours IS NULL OR duration_hours > 0),
  CONSTRAINT experiences_capacity_positive CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX experiences_business_id_idx ON public.experiences (business_id);
CREATE INDEX experiences_destination_id_idx ON public.experiences (destination_id);
CREATE INDEX experiences_province_idx ON public.experiences (province);
CREATE INDEX experiences_active_idx ON public.experiences (active);

CREATE TRIGGER experiences_set_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.experiences TO authenticated;
GRANT SELECT ON public.experiences TO anon;
GRANT ALL ON public.experiences TO service_role;

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- helper: does the given business belong to the current user?
CREATE OR REPLACE FUNCTION public.owns_business(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id
      AND b.owner_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.owns_business(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_business(uuid) TO authenticated, service_role;

-- SELECT
CREATE POLICY "Anyone can view active experiences"
  ON public.experiences FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Owners can view own experiences"
  ON public.experiences FOR SELECT TO authenticated
  USING (public.owns_business(business_id));

CREATE POLICY "Admins can view all experiences"
  ON public.experiences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT
CREATE POLICY "Owners can create experiences for own businesses"
  ON public.experiences FOR INSERT TO authenticated
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "Admins can create any experience"
  ON public.experiences FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- UPDATE
CREATE POLICY "Owners can update own experiences"
  ON public.experiences FOR UPDATE TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "Admins can update any experience"
  ON public.experiences FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DELETE (admin only; effective through service_role / privileged paths)
CREATE POLICY "Admins can delete experiences"
  ON public.experiences FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Extra guard: block transferring an experience to a business
--    the caller does not own (defence in depth over RLS WITH CHECK).
CREATE OR REPLACE FUNCTION public.experiences_guard_business_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF is_admin OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.business_id IS DISTINCT FROM OLD.business_id THEN
    RAISE EXCEPTION 'Cannot transfer an experience to another business';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = NEW.business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Experience must belong to one of your own businesses';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.experiences_guard_business_owner() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER experiences_guard_business_owner
  BEFORE INSERT OR UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.experiences_guard_business_owner();