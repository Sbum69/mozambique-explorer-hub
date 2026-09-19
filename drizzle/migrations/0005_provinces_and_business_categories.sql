-- 1. Provinces as a real entity
CREATE TABLE public.provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_pt text NOT NULL,
  name_en text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provinces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provinces TO authenticated;
GRANT ALL ON public.provinces TO service_role;

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active provinces"
  ON public.provinces FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins can view all provinces"
  ON public.provinces FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert provinces"
  ON public.provinces FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update provinces"
  ON public.provinces FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete provinces"
  ON public.provinces FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Closed list of business categories
CREATE TABLE public.business_categories (
  code text PRIMARY KEY,
  name_pt text NOT NULL,
  name_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_categories TO authenticated;
GRANT ALL ON public.business_categories TO service_role;

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active business categories"
  ON public.business_categories FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins can view all business categories"
  ON public.business_categories FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert business categories"
  ON public.business_categories FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update business categories"
  ON public.business_categories FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete business categories"
  ON public.business_categories FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. References from existing tables (legacy text columns kept for compatibility)
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS province_id uuid REFERENCES public.provinces(id) ON DELETE SET NULL;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS province_id uuid REFERENCES public.provinces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_code text REFERENCES public.business_categories(code) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS destinations_province_id_idx ON public.destinations(province_id);
CREATE INDEX IF NOT EXISTS businesses_province_id_idx ON public.businesses(province_id);
CREATE INDEX IF NOT EXISTS businesses_category_code_idx ON public.businesses(category_code);

-- 4. Tourist preferences: several provinces per profile
CREATE TABLE public.profile_provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  province_id uuid NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (profile_id, province_id)
);

GRANT SELECT, INSERT, DELETE ON public.profile_provinces TO authenticated;
GRANT ALL ON public.profile_provinces TO service_role;

ALTER TABLE public.profile_provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own province preferences"
  ON public.profile_provinces FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can add own province preferences"
  ON public.profile_provinces FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can remove own province preferences"
  ON public.profile_provinces FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all province preferences"
  ON public.profile_provinces FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS profile_provinces_profile_idx ON public.profile_provinces(profile_id);