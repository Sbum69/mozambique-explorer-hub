-- 0072 — Funções auxiliares deixam de ser chamáveis diretamente pela API (PROPOSTA, não aplicada).
--
-- PROBLEMA
--   Três funções SECURITY DEFINER recebem um id e respondem sobre OUTRO negócio/utilizador sem
--   validar quem chama. Qualquer conta autenticada pode chamá-las por /rest/v1/rpc:
--     - commission_quote(_business_id, _gross_cents): diz se um negócio é Fundador e a sua comissão
--       (a 0058 já a tirou ao anon; continua aberta a authenticated).
--     - is_founder(_business_id, _at): diz se um negócio é Fundador (dado comercial privado).
--     - is_internal_user(_user_id): diz se uma conta é interna/de teste.
--
-- QUEM AS CHAMA (pesquisa em src/, drizzle/migrations/, supabase/migrations/; não há edge functions)
--   - Frontend: NENHUMA das três (só aparecem em src/integrations/supabase/types.ts).
--   - Políticas RLS: NENHUMA.
--   - commission_quote: trigger bookings_commission_snapshot (0053, SECURITY DEFINER).
--   - is_founder: commission_quote, admin_set_founder (0053) e request_sponsored_placement (0054),
--     todas SECURITY DEFINER.
--   - is_internal_user: ninguém (as métricas da 0047 leem profiles.is_internal diretamente).
--   As funções SECURITY DEFINER executam com os direitos do dono, por isso continuam a poder
--   chamá-las depois do REVOKE.
--
-- PORQUE NÃO SE VALIDA auth.uid() DENTRO DELAS
--   commission_quote é chamada pelo trigger quando um TURISTA cria uma reserva: auth.uid() é o
--   turista, que não é dono do negócio. Uma verificação "dono ou admin" partiria a criação de
--   reservas. O REVOKE fecha o acesso direto sem mudar o comportamento interno.
--
-- O QUE MUDA
--   EXECUTE retirado a PUBLIC, anon e authenticated nas três funções (service_role mantém-se).
--
-- O QUE NÃO MUDA
--   O corpo e a assinatura das funções, o trigger de comissões, os pedidos de destaque, o painel
--   do admin, has_role (ver nota abaixo).
--
-- has_role — SÓ DOCUMENTADO, NÃO ALTERADO
--   has_role(_user_id, _role) responde sobre qualquer utilizador e qualquer conta autenticada pode
--   perguntar "o utilizador X é admin?". Mas é usada em ~150 políticas RLS (que correm como o
--   utilizador, por isso precisam de EXECUTE) e em 2 server functions (dashboard.functions.ts,
--   platform-users.functions.ts, sempre com o próprio id). Retirar o EXECUTE ou mudar o
--   comportamento parte a RLS. Alternativa proposta em docs/security/QUALIDADE-V1.md.
--
-- COMO REVERTER
--   GRANT EXECUTE ON FUNCTION public.commission_quote(uuid, bigint) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.is_founder(uuid, timestamptz) TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.is_internal_user(uuid) TO authenticated;
--
-- ANTES DE APLICAR: correr a 1.ª consulta de docs/security/testes/0072_internal_helpers.sql
-- (confirma em produção que nenhuma política, vista ou função de outro dono as usa).

REVOKE EXECUTE ON FUNCTION public.commission_quote(uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_founder(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_internal_user(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.commission_quote(uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_founder(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_internal_user(uuid) TO service_role;
