# QUALIDADE-V1: segurança e quotas (branch `feat/qualidade-v1`)

> Estado em 22/11/2026: as migrações 0071 a 0074 são **propostas**. Ainda não foram aplicadas nem
> registadas no `_journal.json`. O registo faz-se depois de cada SQL ser testado e aplicado na
> produção, como na 0069 e na 0070. Os guiões de teste estão em `docs/security/testes/`.

## O que mudou no código (já ativo depois do merge)

- **Notícias e meteorologia** (`src/lib/news.functions.ts`, `src/lib/weather.functions.ts`, novo
  `src/lib/upstream-guard.ts`):
  - os pedidos ao Google News e à MET Norway são partilhados quando chegam vários visitantes ao mesmo tempo;
  - depois de uma falha, o serviço externo só volta a ser contactado ao fim de 2 minutos
    (`UPSTREAM_RETRY_MS`). Nesse intervalo serve-se a última resposta boa ou "indisponível";
  - as respostas boas continuam em cache como antes (30 min nas notícias, ≥ 1 h na meteorologia).
- **Jogos** (`src/lib/games.ts`): texto PT/EN para o erro `location_required`, que só aparece se a
  regra da 0074 for ligada.
- Testes: `src/lib/upstream-guard.test.ts` e um caso novo em `src/lib/games.test.ts`.

## Migrações propostas

| Ficheiro                                  | O que faz                                                                                                                                                           | Guião                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `0071_community_post_authors_invoker.sql` | A vista passa a `security_invoker`. Mostra os autores com publicações publicadas, o próprio e o admin (aal2). As colunas não mudam.                                 | `testes/0071_community_post_authors.sql` |
| `0072_internal_helpers_not_callable.sql`  | Tira o `EXECUTE` de `commission_quote`, `is_founder` e `is_internal_user` a anon e authenticated. Nenhum código da app as chama diretamente.                        | `testes/0072_internal_helpers.sql`       |
| `0073_businesses_anon_hide_decision.sql`  | O anon passa a ter `SELECT` só em colunas (todas menos `decided_by` e `decided_at`). Não muda nada no frontend.                                                     | `testes/0073_businesses_anon.sql`        |
| `0074_game_photo_location_flag.sql`       | Regra **desligada** (`game_photo_location_required()` = false): quando for ligada, uma foto sem localização válida não conta. Desligada, o comportamento é o atual. | `testes/0074_game_photo_location.sql`    |

## `has_role`: documentado, não alterado

- Qualquer conta autenticada pode perguntar `has_role(<outro id>, 'admin')` e assim saber quem é
  admin ou negócio.
- Mas cerca de 150 políticas RLS chamam `has_role(auth.uid(), …)` com os direitos de quem faz o
  pedido. Por isso o `EXECUTE` não pode sair e a assinatura não pode mudar.
- **Alternativa proposta [DECIDIR]:**
  1. criar `public.my_roles()` (só `auth.uid()`);
  2. mudar as 2 server functions (`dashboard.functions.ts`, `platform-users.functions.ts`) para a usar;
  3. só depois avaliar uma `has_role` que, para pedidos vindos da API, só responda sobre o próprio.
     Isto exige um teste completo da RLS (todos os ficheiros de `supabase/tests/`).

## Inventário de endpoints anónimos

Não há edge functions (`supabase/functions/` não existe).

| Endpoint                                                                                                                                                                                                                         | O que faz                                     | Custo                          | Proteção atual                                                                                      | Quota recomendada                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `getLiveNews` (server fn)                                                                                                                                                                                                        | Notícias do Google News                       | pedido externo                 | cache de 30 min; **novo:** pedido partilhado e pausa de 2 min após falha                            | suficiente (cache por instância)                    |
| `getDestinationWeather` (server fn)                                                                                                                                                                                              | Meteorologia da MET Norway (1 pedido/destino) | N pedidos externos + 1 leitura | cache ≥ 1 h (Expires); **novo:** pedido partilhado e pausa de 2 min após falha                      | suficiente                                          |
| `/sitemap.xml`                                                                                                                                                                                                                   | Lista de páginas                              | 3 leituras na BD               | nenhuma                                                                                             | `Cache-Control` de 1 h na resposta [DECIDIR]        |
| `/lovable/email/auth/webhook`                                                                                                                                                                                                    | Emails de autenticação                        | email                          | assinatura verificada pelo SDK `@lovable.dev/email-js`; limites do Supabase Auth (`RATE-LIMITS.md`) | a do Auth (SMTP próprio: ver `RATE-LIMITS.md` §1.4) |
| `/lovable/email/auth/preview`                                                                                                                                                                                                    | Pré-visualização de emails                    | render                         | `Bearer LOVABLE_API_KEY`                                                                            | nenhuma necessária                                  |
| `submit_business_lead`                                                                                                                                                                                                           | Pedido de adesão                              | escrita                        | 3/dia por IP (hash), 200/dia total, campo-armadilha                                                 | já tem                                              |
| `log_app_error`                                                                                                                                                                                                                  | Registo de erros                              | escrita                        | 2 000/dia total, 300 caracteres                                                                     | por IP, como na 0055 [FUTURO]                       |
| `assistant_log_unanswered`, `assistant_rate_answer`                                                                                                                                                                              | Assistente                                    | escrita                        | 500 e 2 000/dia total                                                                               | por IP [FUTURO]                                     |
| IA do assistente                                                                                                                                                                                                                 | LLM                                           | IA                             | desligada (`ASSISTANT_LLM_ENABLED = false`); teto de 9 000 Neurons/dia                              | ligar só com limite por IP                          |
| `get_experience_availability`, `platform_impact_stats`, `news_like_counts`, `event_participant_counts`, `active_sponsored`, `founder_places_left`, `commercial_activity_public`, `current_commercial_config`, `commission_split` | Leituras públicas                             | leitura                        | nenhuma (apenas leitura, limites do PostgREST/Cloudflare)                                           | nenhuma; vigiar no painel                           |
| Auth (`/signup`, `/recover`, `/token`, …)                                                                                                                                                                                        | Contas                                        | email                          | limites do Supabase Auth                                                                            | ver `RATE-LIMITS.md` §1                             |

Esta lista não substitui uma consulta na produção. Funções criadas sem `REVOKE` herdam o `EXECUTE`
de PUBLIC. Para a lista real, correr:
`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE') ORDER BY 1;`

## Objetos usados mas sem migração no repositório

- Os buckets `community-photos`, `route-proofs` e `game-proofs`:
  - as políticas (0016, 0018, 0031) e o `UPDATE storage.buckets` (0045) dependem deles;
  - nenhuma migração os cria. Foram criados à mão na Lovable/painel.
  - `avatars` (0046) e `content-photos` (0051) têm `INSERT INTO storage.buckets`.
- O esquema `drizzle` (`drizzle.__drizzle_migrations`): é criado pela ferramenta, não por uma migração.
- Tudo o resto que o frontend usa existe numa migração: as tabelas e vistas de `.from()`, as RPCs
  de `.rpc()`, as funções e colunas de `types.ts` e as funções chamadas dentro do SQL.
