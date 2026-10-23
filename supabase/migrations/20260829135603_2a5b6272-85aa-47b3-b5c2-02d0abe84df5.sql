CREATE TYPE public.business_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text,
  category text,
  province text,
  location jsonb,
  description text,
  contact jsonb,
  images text[],
  status public.business_status NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX businesses_owner_id_idx ON public.businesses (owner_id);
CREATE INDEX businesses_province_idx ON public.businesses (province);
CREATE INDEX businesses_status_idx ON public.businesses (status);

CREATE TRIGGER businesses_set_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Server-side guard: non-admins can never change owner_id, status or verified
CREATE OR REPLACE FUNCTION public.businesses_guard_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.verified := false;
    RETURN NEW;
  END IF;

  NEW.owner_id := OLD.owner_id;
  NEW.status := OLD.status;
  NEW.verified := OLD.verified;
  RETURN NEW;
END;
$$;

CREATE TRIGGER businesses_guard_privileged_fields
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.businesses_guard_privileged_fields();

GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved businesses"
ON public.businesses FOR SELECT TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "Owners can view own businesses"
ON public.businesses FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all businesses"
ON public.businesses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can create own businesses"
ON public.businesses FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND status = 'pending'
  AND verified = false
);

CREATE POLICY "Owners can update own businesses"
ON public.businesses FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  AND verified = false
  AND status = 'pending'
);

CREATE POLICY "Admins can update all businesses"
ON public.businesses FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));