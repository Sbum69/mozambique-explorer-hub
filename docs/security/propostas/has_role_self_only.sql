-- PROPOSTA (DEPOIS DO LANÇAMENTO, não aplicada, sem número) — has_role só responde sobre outra conta
-- a quem é admin.
--
-- Fora de drizzle/migrations de propósito: quando for aprovada, passa a NNNN_has_role_self_only.sql
-- com entrada no journal e snapshot.
--
-- PROBLEMA
--   has_role(_user_id, _role) é SECURITY DEFINER e o EXECUTE está aberto a authenticated (é preciso:
--   as políticas RLS chamam-na com os direitos de quem faz o pedido). Por isso qualquer conta com
--   sessão pode chamar /rest/v1/rpc/has_role com o id de outra pessoa e saber se é admin ou negócio.
--
-- QUEM A CHAMA HOJE (pesquisa em drizzle/migrations, supabase/migrations e src/)
--   - Políticas RLS e funções: has_role(auth.uid(), …) — o próprio. Não mudam.
--   - Funções com outro id: has_role(target, 'admin') em 0039 (admin_* SECURITY DEFINER, quem chama
--     já é admin). Continuam a funcionar: a regra nova deixa o admin perguntar sobre qualquer conta.
--   - Jobs e service_role (auth.uid() IS NULL): sem mudança.
--   - Frontend/servidor: dashboard.functions.ts e platform-users.functions.ts, sempre com o próprio
--     id (context.userId). Não mudam.
--   [CONFIRMAR] na produção que não há políticas nem funções criadas no painel com has_role(<outro>):
--     SELECT policyname, tablename, qual, with_check FROM pg_policies
--      WHERE (qual ~ 'has_role\((?!auth\.uid\(\))' OR with_check ~ 'has_role\((?!auth\.uid\(\))');
--     SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public' AND p.prosrc ~ 'has_role\((?!auth\.uid\(\))' ORDER BY 1;
--     (o regex do Postgres não tem lookahead: correr sem o "(?!…)" e rever a lista à mão)
--
-- O QUE MUDA
--   Com sessão (auth.uid() não nulo), a pergunta sobre OUTRA conta só tem resposta verdadeira se
--   quem pergunta for admin (com aal2, a mesma regra da 0050). Para os outros devolve false, sem erro.
--   A assinatura, o SECURITY DEFINER, o search_path e os grants ficam iguais.
--   Para evitar recursão, a verificação de quem chama lê user_roles diretamente.
--
-- RISCO
--   Uma política futura que pergunte pelo papel de outra conta (ex.: "mostrar se o autor é negócio")
--   passa a dar false para não-admins. Essas verificações devem usar uma função própria.
--   Teste obrigatório: todos os ficheiros de supabase/tests/ (RLS completa), como em docs/QA.md.
--
-- COMO REVERTER: repor o corpo da 0050 (drizzle/migrations/0050_admin_mfa_aal2.sql).

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND NOT (
    _role = 'admin'::public.app_role
    AND _user_id IS NOT DISTINCT FROM auth.uid()
    AND auth.uid() IS NOT NULL
    AND COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
  )
  AND (
    auth.uid() IS NULL
    OR _user_id IS NOT DISTINCT FROM auth.uid()
    OR (
      COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      AND EXISTS (SELECT 1 FROM public.user_roles
                   WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
    )
  )
$function$;
