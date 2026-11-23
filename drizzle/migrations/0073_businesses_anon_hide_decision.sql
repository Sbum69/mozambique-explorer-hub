-- 0073 — O visitante (anon) deixa de ler businesses.decided_by e decided_at (PROPOSTA, não aplicada).
--
-- PROBLEMA
--   A política "Anyone can view approved businesses" e o GRANT SELECT ON businesses TO anon
--   (migração original da Lovable) deixam o visitante ler todas as colunas dos negócios aprovados,
--   incluindo decided_by (id do admin que aprovou) e decided_at (0022).
--
-- SOLUÇÃO MENOS INTRUSIVA: column grants só para o anon
--   Leituras anónimas de businesses no frontend (todas com colunas explícitas, nenhuma com '*'):
--     - src/lib/local-businesses.ts (SELECT: id, name, description, category_code, province_id,
--       location, contact, images, verified, created_at + embeds)
--     - src/lib/page-meta.ts (name, description, location)
--     - src/lib/sitemap-entries.ts (id, updated_at; e businesses!inner(status) via experiences)
--     - embeds businesses(name) / businesses!inner(name, status) em experiences.ts, business.$id.tsx,
--       games.ts, rewards.ts, admin.ts, sponsored.ts, recibo.$id.tsx, voucher.$rewardId.tsx
--   O único select('*') em businesses é em business-management.functions.ts, com sessão
--   (authenticated): não é afetado, porque só se muda o anon.
--   Nenhum ficheiro do frontend precisa de mudar.
--
-- O QUE MUDA
--   anon: SELECT na tabela inteira → SELECT só nas colunas abaixo (todas menos decided_by e
--   decided_at). As políticas RLS não mudam (continua a ver só os aprovados).
--
-- O QUE NÃO MUDA
--   authenticated, service_role, políticas RLS, triggers, owner_id/rejection_reason (continuam
--   visíveis ao anon: decisão em aberto, ver docs/security/QUALIDADE-V1.md).
--
-- RISCO / MANUTENÇÃO
--   - Um select('*') anónimo novo em businesses passa a dar "permission denied" (o teste SQL cobre).
--   - Uma coluna NOVA em businesses não fica visível ao anon até ter GRANT próprio.
--   - A lista abaixo é a de src/integrations/supabase/types.ts; confirmar com a 1.ª consulta do
--     guião de teste que coincide com a produção antes de aplicar.
--
-- COMO REVERTER
--   GRANT SELECT ON public.businesses TO anon;
--
-- Teste: docs/security/testes/0073_businesses_anon.sql

REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (id, name, slug, description, category, category_code, type, province, province_id,
              location, contact, images, verified, status, owner_id, rejection_reason,
              created_at, updated_at)
  ON public.businesses TO anon;
