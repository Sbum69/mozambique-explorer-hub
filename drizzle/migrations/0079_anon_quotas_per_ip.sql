-- 0079 — Quotas por IP nas escritas anónimas (PROPOSTA, não aplicada).
--
-- PORQUÊ (docs/security/QUOTAS-ANONIMOS.md)
--   log_app_error, assistant_log_unanswered e assistant_rate_answer só têm um teto "no total" por
--   dia (2 000 / 500 / 2 000). Um só visitante pode gastá-lo e calar os registos de todos nesse dia.
--   Estas RPCs são chamadas pelo browser diretamente à API da Supabase, sem passar pelo servidor da
--   app: o limite por IP só pode viver na BD (por isso é uma migração).
--
-- O QUE MUDA
--   1. Tabela public.anon_quota (função, hash do IP do dia, dia, contador). Sem IP guardado: só
--      sha256(ip | dia | sal), como em submit_business_lead (0055). Sem grants a anon/authenticated.
--   2. public.anon_quota_take(_key, _limit): soma 1 e diz se ainda está dentro do limite. Sem
--      EXECUTE para anon/authenticated (só as funções SECURITY DEFINER abaixo a chamam).
--   3. As três funções ganham o limite por IP, DEPOIS do teto total e com o mesmo comportamento
--      quando passa (não grava, sem erro para o visitante):
--        - log_app_error: 50 por dia por IP;
--        - assistant_log_unanswered: 20 por dia por IP;
--        - assistant_rate_answer: 50 por dia por IP e 1 por resposta (slug) por dia por IP.
--      O resto do corpo é igual à 0057 / 0056 (máscaras de dados pessoais, tetos totais).
--   4. Limpeza diária (pg_cron, 01:20 UTC): apaga contadores com mais de 2 dias.
--
-- VALORES [DECIDIR]: propostas de docs/security/QUOTAS-ANONIMOS.md, não medições. Com CGNAT (muitos
-- telemóveis no mesmo IP), um limite baixo cala uma rede inteira: estes limites só afetam registos
-- de erro e do assistente, nunca o uso da app.
--
-- RISCO
--   - request_ip() devolve 'unknown' se o gateway não enviar cf-connecting-ip nem x-forwarded-for:
--     todos os pedidos assim partilham um contador. [CONFIRMAR] na produção que o cabeçalho chega
--     (o guião de teste mostra o valor).
--   - Uma escrita a mais por pedido (o contador): volume baixo (estes registos são raros).
--
-- COMO REVERTER
--   Correr de novo as definições de log_app_error (0057) e de assistant_log_unanswered e
--   assistant_rate_answer (0056); depois:
--   SELECT cron.unschedule('ekaya-anon-quota-purge');
--   DROP FUNCTION IF EXISTS public.anon_quota_purge(); DROP FUNCTION IF EXISTS public.anon_quota_take(text, int);
--   DROP TABLE IF EXISTS public.anon_quota;
--
-- Teste: docs/security/testes/0079_anon_quotas.sql

CREATE TABLE IF NOT EXISTS public.anon_quota (
  key text NOT NULL CHECK (char_length(key) BETWEEN 1 AND 100),
  ip_day_hash text NOT NULL,
  day date NOT NULL DEFAULT current_date,
  n int NOT NULL DEFAULT 0 CHECK (n >= 0),
  PRIMARY KEY (key, ip_day_hash, day)
);
ALTER TABLE public.anon_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anon_quota FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.anon_quota_take(_key text, _limit int)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE h text := encode(digest(public.request_ip() || '|' || current_date::text || '|ekaya-quota', 'sha256'), 'hex');
  used int;
BEGIN
  INSERT INTO public.anon_quota AS q (key, ip_day_hash, day, n) VALUES (left(_key, 100), h, current_date, 1)
  ON CONFLICT (key, ip_day_hash, day) DO UPDATE SET n = q.n + 1
  RETURNING n INTO used;
  RETURN used <= _limit;
