-- M6: sponsored highlights and campaigns, paid manually (M-Pesa) until there is a payment provider.
-- * commercial_configs gets the slots per scope and the per-page limit (prices already live there).
-- * manual_payment_configs: M-Pesa number and instructions, versioned (append-only), read by signed-in users.
-- * sponsored_placements: requests from businesses. Status flow:
--     requested -> awaiting_payment (or paid when free) -> paid -> active -> expired
--     requested / awaiting_payment -> rejected (admin, reason) or cancelled (owner or admin, reason)
--   Price, reference, status and dates are set only by the RPCs below; nobody writes from the browser.
-- * active_sponsored(): what the public app shows, limited per page, never mixed into organic results.
-- * sponsored_placements_tick(): pg_cron activates and expires placements every day.
-- Notifications reuse public.notifications; admin actions go to admin_audit.

ALTER TABLE public.commercial_configs
  ADD COLUMN sponsored_slots_per_scope int NOT NULL DEFAULT 3 CHECK (sponsored_slots_per_scope BETWEEN 0 AND 50),
  ADD COLUMN sponsored_per_page int NOT NULL DEFAULT 2 CHECK (sponsored_per_page BETWEEN 0 AND 10);

-- A new commercial version keeps the sponsored limits in force; they change only through
-- admin_set_sponsored_limits (also a new version, with a reason).
CREATE OR REPLACE FUNCTION public.admin_set_commercial_config(_commission_bp integer, _founder_commission_bp integer,
  _founder_months integer, _founder_cap integer, _founder_free_highlights integer, _provider_fee_bp integer,
  _highlight_week_cents bigint, _highlight_month_cents bigint, _plan_month_cents bigint, _reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE before public.commercial_configs := public.current_commercial_config(); v int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  INSERT INTO public.commercial_configs (commission_bp, founder_commission_bp, founder_months, founder_cap,
    founder_free_highlights, provider_fee_bp, highlight_week_cents, highlight_month_cents, plan_month_cents,
    sponsored_slots_per_scope, sponsored_per_page, note, created_by)
  VALUES (_commission_bp, _founder_commission_bp, _founder_months, _founder_cap, _founder_free_highlights,
    _provider_fee_bp, _highlight_week_cents, _highlight_month_cents, _plan_month_cents,
    before.sponsored_slots_per_scope, before.sponsored_per_page, left(btrim(_reason), 1000), auth.uid())
  RETURNING version INTO v;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
  VALUES (auth.uid(), 'commercial_config.set', 'commercial_configs', v::text, to_jsonb(before),
          to_jsonb(public.current_commercial_config()), left(btrim(_reason), 1000));
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_sponsored_limits(_slots_per_scope integer, _per_page integer, _reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE before public.commercial_configs := public.current_commercial_config(); v int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  INSERT INTO public.commercial_configs (commission_bp, founder_commission_bp, founder_months, founder_cap,
    founder_free_highlights, provider_fee_bp, highlight_week_cents, highlight_month_cents, plan_month_cents,
    sponsored_slots_per_scope, sponsored_per_page, note, created_by)
  VALUES (before.commission_bp, before.founder_commission_bp, before.founder_months, before.founder_cap,
    before.founder_free_highlights, before.provider_fee_bp, before.highlight_week_cents, before.highlight_month_cents,
    before.plan_month_cents, _slots_per_scope, _per_page, left(btrim(_reason), 1000), auth.uid())
  RETURNING version INTO v;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
  VALUES (auth.uid(), 'sponsored_limits.set', 'commercial_configs', v::text, to_jsonb(before),
          to_jsonb(public.current_commercial_config()), left(btrim(_reason), 1000));
  RETURN v;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_sponsored_limits(integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_sponsored_limits(integer, integer, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Manual payment instructions (versioned)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.manual_payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int GENERATED ALWAYS AS IDENTITY UNIQUE,
  mpesa_number text NOT NULL CHECK (mpesa_number ~ '^\+?[0-9 ]{9,16}$'),
  account_name text NOT NULL CHECK (char_length(btrim(account_name)) BETWEEN 2 AND 120),
  instructions_pt text NOT NULL CHECK (char_length(btrim(instructions_pt)) BETWEEN 10 AND 1000),
  instructions_en text NOT NULL CHECK (char_length(btrim(instructions_en)) BETWEEN 10 AND 1000),
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_payment_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_payment_configs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.manual_payment_configs TO authenticated;
CREATE POLICY "Signed-in users read payment instructions" ON public.manual_payment_configs
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER manual_payment_configs_append_only BEFORE UPDATE OR DELETE ON public.manual_payment_configs
  FOR EACH ROW EXECUTE FUNCTION public.append_only();

CREATE OR REPLACE FUNCTION public.admin_set_manual_payment(_mpesa_number text, _account_name text,
  _instructions_pt text, _instructions_en text, _reason text)
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  INSERT INTO public.manual_payment_configs (mpesa_number, account_name, instructions_pt, instructions_en, created_by)
  VALUES (btrim(_mpesa_number), btrim(_account_name), btrim(_instructions_pt), btrim(_instructions_en), auth.uid())
  RETURNING version INTO v;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, after, reason)
  VALUES (auth.uid(), 'manual_payment.set', 'manual_payment_configs', v::text,
          jsonb_build_object('mpesa_number', btrim(_mpesa_number), 'account_name', btrim(_account_name)), left(btrim(_reason), 1000));
  RETURN v;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_manual_payment(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_manual_payment(text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Placements
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.sponsored_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  experience_id uuid REFERENCES public.experiences (id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('highlight', 'campaign')),
  campaign_type text CHECK (campaign_type IN ('dish', 'product', 'event', 'experience')),
  title_pt text CHECK (title_pt IS NULL OR char_length(btrim(title_pt)) BETWEEN 2 AND 80),
  title_en text CHECK (title_en IS NULL OR char_length(btrim(title_en)) BETWEEN 2 AND 80),
  body_pt text CHECK (body_pt IS NULL OR char_length(btrim(body_pt)) <= 280),
  body_en text CHECK (body_en IS NULL OR char_length(btrim(body_en)) <= 280),
  scope text NOT NULL CHECK (scope IN ('home', 'province', 'category')),
  province_id uuid REFERENCES public.provinces (id),
  category_code text REFERENCES public.business_categories (code),
  duration text NOT NULL CHECK (duration IN ('week', 'month')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  free boolean NOT NULL DEFAULT false,
  config_version int NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'awaiting_payment', 'paid', 'active', 'expired', 'rejected', 'cancelled')),
  decision_reason text,
  payment_note text,
  requested_by uuid REFERENCES auth.users (id),
  paid_at timestamptz,
  paid_marked_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT placement_dates CHECK (ends_on > starts_on),
  CONSTRAINT placement_scope_target CHECK (
    (scope = 'home' AND province_id IS NULL AND category_code IS NULL)
    OR (scope = 'province' AND province_id IS NOT NULL AND category_code IS NULL)
    OR (scope = 'category' AND category_code IS NOT NULL AND province_id IS NULL)),
  CONSTRAINT placement_campaign CHECK (
    (kind = 'highlight' AND campaign_type IS NULL)
    OR (kind = 'campaign' AND campaign_type IS NOT NULL AND title_pt IS NOT NULL AND title_en IS NOT NULL))
);
CREATE INDEX sponsored_placements_business_idx ON public.sponsored_placements (business_id, created_at DESC);
CREATE INDEX sponsored_placements_status_idx ON public.sponsored_placements (status, starts_on, ends_on);
ALTER TABLE public.sponsored_placements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sponsored_placements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.sponsored_placements TO authenticated;
CREATE POLICY "Owners read own placements" ON public.sponsored_placements
  FOR SELECT TO authenticated USING (public.owns_business(business_id));
CREATE POLICY "Admins read all placements" ON public.sponsored_placements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Notify the owner (and, for new requests, every admin). Never blocks the change.
CREATE OR REPLACE FUNCTION public.sponsored_notify(_p public.sponsored_placements, _to_admins boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE owner uuid; t_pt text; t_en text; b_pt text; b_en text;
BEGIN
  SELECT owner_id INTO owner FROM public.businesses WHERE id = _p.business_id;
  t_pt := CASE _p.status
    WHEN 'requested' THEN 'Pedido de destaque recebido' WHEN 'awaiting_payment' THEN 'Destaque aprovado: falta o pagamento'
    WHEN 'paid' THEN 'Pagamento do destaque confirmado' WHEN 'active' THEN 'Destaque ativo'
    WHEN 'expired' THEN 'Destaque terminado' WHEN 'rejected' THEN 'Destaque não aprovado' ELSE 'Destaque cancelado' END;
  t_en := CASE _p.status
    WHEN 'requested' THEN 'Highlight request received' WHEN 'awaiting_payment' THEN 'Highlight approved: payment pending'
    WHEN 'paid' THEN 'Highlight payment confirmed' WHEN 'active' THEN 'Highlight active'
    WHEN 'expired' THEN 'Highlight ended' WHEN 'rejected' THEN 'Highlight not approved' ELSE 'Highlight cancelled' END;
  b_pt := 'Referência ' || _p.reference || ', de ' || to_char(_p.starts_on, 'DD/MM/YYYY') || ' a ' || to_char(_p.ends_on, 'DD/MM/YYYY') || '.'
          || COALESCE(' Motivo: ' || NULLIF(_p.decision_reason, ''), '');
  b_en := 'Reference ' || _p.reference || ', from ' || to_char(_p.starts_on, 'DD/MM/YYYY') || ' to ' || to_char(_p.ends_on, 'DD/MM/YYYY') || '.'
          || COALESCE(' Reason: ' || NULLIF(_p.decision_reason, ''), '');
  IF owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
    VALUES (owner, 'business', t_pt, t_en, b_pt, b_en, '/business-dashboard');
  END IF;
  IF _to_admins THEN
    INSERT INTO public.notifications (user_id, type, title_pt, title_en, body_pt, body_en, link)
    SELECT ur.user_id, 'business', 'Novo pedido de destaque', 'New highlight request', b_pt, b_en, '/admin'
      FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.sponsored_notify(public.sponsored_placements, boolean) FROM PUBLIC, anon, authenticated;

-- Business owner requests a placement. Price from the commercial settings in force.
CREATE OR REPLACE FUNCTION public.request_sponsored_placement(
  _business_id uuid, _kind text, _campaign_type text, _scope text, _province_id uuid, _category_code text,
  _duration text, _starts_on date, _experience_id uuid, _title_pt text, _title_en text, _body_pt text, _body_en text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE cfg public.commercial_configs := public.current_commercial_config(); p public.sponsored_placements;
  price bigint; is_free boolean := false; used int; ends date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.owns_business(_business_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND status = 'approved') THEN
    RAISE EXCEPTION 'BUSINESS_NOT_APPROVED';
  END IF;
  IF _starts_on IS NULL OR _starts_on < (now() AT TIME ZONE 'Africa/Maputo')::date THEN RAISE EXCEPTION 'INVALID_START'; END IF;
  IF _experience_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.experiences WHERE id = _experience_id AND business_id = _business_id) THEN
    RAISE EXCEPTION 'INVALID_EXPERIENCE';
  END IF;
  IF _duration = 'week' THEN price := cfg.highlight_week_cents; ends := _starts_on + 7;
  ELSIF _duration = 'month' THEN price := cfg.highlight_month_cents; ends := (_starts_on + interval '1 month')::date;
  ELSE RAISE EXCEPTION 'INVALID_DURATION'; END IF;
  -- Founding Partners: the first placements are free, up to founder_free_highlights.
  IF public.is_founder(_business_id) THEN
    SELECT coalesce(free_highlights_used, 0) INTO used FROM public.business_commercial_terms WHERE business_id = _business_id;
    IF coalesce(used, 0) + (SELECT count(*) FROM public.sponsored_placements s
         WHERE s.business_id = _business_id AND s.free AND s.status IN ('requested', 'awaiting_payment')) < cfg.founder_free_highlights THEN
      is_free := true;
    END IF;
  END IF;
  INSERT INTO public.sponsored_placements (reference, business_id, experience_id, kind, campaign_type, title_pt, title_en,
    body_pt, body_en, scope, province_id, category_code, duration, starts_on, ends_on, price_cents, free, config_version,
    status, requested_by)
  VALUES ('EKD-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)), _business_id, _experience_id, _kind,
    nullif(_campaign_type, ''), nullif(btrim(coalesce(_title_pt, '')), ''), nullif(btrim(coalesce(_title_en, '')), ''),
    nullif(btrim(coalesce(_body_pt, '')), ''), nullif(btrim(coalesce(_body_en, '')), ''), _scope, _province_id,
    nullif(_category_code, ''), _duration, _starts_on, ends, CASE WHEN is_free THEN 0 ELSE price END, is_free,
    cfg.version, 'requested', auth.uid())
  RETURNING * INTO p;
  PERFORM public.sponsored_notify(p, true);
  RETURN to_jsonb(p);
END;
$function$;
REVOKE ALL ON FUNCTION public.request_sponsored_placement(uuid, text, text, text, uuid, text, text, date, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_sponsored_placement(uuid, text, text, text, uuid, text, text, date, uuid, text, text, text, text) TO authenticated;

-- Activates paid placements whose start has come and expires finished ones. Returns rows changed.
CREATE OR REPLACE FUNCTION public.sponsored_placements_tick()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.sponsored_placements; n int := 0; today date := (now() AT TIME ZONE 'Africa/Maputo')::date;
BEGIN
  FOR p IN UPDATE public.sponsored_placements SET status = 'active', updated_at = now()
            WHERE status = 'paid' AND starts_on <= today AND ends_on > today RETURNING * LOOP
    PERFORM public.sponsored_notify(p, false); n := n + 1;
  END LOOP;
  FOR p IN UPDATE public.sponsored_placements SET status = 'expired', updated_at = now()
            WHERE status IN ('active', 'paid') AND ends_on <= today RETURNING * LOOP
    PERFORM public.sponsored_notify(p, false); n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.sponsored_placements_tick() FROM PUBLIC, anon, authenticated;

-- Admin decisions: approve (-> awaiting_payment, or paid when free), reject or cancel with a reason,
-- or mark as paid. Approval checks the slots per scope for the same dates.
CREATE OR REPLACE FUNCTION public.admin_decide_placement(_id uuid, _decision text, _reason text DEFAULT NULL, _payment_note text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cfg public.commercial_configs := public.current_commercial_config(); p public.sponsored_placements; before jsonb; taken int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO p FROM public.sponsored_placements WHERE id = _id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  before := to_jsonb(p);
  IF _decision = 'approve' THEN
    IF p.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
    SELECT count(*) INTO taken FROM public.sponsored_placements s
     WHERE s.id <> p.id AND s.scope = p.scope
       AND s.province_id IS NOT DISTINCT FROM p.province_id AND s.category_code IS NOT DISTINCT FROM p.category_code
       AND s.status IN ('awaiting_payment', 'paid', 'active')
       AND s.starts_on < p.ends_on AND s.ends_on > p.starts_on;
    IF taken >= cfg.sponsored_slots_per_scope THEN RAISE EXCEPTION 'NO_SLOTS'; END IF;
    UPDATE public.sponsored_placements
       SET status = CASE WHEN free THEN 'paid' ELSE 'awaiting_payment' END,
           paid_at = CASE WHEN free THEN now() END, decision_reason = NULL, updated_at = now()
     WHERE id = p.id RETURNING * INTO p;
    IF p.free THEN
      UPDATE public.business_commercial_terms SET free_highlights_used = free_highlights_used + 1, updated_at = now()
       WHERE business_id = p.business_id;
    END IF;
  ELSIF _decision = 'paid' THEN
    IF p.status <> 'awaiting_payment' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
    IF _payment_note IS NULL OR btrim(_payment_note) = '' THEN RAISE EXCEPTION 'PAYMENT_NOTE_REQUIRED'; END IF;
    UPDATE public.sponsored_placements SET status = 'paid', paid_at = now(), paid_marked_by = auth.uid(),
           payment_note = left(btrim(_payment_note), 500), updated_at = now()
     WHERE id = p.id RETURNING * INTO p;
  ELSIF _decision IN ('reject', 'cancel') THEN
    IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
    IF (_decision = 'reject' AND p.status <> 'requested')
       OR (_decision = 'cancel' AND p.status NOT IN ('requested', 'awaiting_payment', 'paid', 'active')) THEN
      RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;
    UPDATE public.sponsored_placements SET status = CASE WHEN _decision = 'reject' THEN 'rejected' ELSE 'cancelled' END,
           decision_reason = left(btrim(_reason), 1000), updated_at = now()
     WHERE id = p.id RETURNING * INTO p;
  ELSE
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, before, after, reason)
  VALUES (auth.uid(), 'placement.' || _decision, 'sponsored_placements', p.id::text, before, to_jsonb(p),
          coalesce(nullif(btrim(coalesce(_reason, '')), ''), nullif(btrim(coalesce(_payment_note, '')), '')));
  PERFORM public.sponsored_notify(p, false);
  -- A paid placement whose start has come becomes active right away.
  PERFORM public.sponsored_placements_tick();
  SELECT * INTO p FROM public.sponsored_placements WHERE id = _id;
  RETURN to_jsonb(p);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_decide_placement(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_placement(uuid, text, text, text) TO authenticated;

-- The owner cancels a request that is not paid yet.
CREATE OR REPLACE FUNCTION public.cancel_my_placement(_id uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.sponsored_placements;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO p FROM public.sponsored_placements WHERE id = _id FOR UPDATE;
  IF p.id IS NULL OR NOT public.owns_business(p.business_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p.status NOT IN ('requested', 'awaiting_payment') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  UPDATE public.sponsored_placements SET status = 'cancelled', decision_reason = left(btrim(_reason), 1000), updated_at = now()
   WHERE id = p.id RETURNING * INTO p;
  PERFORM public.sponsored_notify(p, false);
END;
$function$;
REVOKE ALL ON FUNCTION public.cancel_my_placement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_placement(uuid, text) TO authenticated;

-- What the public app shows: active placements for one scope, at most sponsored_per_page.
-- Only public fields; the order changes every day so no placement is always first.
CREATE OR REPLACE FUNCTION public.active_sponsored(_scope text, _province_id uuid DEFAULT NULL, _category_code text DEFAULT NULL)
 RETURNS TABLE (id uuid, business_id uuid, business_name text, experience_id uuid, kind text, campaign_type text,
                title_pt text, title_en text, body_pt text, body_en text, ends_on date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.business_id, b.name, s.experience_id, s.kind, s.campaign_type, s.title_pt, s.title_en, s.body_pt, s.body_en, s.ends_on
    FROM public.sponsored_placements s
    JOIN public.businesses b ON b.id = s.business_id AND b.status = 'approved'
   WHERE s.status = 'active' AND s.scope = _scope
     AND (_scope <> 'province' OR s.province_id = _province_id)
     AND (_scope <> 'category' OR s.category_code = _category_code)
   ORDER BY md5(s.id::text || current_date::text)
   LIMIT (SELECT sponsored_per_page FROM public.current_commercial_config());
$function$;
REVOKE ALL ON FUNCTION public.active_sponsored(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_sponsored(text, uuid, text) TO anon, authenticated;

-- Daily at 00:20 Mozambique time (22:20 UTC).
DO $$
BEGIN
  PERFORM cron.schedule('ekaya-sponsored-tick', '20 22 * * *', 'SELECT public.sponsored_placements_tick()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%): schedule public.sponsored_placements_tick() elsewhere', SQLERRM;
END $$;
