-- =====================================================================
-- EKAYA — 0069 — Pontos de roteiros só em roteiros CURADOS (PROPOSTA, NÃO APLICADA)
-- 2026-11-20
--
-- Problema: qualquer utilizador podia criar roteiros próprios e ganhar pontos
-- (20 por paragem com prova + 150 por roteiro) em cada roteiro novo, sem limite.
-- Os pontos são únicos por (utilizador, roteiro/paragem), mas roteiros novos
-- geram identificadores novos.
--
-- Regra aprovada (A): só dão pontos roteiros criados e aprovados pela equipa
-- (is_curated) que estejam públicos, ativos e aprovados. Mais um teto diário.
--
-- O que NÃO muda: concluir/provar roteiros próprios continua permitido (sem
-- pontos); o momento em que os pontos são dados (prova da paragem e conclusão);
-- o histórico em points_ledger (nada é apagado); RLS; textos da app.
-- Só substitui 2 funções de trigger e acrescenta 2 funções auxiliares.
--
-- Fora desta migração, de propósito (decisões de produto):
--  * exigir roteiro "validado" (requires_validation = false): hoje deixaria só
--    10 dos 41 roteiros curados a dar pontos;
--  * bloqueio de 72 h entre conclusões (proposta do Tiago): impediria concluir
--    roteiros, em vez de limitar só os pontos.
-- =====================================================================

-- 1) O roteiro dá pontos? (curado, público, ativo, aprovado)
CREATE OR REPLACE FUNCTION public.route_is_rewardable(_route_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.routes r
     WHERE r.id = _route_id
       AND r.is_curated
       AND r.is_public
       AND r.status = 'active'
       AND r.review_status = 'approved'
  )
$fn$;

-- 2) Teto diário de pontos de roteiros por utilizador (janela de 24 h).
--    300 = cerca de um roteiro completo por dia (150 + paragens de 20).
--    Para mudar o teto, altera só a constante _cap.
CREATE OR REPLACE FUNCTION public.route_points_allowed(_user_id uuid, _points integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  _cap constant integer := 300;
  _used integer;
BEGIN
  -- Serializa pedidos simultâneos do mesmo utilizador (evita ultrapassar o teto em paralelo).
  PERFORM pg_advisory_xact_lock(hashtextextended('route_points|' || _user_id::text, 0));
  SELECT COALESCE(SUM(l.points), 0)::integer INTO _used
    FROM public.points_ledger l
   WHERE l.user_id = _user_id
     AND l.kind = 'award'
     AND l.reason IN ('route_stop_proof', 'route_completed')
     AND l.created_at > now() - interval '24 hours';
  RETURN _used + _points <= _cap;
END
$fn$;

REVOKE ALL ON FUNCTION public.route_is_rewardable(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.route_points_allowed(uuid, integer) FROM PUBLIC, anon, authenticated;

-- 3) Pontos por prova de paragem: igual à versão atual + roteiro elegível + teto.
CREATE OR REPLACE FUNCTION public.points_on_stop_proof()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE uid uuid; rid uuid;
BEGIN
  IF NEW.photo_path IS NULL OR btrim(NEW.photo_path) = '' THEN RETURN NEW; END IF;
  IF NEW.review_status NOT IN ('verified', 'approved') THEN RETURN NEW; END IF;
  SELECT user_id, route_id INTO uid, rid FROM public.route_progress WHERE id = NEW.progress_id;
  IF uid IS NULL THEN RETURN NEW; END IF;
  -- NOVO: só roteiros curados, públicos, ativos e aprovados
  IF NOT public.route_is_rewardable(rid) THEN RETURN NEW; END IF;
  -- NOVO: teto diário
  IF NOT public.route_points_allowed(uid, public.points_value('route_stop_proof')) THEN RETURN NEW; END IF;
  INSERT INTO public.points_ledger(user_id, points, kind, reason, source_type, source_id)
  VALUES (uid, public.points_value('route_stop_proof'), 'award', 'route_stop_proof', 'route_stop', NEW.route_stop_id)
  ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  RETURN NEW;
END
$fn$;

-- 4) Pontos por roteiro concluído: igual à versão atual + roteiro elegível + teto.
CREATE OR REPLACE FUNCTION public.points_on_route_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND public.route_progress_fully_proven(NEW.id)
     -- NOVO: só roteiros curados, públicos, ativos e aprovados
     AND public.route_is_rewardable(NEW.route_id)
     -- NOVO: teto diário
     AND public.route_points_allowed(NEW.user_id, public.points_value('route_completed')) THEN
    INSERT INTO public.points_ledger(user_id, points, kind, reason, source_type, source_id)
    VALUES (NEW.user_id, public.points_value('route_completed'), 'award', 'route_completed', 'route', NEW.route_id)
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  END IF;
  RETURN NEW;
END
$fn$;
