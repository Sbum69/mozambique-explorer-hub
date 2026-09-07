-- 1. Enum booking_status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');

-- 2. Tabela bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  date date NOT NULL,
  "time" time NOT NULL,
  people integer NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  notes text,
  total_mzn numeric NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_people_min CHECK (people > 0),
  CONSTRAINT bookings_people_max CHECK (people <= 100),
  CONSTRAINT bookings_total_mzn_non_negative CHECK (total_mzn >= 0)
);

-- 3. Índices
CREATE INDEX bookings_business_id_idx ON public.bookings (business_id);
CREATE INDEX bookings_customer_id_idx ON public.bookings (customer_id);
CREATE INDEX bookings_experience_id_date_idx ON public.bookings (experience_id, date);
CREATE INDEX bookings_business_id_status_idx ON public.bookings (business_id, status);
CREATE INDEX bookings_date_idx ON public.bookings (date);

-- 4. Trigger updated_at (reutiliza set_updated_at existente)
CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Geração segura do código no servidor
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
BEGIN
  LOOP
    candidate := 'EK-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- 6/7. Validação de inserção: código, data e coerência experience/business
CREATE OR REPLACE FUNCTION public.bookings_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exp_business_id uuid;
BEGIN
  -- código sempre gerado pela BD, ignorando o que o cliente enviar
  NEW.code := public.generate_booking_code();

  -- reservas só no estado pending; apenas admin pode criar noutro estado
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.status := 'pending';
  END IF;

  IF NEW.date < current_date THEN
    RAISE EXCEPTION 'Booking date cannot be in the past';
  END IF;

  SELECT e.business_id INTO exp_business_id
  FROM public.experiences e
  WHERE e.id = NEW.experience_id;

  IF exp_business_id IS NULL THEN
    RAISE EXCEPTION 'Experience not found';
  END IF;

  IF NEW.business_id IS DISTINCT FROM exp_business_id THEN
    RAISE EXCEPTION 'business_id does not match the owner business of the selected experience';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_validate_insert
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_validate_insert();

-- 9/10. Guarda de update: apenas status alterável pelo business owner
CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- campos imutáveis para todos exceto admin
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.id := OLD.id;
    NEW.code := OLD.code;
    NEW.customer_id := OLD.customer_id;
    NEW.business_id := OLD.business_id;
    NEW.experience_id := OLD.experience_id;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  -- business owner: apenas status
  NEW.id := OLD.id;
  NEW.code := OLD.code;
  NEW.customer_id := OLD.customer_id;
  NEW.business_id := OLD.business_id;
  NEW.experience_id := OLD.experience_id;
  NEW.date := OLD.date;
  NEW."time" := OLD."time";
  NEW.people := OLD.people;
  NEW.customer_name := OLD.customer_name;
  NEW.customer_phone := OLD.customer_phone;
  NEW.customer_email := OLD.customer_email;
  NEW.notes := OLD.notes;
  NEW.total_mzn := OLD.total_mzn;
  NEW.created_at := OLD.created_at;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('confirmed'::public.booking_status,
                            'rejected'::public.booking_status,
                            'completed'::public.booking_status) THEN
    RAISE EXCEPTION 'Business owners can only set status to confirmed, rejected or completed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_guard_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();

-- 11. Grants (least privilege)
REVOKE ALL ON public.bookings FROM anon;
REVOKE ALL ON public.bookings FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- 8. RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own bookings"
ON public.bookings FOR SELECT TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Customers can create own bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid() AND status = 'pending'::public.booking_status);

CREATE POLICY "Business owners can view bookings of own businesses"
ON public.bookings FOR SELECT TO authenticated
USING (public.owns_business(business_id));

CREATE POLICY "Business owners can update bookings of own businesses"
ON public.bookings FOR UPDATE TO authenticated
USING (public.owns_business(business_id))
WITH CHECK (public.owns_business(business_id));

CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));