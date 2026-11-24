-- 0077 — Termos e Política de Privacidade de 23/11/2026: contacto apoio@exploreekaya.com (PROPOSTA, não aplicada).
--
-- PORQUÊ
--   DOMAIN_EMAIL_LIVE = true (src/lib/app-info.ts): o email de contacto dos Termos (secção de
--   contacto) e da Política (contacto de privacidade) passa de um Gmail pessoal para
--   apoio@exploreekaya.com, que já recebe mensagens (Cloudflare Email Routing). O texto muda, por
--   isso as duas versões sobem para 2026-11-23, iguais a LEGAL_VERSIONS (src/lib/legal/versions.ts;
--   legal.test.ts confirma que coincidem). Nenhuma outra frase dos textos muda.
--
-- O QUE ACONTECE AOS UTILIZADORES EXISTENTES
--   Todas as contas com sessão voltam a ver o LegalAcceptanceGate e têm de aceitar os dois
--   documentos outra vez (uma vez por conta). A aceitação antiga fica guardada em
--   legal_acceptances (o histórico não se apaga). As contas novas aceitam no registo, como hoje.
--
-- ORDEM OBRIGATÓRIA (código e BD juntos)
--   accept_legal_documents recusa versões diferentes das de current_legal_versions()
--   (LEGAL_VERSION_MISMATCH) e o trigger do registo só grava a aceitação se coincidirem:
--   - BD nova + app antiga publicada: o gate pede 2026-11-07, a BD só aceita 2026-11-23 → ninguém
--     consegue aceitar e os registos novos ficam sem aceitação gravada;
--   - app nova publicada + BD antiga: o mesmo problema, ao contrário.
--   Por isso: (1) merge do PR, (2) aplicar esta migração, (3) Publish na Lovable logo a seguir, no
--   mesmo momento e fora das horas de mais uso.
--
-- O QUE NÃO MUDA
--   legal_acceptances, accept_legal_documents, o trigger do registo, os grants (anon continua sem
--   EXECUTE).
--
-- COMO REVERTER (volta à 0063; repor também LEGAL_VERSIONS = 2026-11-07 e DOMAIN_EMAIL_LIVE = false)
--   Correr de novo o corpo de drizzle/migrations/0063_privacy_version_2026_11_07.sql (devolve
--   terms = 2026-11-07 e privacy = 2026-11-07). Não se copia aqui: legal.test.ts lê o primeiro
--   jsonb_build_object deste ficheiro.
--   As aceitações de 2026-11-23 que já existam ficam guardadas (não é preciso apagá-las).
--
-- Teste: docs/security/testes/0077_legal_versions.sql
CREATE OR REPLACE FUNCTION public.current_legal_versions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('terms', '2026-11-23', 'privacy', '2026-11-23'); $function$;
REVOKE ALL ON FUNCTION public.current_legal_versions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_legal_versions() TO authenticated;
