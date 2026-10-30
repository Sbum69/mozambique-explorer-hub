-- M1: commission engine (no charging: there is no online payment yet).
-- * commercial_configs: versioned commercial settings (append-only). The latest row is in force.
--   Commission, Founding Partner rules and the prices of highlights and the Partner plan live here,
--   never in the code. Money in centavos (bigint), rates in basis points (1% = 100 bp).
-- * business_commercial_terms: Founding Partner status per business (set by the admin).
-- * commission_split: the one rounding rule (half up, to the centavo); net takes the remainder.
-- * booking_commission_snapshots: price, commission, estimated provider fee and net, frozen when a
--   booking is created (trigger). Nobody writes them from the browser.
-- * admin_audit: append-only log of commercial changes.
-- No changes to existing tables, data or policies.

-- ---------------------------------------------------------------------------------------------
-- Audit (append-only)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users (id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON public.admin_audit (created_at DESC);
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit TO authenticated;
CREATE POLICY "Admins read the audit log" ON public.admin_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY: %', TG_TABLE_NAME;
END;
$function$;
CREATE TRIGGER admin_audit_append_only BEFORE UPDATE OR DELETE ON public.admin_audit
  FOR EACH ROW EXECUTE FUNCTION public.append_only();

-- ---------------------------------------------------------------------------------------------
-- Commercial settings (versioned)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.commercial_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int GENERATED ALWAYS AS IDENTITY UNIQUE,
  commission_bp int NOT NULL CHECK (commission_bp BETWEEN 0 AND 5000),
  founder_commission_bp int NOT NULL CHECK (founder_commission_bp BETWEEN 0 AND 5000),
  founder_months int NOT NULL CHECK (founder_months BETWEEN 0 AND 60),
  founder_cap int NOT NULL CHECK (founder_cap BETWEEN 0 AND 1000),
  founder_free_highlights int NOT NULL DEFAULT 1 CHECK (founder_free_highlights BETWEEN 0 AND 12),
  -- Estimated payment provider fee shown to businesses; 0 while there is no online payment.
  provider_fee_bp int NOT NULL DEFAULT 0 CHECK (provider_fee_bp BETWEEN 0 AND 2000),
  highlight_week_cents bigint NOT NULL CHECK (highlight_week_cents >= 0),
  highlight_month_cents bigint NOT NULL CHECK (highlight_month_cents >= 0),
  plan_month_cents bigint NOT NULL CHECK (plan_month_cents >= 0),
  note text,
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commercial_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_configs FROM PUBLIC, anon, authenticated;
-- Prices and rates are public information (pricing page, sign-up); only RPCs write.
GRANT SELECT ON public.commercial_configs TO anon, authenticated;
CREATE POLICY "Anyone reads commercial settings" ON public.commercial_configs
  FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER commercial_configs_append_only BEFORE UPDATE OR DELETE ON public.commercial_configs
  FOR EACH ROW EXECUTE FUNCTION public.append_only();

-- First version: decisions of 30/10/2026 (10%; Founders 0% for 6 months, first 20; highlight
-- 500 MT/week or 1 500 MT/month, the first one free for Founders; Partner plan 750 MT/month).
INSERT INTO public.commercial_configs (commission_bp, founder_commission_bp, founder_months, founder_cap,
  founder_free_highlights, provider_fee_bp, highlight_week_cents, highlight_month_cents, plan_month_cents, note)
VALUES (1000, 0, 6, 20, 1, 0, 50000, 150000, 75000, 'Decisões de 30/10/2026 (valores iniciais, hipótese a testar no piloto)');

CREATE OR REPLACE FUNCTION public.current_commercial_config()
 RETURNS public.commercial_configs
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT * FROM public.commercial_configs ORDER BY version DESC LIMIT 1; $function$;
GRANT EXECUTE ON FUNCTION public.current_commercial_config() TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Founding Partners
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.business_commercial_terms (
  business_id uuid PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  founder_since timestamptz,
  founder_until timestamptz,
  free_highlights_used int NOT NULL DEFAULT 0 CHECK (free_highlights_used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founder_period CHECK (founder_until IS NULL OR founder_since IS NULL OR founder_until >= founder_since)
);
ALTER TABLE public.business_commercial_terms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_commercial_terms FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.business_commercial_terms TO authenticated;
CREATE POLICY "Owners read own commercial terms" ON public.business_commercial_terms
  FOR SELECT TO authenticated USING (public.owns_business(business_id));
CREATE POLICY "Admins read all commercial terms" ON public.business_commercial_terms
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.is_founder(_business_id uuid, _at timestamptz DEFAULT now())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.business_commercial_terms t
                  WHERE t.business_id = _business_id AND t.founder_since IS NOT NULL
                    AND t.founder_since <= _at AND (t.founder_until IS NULL OR t.founder_until > _at));
$function$;
REVOKE ALL ON FUNCTION public.is_founder(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_founder(uuid, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Rounding: half up to the centavo; the net takes the remainder, so gross = commission + fee + net.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commission_split(_gross_cents bigint, _commission_bp int, _fee_bp int)
 RETURNS TABLE (commission_cents bigint, provider_fee_cents bigint, net_cents bigint)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  WITH c AS (
    SELECT (_gross_cents * _commission_bp + 5000) / 10000 AS commission,
           (_gross_cents * _fee_bp + 5000) / 10000 AS fee
  )
  SELECT c.commission, c.fee, _gross_cents - c.commission - c.fee FROM c;
$function$;
GRANT EXECUTE ON FUNCTION public.commission_split(bigint, int, int) TO anon, authenticated;

-- Quote for a business and a price (what the adhesion screen and the panel show).
CREATE OR REPLACE FUNCTION public.commission_quote(_business_id uuid, _gross_cents bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cfg public.commercial_configs := public.current_commercial_config(); founder boolean; bp int; s record;
BEGIN
  IF _gross_cents IS NULL OR _gross_cents < 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  founder := _business_id IS NOT NULL AND public.is_founder(_business_id);
  bp := CASE WHEN founder THEN cfg.founder_commission_bp ELSE cfg.commission_bp END;
  SELECT * INTO s FROM public.commission_split(_gross_cents, bp, cfg.provider_fee_bp);
  RETURN jsonb_build_object('config_version', cfg.version, 'founder', founder, 'commission_bp', bp,
    'provider_fee_bp', cfg.provider_fee_bp, 'gross_cents', _gross_cents, 'commission_cents', s.commission_cents,
    'provider_fee_cents', s.provider_fee_cents, 'net_cents', s.net_cents,
    'deducted_cents', s.commission_cents + s.provider_fee_cents);
END;
$function$;
REVOKE ALL ON FUNCTION public.commission_quote(uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commission_quote(uuid, bigint) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Snapshot per booking (frozen at creation)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.booking_commission_snapshots (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings (id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  config_version int NOT NULL,
  founder boolean NOT NULL,
  gross_cents bigint NOT NULL CHECK (gross_cents >= 0),
  commission_bp int NOT NULL,
  commission_cents bigint NOT NULL CHECK (commission_cents >= 0),
  provider_fee_bp int NOT NULL,
  provider_fee_cents bigint NOT NULL CHECK (provider_fee_cents >= 0),
  net_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT snapshot_reconciles CHECK (gross_cents = commission_cents + provider_fee_cents + net_cents)
);
CREATE INDEX booking_commission_snapshots_business_idx ON public.booking_commission_snapshots (business_id, created_at);
ALTER TABLE public.booking_commission_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_commission_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booking_commission_snapshots TO authenticated;
CREATE POLICY "Owners read own booking snapshots" ON public.booking_commission_snapshots
  FOR SELECT TO authenticated USING (public.owns_business(business_id));
CREATE POLICY "Admins read all booking snapshots" ON public.booking_commission_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER booking_commission_snapshots_append_only BEFORE UPDATE ON public.booking_commission_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.append_only();

CREATE OR REPLACE FUNCTION public.bookings_commission_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q jsonb;
BEGIN
  -- total_mzn was set on the server by commercial_booking_guard (price × people).
  q := public.commission_quote(NEW.business_id, round(coalesce(NEW.total_mzn, 0) * 100)::bigint);
  INSERT INTO public.booking_commission_snapshots (booking_id, business_id, config_version, founder, gross_cents,
    commission_bp, commission_cents, provider_fee_bp, provider_fee_cents, net_cents)
  VALUES (NEW.id, NEW.business_id, (q ->> 'config_version')::int, (q ->> 'founder')::boolean,
    (q ->> 'gross_cents')::bigint, (q ->> 'commission_bp')::int, (q ->> 'commission_cents')::bigint,
    (q ->> 'provider_fee_bp')::int, (q ->> 'provider_fee_cents')::bigint, (q ->> 'net_cents')::bigint);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.bookings_commission_snapshot() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bookings_commission_snapshot_trg AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_commission_snapshot();

-- ---------------------------------------------------------------------------------------------
-- Admin RPCs (audited)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_commercial_config(
  _commission_bp int, _founder_commission_bp int, _founder_months int, _founder_cap int,
  _founder_free_highlights int, _provider_fee_bp int, _highlight_week_cents bigint,
  _highlight_month_cents bigint, _plan_month_cents bigint, _reason text)
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE before public.commercial_configs := public.current_commercial_config(); v int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  INSERT INTO public.commercial_configs (commission_bp, founder_commission_bp, founder_months, founder_cap,
    founder_free_highlights, provider_fee_bp, highlight_week_cents, highlight_month_cents, plan_month_cents, note, created_by)
  VALUES (_commission_bp, _founder_commission_bp, _founder_months, _founder_cap, _founder_free_highlights,
    _provider_fee_bp, _highlight_week_cents, _highlight_month_cents, _plan_month_cents, left(btrim(_reason), 1000), auth.uid())
  RETURNING version INTO v;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
  VALUES (auth.uid(), 'commercial_config.set', 'commercial_configs', v::text, to_jsonb(before),
          to_jsonb(public.current_commercial_config()), left(btrim(_reason), 1000));
  RETURN v;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_commercial_config(int, int, int, int, int, int, bigint, bigint, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_commercial_config(int, int, int, int, int, int, bigint, bigint, bigint, text) TO authenticated;

-- Founding Partner on/off. On: from now, for founder_months, within founder_cap active Founders.
CREATE OR REPLACE FUNCTION public.admin_set_founder(_business_id uuid, _founder boolean, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cfg public.commercial_configs := public.current_commercial_config(); before jsonb; n int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT to_jsonb(t) INTO before FROM public.business_commercial_terms t WHERE t.business_id = _business_id;
  IF _founder THEN
    IF public.is_founder(_business_id) THEN RAISE EXCEPTION 'ALREADY_FOUNDER'; END IF;
    -- Every business that was ever a Founder counts towards "the first N".
    SELECT count(*) INTO n FROM public.business_commercial_terms WHERE founder_since IS NOT NULL;
    IF n >= cfg.founder_cap THEN RAISE EXCEPTION 'FOUNDER_CAP_REACHED'; END IF;
    INSERT INTO public.business_commercial_terms (business_id, founder_since, founder_until, updated_at)
    VALUES (_business_id, now(), now() + make_interval(months => cfg.founder_months), now())
    ON CONFLICT (business_id) DO UPDATE
      SET founder_since = excluded.founder_since, founder_until = excluded.founder_until, updated_at = now();
  ELSE
    UPDATE public.business_commercial_terms SET founder_until = now(), updated_at = now()
     WHERE business_id = _business_id AND public.is_founder(_business_id);
  END IF;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
  SELECT auth.uid(), CASE WHEN _founder THEN 'founder.on' ELSE 'founder.off' END, 'business_commercial_terms',
         _business_id::text, before, to_jsonb(t), left(btrim(_reason), 1000)
    FROM public.business_commercial_terms t WHERE t.business_id = _business_id;
  RETURN (SELECT to_jsonb(t) FROM public.business_commercial_terms t WHERE t.business_id = _business_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_founder(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_founder(uuid, boolean, text) TO authenticated;