END;
$function$;
REVOKE ALL ON FUNCTION public.anon_quota_take(text, int) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_app_error(_kind text, _route text, _message text, _release text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r text := left(split_part(split_part(coalesce(_route, '/'), '?', 1), '#', 1), 200);
  m text := left(regexp_replace(btrim(coalesce(_message, '')), '\s+', ' ', 'g'), 300);
BEGIN
  IF m = '' THEN RETURN; END IF;
  -- No personal data: emails, long numbers and UUIDs are masked.
  m := regexp_replace(m, '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g');
  m := regexp_replace(m, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '[id]', 'gi');
  m := regexp_replace(m, '[0-9][0-9 ]{6,}[0-9]', '[número]', 'g');
  r := regexp_replace(r, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '$id', 'gi');
  IF (SELECT count(*) FROM public.app_errors WHERE created_at > now() - interval '1 day') >= 2000 THEN RETURN; END IF;
  -- 0079: at most 50 a day from the same IP (hashed), so one visitor cannot fill the daily ceiling.
  IF NOT public.anon_quota_take('log_app_error', 50) THEN RETURN; END IF;
  INSERT INTO public.app_errors (kind, route, message, release)
  VALUES (CASE WHEN _kind = 'server' THEN 'server' ELSE 'client' END, CASE WHEN r = '' THEN '/' ELSE r END, m,
          left(nullif(btrim(coalesce(_release, '')), ''), 20));
END;
$function$;
REVOKE ALL ON FUNCTION public.log_app_error(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_app_error(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assistant_log_unanswered(_question text, _lang text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q text := left(regexp_replace(btrim(coalesce(_question, '')), '\s+', ' ', 'g'), 300);
BEGIN
  IF char_length(q) < 2 THEN RETURN; END IF;
  -- Emails and long digit runs (phones, references) are masked before storing.
  q := regexp_replace(q, '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g');
  q := regexp_replace(q, '[0-9][0-9 ]{6,}[0-9]', '[número]', 'g');
  IF (SELECT count(*) FROM public.assistant_unanswered WHERE created_at > now() - interval '1 day') >= 500 THEN RETURN; END IF;
  -- 0079: at most 20 a day from the same IP (hashed).
  IF NOT public.anon_quota_take('assistant_log_unanswered', 20) THEN RETURN; END IF;
  INSERT INTO public.assistant_unanswered (question, lang) VALUES (q, CASE WHEN _lang = 'en' THEN 'en' ELSE 'pt' END);
END;
$function$;
REVOKE ALL ON FUNCTION public.assistant_log_unanswered(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assistant_log_unanswered(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assistant_rate_answer(_slug text, _helpful boolean, _lang text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.assistant_faq_entries WHERE slug = _slug) OR _helpful IS NULL THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.assistant_feedback WHERE created_at > now() - interval '1 day') >= 2000 THEN RETURN; END IF;
  -- 0079: one rating per answer and at most 50 a day from the same IP (hashed).
  IF NOT public.anon_quota_take('assistant_rate_answer:' || _slug, 1) THEN RETURN; END IF;
  IF NOT public.anon_quota_take('assistant_rate_answer', 50) THEN RETURN; END IF;
  INSERT INTO public.assistant_feedback (entry_slug, helpful, lang) VALUES (_slug, _helpful, CASE WHEN _lang = 'en' THEN 'en' ELSE 'pt' END);
END;
$function$;
REVOKE ALL ON FUNCTION public.assistant_rate_answer(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assistant_rate_answer(text, boolean, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.anon_quota_purge()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  DELETE FROM public.anon_quota WHERE day < current_date - 2;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.anon_quota_purge() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.schedule('ekaya-anon-quota-purge', '20 1 * * *', 'SELECT public.anon_quota_purge()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%): schedule public.anon_quota_purge() elsewhere', SQLERRM;
END $$;
