# CLAUDE.md

Orientação para agentes de IA que trabalham no repositório **EKAYA Explore** — plataforma de turismo
comunitário em Moçambique (turistas, negócios locais, comunidade e administração).

As regras de domínio detalhadas (pontos, roteiros, negócios, reservas, comunidade) estão em
[AGENTS.md](AGENTS.md). Lê os dois ficheiros antes de qualquer alteração.

---

## 1. Arquitetura

### Stack

| Camada        | Tecnologia                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| Framework     | TanStack Start (SSR) + TanStack Router (rotas por ficheiro) + React 19                        |
| Build / dev   | Vite 7 via `@lovable.dev/vite-tanstack-config` (já inclui plugins — ver `vite.config.ts`)     |
| Deploy target | Cloudflare Workers (`wrangler.jsonc`, `nodejs_compat`)                                        |
| Dados         | Supabase (Postgres + Auth + Storage + RPCs), `@supabase/supabase-js` v2                       |
| Estado remoto | TanStack Query (um `QueryClient` por router, criado em `src/router.tsx`)                      |
| UI            | Tailwind CSS 4, shadcn/ui (Radix) em `src/components/ui`, lucide-react, framer-motion, sonner |
| Mapas         | Leaflet + react-leaflet                                                                       |
| Formulários   | react-hook-form + zod                                                                         |
| Testes        | Vitest (já nas devDependencies; testes em `src/lib/*.test.ts`, sem script `test`)             |
| Qualidade     | TypeScript strict, ESLint 9 (typescript-eslint, react-hooks, prettier), Prettier              |

Comandos (usar sempre **bun**, nunca npm/npx): `bun run dev`, `bun run build`, `bun run lint`,
`bunx tsc --noEmit`, `bunx vitest run`. O lockfile é `bun.lock`; o `package-lock.json` não versionado
é um resíduo e não deve ser usado.

`bun run build` (e o Vitest, que carrega a config Vite) podem regenerar `src/routeTree.gen.ts`:
guardar uma cópia antes e repô-la depois se mudar. `.gitattributes` força LF (`* text=auto eol=lf`);
com a cópia local em LF o build já não o altera.

`bun run lint` tem de passar com 0 erros no repositório todo (os 17 avisos `react-refresh` são
conhecidos). O CI (`.github/workflows/ci.yml`) corre `tsc`, `vitest`, `lint` e `build` em cada PR
e push para a `main`. Ficheiros gerados, migrações e `.lovable/` estão fora do ESLint e do Prettier.

### Pastas

```
src/
├── routes/            # Páginas (TanStack file routes). routeTree.gen.ts é gerado — não editar
│   └── auth/callback  # Callback de email/OAuth (getAuthCallbackUrl → /auth/callback)
├── components/        # Componentes de domínio (mapas, negócios, jogos, comunidade, onboarding…)
│   └── ui/            # shadcn/ui — primitivas visuais, não alterar o design
├── contexts/          # AuthContext, LanguageContext (i18n), Favorites, Notifications, AuthGate
├── hooks/             # Hooks de dados (useDestinations, useExperiences, useProvinces, useRoutes,
│                      #   usePersonalPrefs, useRecommendations) — partilham pedidos em curso
├── lib/               # Acesso a dados e regras de negócio por domínio (routes, bookings, games,
│                      #   points, businesses, community…) + *.functions.ts (server functions)
│                      #   + testes Vitest (*.test.ts)
├── data/              # Dados estáticos legados (itinerários, notícias, tarefas de jogo, coordenadas)
├── integrations/supabase/  # Clientes Supabase e types.ts gerados — não editar
├── assets/            # Imagens das províncias/destinos
├── router.tsx, start.ts, styles.css
supabase/migrations/   # Migrações originais (Lovable) — PROIBIDO alterar
drizzle/               # schema.ts + migrations/ (0000–…) — todas as migrações novas vão aqui (ver §3)
docs/                  # Relatórios de auditoria e de blocos
.lovable/plan/         # Planos de blocos anteriores
EKAYA_FIXES.md, roadmap.md  # Histórico de correções e estado dos blocos
```

### Cliente Supabase

