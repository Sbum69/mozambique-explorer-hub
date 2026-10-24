-- DADOS-1: reference exchange rates for the currency converter (Useful info → Currency and payments).
-- * public.exchange_rates: one row per currency, units per 1 USD (USD, MZN, EUR, ZAR, GBP).
-- * Everyone may read; nobody may write through the API. Only refresh_exchange_rates() (SECURITY DEFINER,
--   executable by no API role) writes, and pg_cron runs it once a day.
-- * Source: open.er-api.com (ExchangeRate-API open access, free, no key, updated daily). The whole refresh
--   is all-or-nothing: a failed or incomplete response raises and keeps the previous rates untouched.

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

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

CREATE OR REPLACE FUNCTION public.refresh_exchange_rates()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  resp extensions.http_response;
  body jsonb;
  cur text;
  val numeric;
  stamp timestamptz;
  n integer := 0;
BEGIN
  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '10000');
  SELECT * INTO resp FROM extensions.http_get('https://open.er-api.com/v6/latest/USD');
  IF resp.status <> 200 THEN RAISE EXCEPTION 'RATES_HTTP_%', resp.status; END IF;
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
  RETURN n;
END $function$;

REVOKE ALL ON FUNCTION public.refresh_exchange_rates() FROM PUBLIC, anon, authenticated;

-- Daily at 01:30 UTC (03:30 in Maputo), after the provider's daily update.
SELECT cron.schedule('ekaya-refresh-exchange-rates', '30 1 * * *', $$SELECT public.refresh_exchange_rates()$$);
