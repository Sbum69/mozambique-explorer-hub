-- 0071 — community_post_authors deixa de ser uma vista SECURITY DEFINER (PROPOSTA, não aplicada).
--
-- PROBLEMA
--   A vista (0008, reescrita na 0010) corre com os direitos do dono (security_invoker = off), o que o
--   linter da Supabase marca como "security_definer_view". Além disso, desde a 0010 mostra o nome e a
--   foto de QUALQUER pessoa com uma publicação na comunidade, mesmo que essa publicação esteja
--   pendente, rejeitada ou escondida (o filtro por estado foi retirado porque o anon não pode
--   executar has_role).
--
-- O QUE MUDA
--   1. Nova função public.community_post_author_cards() (SECURITY DEFINER, search_path fixo) que
--      devolve as MESMAS 3 colunas, só para autores com:
--        - pelo menos uma publicação 'published' (todos os visitantes); ou
--        - a própria pessoa (auth.uid() = autor, para ver as suas publicações pendentes); ou
--        - administrador com sessão aal2 (moderação; has_role corre como dono, por isso o anon
--          não precisa de EXECUTE em has_role).
--   2. A vista passa a security_invoker = on e lê dessa função. O nome, as colunas e os tipos
--      ficam iguais, por isso o frontend (src/lib/community.ts, fetchAuthors) não muda.
--
-- COLUNAS EXPOSTAS
--   Antes: id, display_name, avatar_url — de quem tem QUALQUER publicação (qualquer estado).
--   Depois: id, display_name, avatar_url — de quem tem publicação publicada; + o próprio; + todos
--           para o admin (aal2).
--
-- O QUE NÃO MUDA
--   Tabelas, políticas RLS de profiles e de community_posts, grants das tabelas, has_role,
--   o frontend e os tipos gerados (a vista tem as mesmas colunas).
--
-- NOTA DE DESEMPENHO
--   O filtro .in("id", ids) do PostgREST aplica-se depois da função (funções SECURITY DEFINER não
--   são "inlined"). A função percorre os perfis com publicações: aceitável ao volume atual.
--
-- COMO REVERTER (volta exatamente ao estado da 0010)
--   CREATE OR REPLACE VIEW public.community_post_authors WITH (security_invoker = off) AS
--   SELECT p.id, p.display_name, p.avatar_url FROM public.profiles p
--   WHERE EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.author_id = p.id);
--   GRANT SELECT ON public.community_post_authors TO anon, authenticated;
--   DROP FUNCTION IF EXISTS public.community_post_author_cards();
--
-- Teste: docs/security/testes/0071_community_post_authors.sql

CREATE OR REPLACE FUNCTION public.community_post_author_cards()
 RETURNS TABLE (id uuid, display_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.avatar_url
    FROM public.profiles p
   WHERE EXISTS (
     SELECT 1 FROM public.community_posts cp
      WHERE cp.author_id = p.id
        AND (cp.status = 'published'
             OR (auth.uid() IS NOT NULL AND cp.author_id = auth.uid())
             OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role)))
   );
$function$;

REVOKE ALL ON FUNCTION public.community_post_author_cards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_post_author_cards() TO anon, authenticated;

CREATE OR REPLACE VIEW public.community_post_authors
WITH (security_invoker = on) AS
SELECT a.id, a.display_name, a.avatar_url
  FROM public.community_post_author_cards() a;

GRANT SELECT ON public.community_post_authors TO anon, authenticated;
