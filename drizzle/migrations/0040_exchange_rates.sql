-- DADOS-1: reference exchange rates for the currency converter (Useful info → Currency and payments).
-- * public.exchange_rates: one row per currency, units per 1 USD (USD, MZN, EUR, ZAR, GBP).
-- * Everyone may read; nobody may write through the API. Only the SECURITY DEFINER functions below write,
--   and no API role may execute them.
-- * Source: open.er-api.com (ExchangeRate-API open access, free, no key, updated daily).
-- * Lovable Cloud only allows pg_net (asynchronous HTTP), so the refresh has two cron steps:
--   01:30 UTC request_exchange_rates() queues the request; 01:40 UTC apply_exchange_rates() validates the
--   response and updates the five rates all-or-nothing. Any failure keeps the previous rates untouched.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.exchange_rates (
  currency   text PRIMARY KEY CHECK (currency IN ('USD', 'MZN', 'EUR', 'ZAR', 'GBP')),
  per_usd    numeric(18, 8) NOT NULL CHECK (per_usd > 0),
  rate_date  timestamptz NOT NULL,
  source     text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exchange rates"
  ON public.exchange_rates FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.exchange_rates FROM anon, authenticated;
GRANT SELECT ON public.exchange_rates TO anon, authenticated;

-- Pending pg_net requests (internal: RLS on, no policies, no grants).
CREATE TABLE public.exchange_rate_requests (
  request_id   bigint PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  applied_at   timestamptz,
  outcome      text
);
ALTER TABLE public.exchange_rate_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exchange_rate_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_exchange_rates()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rid bigint;
BEGIN
  rid := net.http_get(url := 'https://open.er-api.com/v6/latest/USD', timeout_milliseconds := 10000);
  INSERT INTO public.exchange_rate_requests (request_id) VALUES (rid);
  RETURN rid;
END $function$;

CREATE OR REPLACE FUNCTION public.apply_exchange_rates()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req public.exchange_rate_requests;
  resp record;
  body jsonb;
  cur text;
  val numeric;
  stamp timestamptz;
  n integer := 0;
BEGIN
  SELECT * INTO req FROM public.exchange_rate_requests
   WHERE applied_at IS NULL AND requested_at > now() - interval '6 hours'
   ORDER BY requested_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT status_code, content, timed_out, error_msg INTO resp
    FROM net._http_response WHERE id = req.request_id;
  IF NOT FOUND THEN RETURN 0; END IF;  -- not answered yet; the next run retries

  BEGIN
    IF resp.timed_out OR resp.status_code IS DISTINCT FROM 200 THEN
      RAISE EXCEPTION 'RATES_HTTP_% %', resp.status_code, coalesce(resp.error_msg, '');
    END IF;
    body := resp.content::jsonb;
    IF body->>'result' IS DISTINCT FROM 'success' THEN RAISE EXCEPTION 'RATES_BAD_RESPONSE'; END IF;
    stamp := to_timestamp((body->>'time_last_update_unix')::bigint);
    FOREACH cur IN ARRAY ARRAY['USD', 'MZN', 'EUR', 'ZAR', 'GBP'] LOOP
      val := (body->'rates'->>cur)::numeric;
      IF val IS NULL OR val <= 0 THEN RAISE EXCEPTION 'RATES_MISSING_%', cur; END IF;
      INSERT INTO public.exchange_rates (currency, per_usd, rate_date, source, fetched_at)
      VALUES (cur, val, stamp, 'open.er-api.com (ExchangeRate-API)', now())
      ON CONFLICT (currency) DO UPDATE
        SET per_usd = EXCLUDED.per_usd, rate_date = EXCLUDED.rate_date,
            source = EXCLUDED.source, fetched_at = EXCLUDED.fetched_at;
      n := n + 1;
    END LOOP;
    UPDATE public.exchange_rate_requests SET applied_at = now(), outcome = 'ok' WHERE request_id = req.request_id;
  EXCEPTION WHEN OTHERS THEN
    -- The sub-block rolls back any partial upsert; previous rates stay as they were.
    UPDATE public.exchange_rate_requests SET applied_at = now(), outcome = left(SQLERRM, 200)
     WHERE request_id = req.request_id;
    RETURN -1;
  END;
  RETURN n;
END $function$;

REVOKE ALL ON FUNCTION public.request_exchange_rates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_exchange_rates() FROM PUBLIC, anon, authenticated;

-- 01:30 UTC (03:30 in Maputo) request, 01:40 apply, 02:10 retry the apply if the answer was late.
SELECT cron.schedule('ekaya-request-exchange-rates', '30 1 * * *', $$SELECT public.request_exchange_rates()$$);
SELECT cron.schedule('ekaya-apply-exchange-rates', '40 1 * * *', $$SELECT public.apply_exchange_rates()$$);
SELECT cron.schedule('ekaya-apply-exchange-rates-retry', '10 2 * * *', $$SELECT public.apply_exchange_rates()$$);