- **Browser / SSR (anon + sessão do utilizador, sujeito a RLS):**
  `import { supabase } from "@/integrations/supabase/client"` — proxy lazy tipado com `Database`.
  Lê `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (fallback `SUPABASE_URL` /
  `SUPABASE_PUBLISHABLE_KEY` no servidor). Sessão em `localStorage` (ou broker de preview do Lovable).
- **Server functions autenticadas:** `createServerFn(...).middleware([requireSupabaseAuth])`
  (`auth-middleware.ts`) dá `context.supabase` com o token do utilizador (RLS ativo) e `context.userId`.
  O token é anexado pelo `attachSupabaseAuth` registado em `src/start.ts`.
  Ficheiros: `business-management.functions.ts`, `business-registration.functions.ts`,
  `dashboard.functions.ts`, `platform-users.functions.ts`.
- **Admin (service role, ignora RLS):** `supabaseAdmin` em `client.server.ts` — só em código de
  servidor, importado dinamicamente dentro do handler. Nunca no bundle do cliente.
- Ficheiros em `src/integrations/supabase/` são gerados (`client*.ts`, `types.ts`, `auth-*.ts`) —
  não editar nem regenerar sem pedido.

### Tabelas, vistas, RPCs e buckets usados

Tipos em `src/integrations/supabase/types.ts`. Enums: `app_role` (tourist, business_small,
business_large, admin), `booking_status` (pending, confirmed, rejected, cancelled, completed),
`business_status` (pending, approved, rejected, suspended).

| Domínio           | Tabelas / vistas                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utilizadores      | `profiles`, `profile_provinces`, `user_roles`                                                                                                                 |
| Catálogo          | `provinces`, `destinations`, `experiences`, `experience_availability`, `business_categories`                                                                  |
| Negócios/reservas | `businesses`, `bookings`                                                                                                                                      |
| Comunidade        | `community_posts`, `community_post_reactions`, `community_reports`, `community_categories`, `community_experiences`, vista `community_post_authors`           |
| Roteiros          | `routes`, `route_days`, `route_stops`, `route_progress`, `route_stop_progress`                                                                                |
| Gamificação       | `points_ledger` (append-only), `rewards`, `reward_redemptions`, `game_catalog`, `game_steps`, `game_completions`, `game_quiz_attempts`, `game_quiz_questions` |
| Outros            | `notifications`, `destination_visits`, `news_likes`, `event_participations`, `legal_acceptances`                                                              |

RPCs chamadas pelo cliente: `has_role`, `save_route_plan`, `reset_my_route_progress`,
`get_experience_availability`, `cancel_my_booking`, `business_decide_booking`,
`admin_decide_business`, `admin_business_owner_emails`, `platform_impact_stats`,
`my_points_summary`, `points_leaderboard`, `redeem_reward`, `start_game_quiz`, `answer_game_quiz`,
`finish_game_quiz`, `submit_game_step`, `save_my_preferences`, `delete_my_account`,
`admin_set_internal`, `admin_platform_summary`, `accept_legal_documents`, `current_legal_versions`.

Aceitação dos Termos e da Privacidade (`legal_acceptances`, 0049): o registo grava-a no servidor a
partir dos metadados da conta; contas antigas ou versões novas aceitam pelo `LegalAcceptanceGate`.
Ao mudar um texto legal, mudar `LEGAL_VERSIONS` (`src/lib/legal/versions.ts`) e
`current_legal_versions()` numa migração nova (o `legal.test.ts` confirma que coincidem).

Buckets de Storage (privados, servidos por signed URLs): `community-photos`, `route-proofs`,
bucket de provas de jogos (`GAME_PROOFS_BUCKET` em `src/lib/games.ts`). Público: `avatars` (foto de
perfil, escrita só na pasta do próprio).

Contas internas (`profiles.is_internal`, só o admin altera): contas de teste e de equipa, fora de
todas as métricas (`platform_impact_stats`, `admin_platform_summary`).

### i18n PT/EN

- `src/contexts/LanguageContext.tsx`: tipo `Lang = "pt" | "en"`, dicionário `dict` com
  `{ pt, en }` por chave, `useLang()` → `{ lang, setLang, t }`. `t(key)` é tipado (`DictKey`).
- Idioma por omissão: `pt`; preferência guardada em `localStorage` (`ekaya.lang`) — uso legítimo
  (preferência de UI, não dado de negócio).
- Muitos componentes usam também ternários inline `lang === "pt" ? "…" : "…"` e campos bilingues
  vindos da BD (ex.: `*_pt` / `*_en`). Qualquer texto novo visível tem de existir em PT e EN.

---

## 2. Regras do projeto

### Fluxo de trabalho por blocos

Cada tarefa é executada em blocos, por esta ordem, e cada bloco é reportado:

1. **AUDIT** — ler o código e os dados reais; identificar o que existe e o que falta. Sem alterações.
2. **IMPLEMENTAÇÃO** — alterações mínimas e focadas, reutilizando o que existe.
3. **TESTES** — `bunx tsc --noEmit`, `bun run lint`, `bun run build`, `bunx vitest run` (os que se aplicarem).
4. **RELATÓRIO** — ficheiros alterados, o que foi feito, limitações e estado de cada verificação.

Estados permitidos em relatórios: **PASS**, **FAIL**, **BLOCKED** (impedido por algo externo —
dizer o quê), **NOT RUN** (não executado — dizer porquê). Nunca declarar PASS sem ter executado.
Se um pedido disser "só AUDIT", não alterar código.

### Regras obrigatórias

- **Não inventar dados turísticos.** Destinos, experiências, preços, horários, coordenadas,
  contactos, estatísticas e imagens vêm da base de dados. Se faltar um dado, mostrar estado vazio
  ou marcar como pendente de validação — nunca preencher com valores plausíveis.
- **Sem mocks nem `localStorage` como fonte de verdade.** Dados de negócio (pontos, XP, progresso,
  favoritos, reservas, roteiros) vivem no Supabase. `localStorage`/`sessionStorage` só para
  preferências de UI (idioma, modo convidado). Mocks só dentro de testes.
- **Reutilizar a arquitetura existente**: hooks de `src/hooks`, módulos de `src/lib`, RPCs e
  server functions existentes, componentes de `src/components`. Não criar tabelas, clientes ou
  sistemas paralelos.
- **Preservar o design** (Tailwind/shadcn, cores, layout, responsivo, tema claro/escuro) e o
  **suporte PT/EN** em todas as alterações.
- **Não publicar a aplicação** (deploy, publish no Lovable, alterar visibilidade).
- Tratar erros e estados de loading em todas as chamadas ao Supabase.
- Formatar com Prettier (`bunx prettier --write <ficheiros>`) apenas os ficheiros alterados —
  `bun run format` reformata o repositório inteiro. Se um ficheiro tocado não estava formatado na
  `main`, fazer primeiro um commit só de formatação, para o diff real se ler bem.
- **Segurança**: cabeçalhos em `src/lib/security-headers.ts` (CSP obrigatória desde o SEG-2; qualquer
  origem nova usada pelo browser entra em `CSP_SOURCES` e passa no `scripts/qa/csp.ts`); links externos com `rel="noopener noreferrer"`;
  o visitante (`anon`) não tem grants de escrita — tabelas novas não lhos devem dar. Os poderes de
  administrador exigem 2FA (sessão `aal2`): `requireAdmin` na rota e `has_role` na BD (0050). Ver
  `docs/SECURITY.md`.
- **Tema e acessibilidade**: só tokens (`bg-card`, `text-foreground`, `text-muted-foreground`,
  `border-border`, `primary`…), nunca `bg-white`/cinzentos fixos; contraste AA (texto 4,5:1, ícones
  e contornos 3:1) nos dois temas; estados nunca só pela cor. Confirmações com `useConfirm`
  (`src/components/ConfirmDialog.tsx`), nunca `confirm()`/`prompt()`/`alert()`.
- **Textos PT/EN**: textos novos em dicionários (`LanguageContext`, `src/lib/admin-texts.ts`,
  `src/lib/page-texts.ts`) cobertos pelos testes de paridade.
- **Identidade visual** (`docs/DESIGN.md`, "Capulana e Índico"): sem emojis na interface (ícones
  Lucide; interesses e categorias com `InterestIcon`), sem gradientes de cor (só véus escuros sobre
  fotos), uma cor de ação (`primary`), raio 10 px em cartões e 6 px em controlos, contorno em vez de
  sombras, sem animações decorativas. As fontes (`public/fonts`, OFL) carregam depois da primeira
  pintura (`src/lib/brand-fonts.ts`): não as pôr no CSS crítico.
- **Fotografias**: só com licença livre e do sítio certo (sem foto fiel, fica sem foto ou com a da
  província, identificada como tal). Cada foto tem entrada em `src/lib/photo-credits.ts` (autor,
  licença, origem) e aparece em `/creditos`; o crédito "© autor · licença" fica visível
  (`PhotoCredit`). Negócios sem foto usam `BusinessMark`.

### Git e pull requests

- Um branch por bloco, a partir da `main` atualizada; commits separados por parte.
- Fazer push e dar o link do PR (`/compare/main...<branch>`). **Nunca fazer merge.**
- Nunca commitar `.env.test.local` nem credenciais (está coberto por `*.local` no `.gitignore`).

---

## 3. Base de dados, migrações e escritas

- Base de dados do EKAYA: projeto Lovable `0109a201-22dc-464d-bb9c-58c103bd551a` (conector Lovable,
  `query_database`). O conector Supabase não tem acesso a este projeto.
- **Leituras** são livres. **Qualquer escrita** (migração, dados, contas) exige mostrar o SQL e
  esperar aprovação explícita; aprovar um bloco não aprova o seguinte.
- Migrações novas: `drizzle/migrations/NNNN_nome.sql` + entrada em `meta/_journal.json` +
  `meta/NNNN_snapshot.json` (encadeado por `prevId`). Aplicar numa transação e registar em
  `drizzle.__drizzle_migrations` (hash SHA-256 do ficheiro com LF, `created_at` = `when` do journal).
- Em PL/pgSQL, não usar `IF … CASE … THEN` (o parser corta no primeiro `THEN`): calcular primeiro
  numa variável. Extensões disponíveis na Lovable Cloud: `pg_cron`, `pg_net` (não `http`).
- **Testes de BD auto-revertíveis**: blocos `DO $$ … RAISE EXCEPTION 'TEST_…_ROLLBACK %', r; END $$`,
  com `set_config('request.jwt.claims', …)` e `SET LOCAL ROLE authenticated/anon` para a RLS; no fim,
  confirmar por leitura que não ficaram dados de teste. Guardados em `supabase/tests/*.sql` (um por
  área, utilizadores escolhidos pelo papel, sem emails); guia em `docs/QA.md`.
- `src/integrations/supabase/types.ts` é gerado, mas sem acesso ao gerador é atualizado à mão, e só
  com as tabelas/funções de uma migração aprovada.

## 4. Contas de teste e capturas

- Três contas de teste (turista, negócio com o negócio "EKAYA Teste — não reservar", admin).
  Credenciais só em `.env.test.local` (`TEST_TOURIST_EMAIL`/`_PASSWORD`, `TEST_BUSINESS_…`,
  `TEST_ADMIN_…`); nunca em logs, relatórios ou commits. **Apagar ou desativar antes do lançamento.**
- Com sessão, os testes só leem e navegam: sessão obtida pela API de autenticação, sem submeter
  formulários da app.
- Capturas e verificações no browser com Playwright e o Edge do sistema: scripts em `scripts/qa/`
  (`package.json` próprio, `bun install` nessa pasta; ver `scripts/qa/README.md`); saídas em
  `qa-output/` (ignorado). Nunca acrescentar estas ferramentas ao `package.json` da raiz.

---

## 5. Proibições

- **Proibido alterar `supabase/migrations/`** (criar, editar ou apagar ficheiros).
- **Proibido alterar políticas RLS sem aprovação explícita** do SQL (em `drizzle/`, SQL direto ou
  dashboard). Sem aprovação, parar e listar a necessidade no relatório.
- Não editar `src/routeTree.gen.ts` (o build e o Vitest podem regenerá-lo: repor a cópia).
- Não executar escritas diretas em `points_ledger` nem eliminar dados reais para "limpar" testes.
