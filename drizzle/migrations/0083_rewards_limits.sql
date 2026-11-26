-- 0083 — Recompensas: os limites do formulário passam a valer na BD (PROPOSTA, não aplicada).
--
-- PORQUÊ (auditoria em docs/RECOMPENSAS.md)
--   O formulário (rewardSchema, src/lib/rewards.ts) aceita um custo de 1 a 100 000 pontos e um
--   stock de 0 a 100 000. A BD só exige custo > 0 e stock >= 0 (0031). Um pedido direto à API, com
--   a sessão do dono, pode gravar um custo de 2 147 483 647 ou um stock enorme. Não parte nada hoje,
--   mas os dois lados devem dizer o mesmo.
--
-- O QUE MUDA
--   1. CHECK rewards_cost_points_max: cost_points <= 100000.
--   2. CHECK rewards_stock_max: stock IS NULL OR stock <= 100000.
--   Ambos NOT VALID: só valem para as linhas novas e alteradas. Depois correr o VALIDATE (no fim do
--   ficheiro, comentado) se o PASSO 0 do guião der 0 linhas.
--
-- O QUE NÃO MUDA
--   Quem cria (dono com negócio aprovado; admin), a ausência de aprovação prévia (pedido: manter),
--   o resgate (redeem_reward), os vouchers, os pontos e a regra da 0074 (continua DESLIGADA: não se
--   ativam recompensas com valor real).
--
-- REGRAS PROPOSTAS EM TEXTO (sem SQL) [DECIDIR]
--   - O negócio é responsável por entregar o produto ou serviço a quem mostrar o voucher válido.
--     O formulário e o passo de convite já o dizem (PT/EN). Falta uma cláusula nos Termos (advogado).
--   - Aprovação prévia das recompensas pelo admin: hoje não existe. Ficar assim, ou exigir antes de
--     haver recompensas com valor real.
--
-- COMO REVERTER
--   ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_cost_points_max;
--   ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_stock_max;
--
-- Teste: docs/security/testes/0083_rewards_limits.sql

ALTER TABLE public.rewards
  ADD CONSTRAINT rewards_cost_points_max CHECK (cost_points <= 100000) NOT VALID;
ALTER TABLE public.rewards
  ADD CONSTRAINT rewards_stock_max CHECK (stock IS NULL OR stock <= 100000) NOT VALID;

-- Depois de o PASSO 0 do guião dar 0 linhas:
-- ALTER TABLE public.rewards VALIDATE CONSTRAINT rewards_cost_points_max;
-- ALTER TABLE public.rewards VALIDATE CONSTRAINT rewards_stock_max;
