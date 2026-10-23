# EKAYA — Auditoria de código (Bloco 2, só leitura)

- **Data:** 2026-10-22 · **Branch:** `backend-migration` (HEAD `a24d9ff`)
- **Âmbito:** `src/` (176 ficheiros), configuração, histórico git para segredos. Sem acesso à base de dados.
- **Método:** leitura do código, varrimentos com `grep`/scripts Bun (chamadas Supabase, imports, exports), `bunx tsc --noEmit`, `bun run lint`.
- **Alterações:** nenhuma, além da criação deste ficheiro.

Gravidade: **crítico** (informação falsa ou insegura mostrada como real / risco de segurança explorável) · **alto** (dados errados, perda de dados ou contradição com a BD) · **médio** (fragilidade, dívida relevante) · **baixo** (limpeza, estilo).
**Requer DB** = a correção precisa de tabela/coluna/RPC/política nova — fica para o responsável da BD (migrações e RLS não podem ser alteradas por agentes).

## Resumo

| Secção                         | Crítico | Alto | Médio | Baixo |
| ------------------------------ | ------: | ---: | ----: | ----: |
| 1. Fontes de verdade locais    |       0 |    3 |     1 |     1 |
| 2. Dados hardcoded/fictícios   |       3 |    3 |     4 |     2 |
| 3. Chamadas Supabase / tipos   |       0 |    3 |     6 |     4 |
| 4. Segurança                   |       0 |    1 |     0 |     1 |
| 5. TypeScript e lint           |       0 |    0 |     2 |     2 |
| 6. Código morto e duplicados   |       0 |    0 |     4 |     5 |
| **Total**                      |   **3** | **10** | **17** | **15** |

Prioridades:
1. Remover ou rotular meteorologia, alertas de estrada e notícias fictícias (H-01..H-03).
2. Tratar os erros no carregamento do utilizador e nas preferências (E-01, E-02).
3. Validar o S-02 (registo de negócio público com service role).

---

## 1. Fontes de verdade locais (`localStorage` / `sessionStorage` / `src/data`)

| ID   | Grav.  | Local | Problema | Recomendação | Requer DB |
| ---- | ------ | ----- | -------- | ------------ | --------- |
| L-01 | alto   | `src/contexts/AuthContext.tsx:163-183`, `:206`, `:275-304`; mostrado em `src/routes/dashboard.tsx:160-161` | `xp`, `level`, `visitedPlaces`, `kmExplored`, `visitedIds` vivem em `localStorage` (`ekaya.user-state:<id>`). **Duplica e contradiz** `points_ledger`/`my_points_summary` (XP) e `destination_visits` (visitas, já com `fetchMyVisits` em `src/lib/visits.ts:7`). `computeLevel` (`:45`, limiares 500/1500/3000/5000) contradiz `LEVELS` em `src/lib/points.ts:48` (100/300/700/1500). Como `visitDestination` não tem consumidores, o painel mostra "Visitados" e "KM" sempre a 0 (ou valores antigos do browser). | "Visitados": contar `destination_visits`. XP/nível: só `my_points_summary`. Remover campos locais. | Não para visitas/XP. **Sim** para "KM" (não existe fonte na BD) — ou remover a estatística. |
| L-02 | alto   | `src/contexts/AuthContext.tsx:185-188`, `:253` | Preferências (`province`, `durationDays`, `interests`) usam o `localStorage` como fallback quando `profiles` não devolve linha (incluindo por erro de rede, ver E-01). `setPreferences` grava localmente **antes** da BD, por isso a UI mostra sucesso mesmo que a escrita falhe. Contradiz a regra "preferências só via `usePersonalPrefs`/profiles". | `profiles` + `profile_provinces` como única fonte; sem fallback local. | Não |
| L-03 | alto   | `src/contexts/FavoritesContext.tsx:24`, `:31-44`; `src/components/FavoriteButton.tsx:46` | Favoritos existem **só** em `localStorage`, numa chave global `ekaya_favorites` que **não é por utilizador**: contas diferentes no mesmo browser partilham favoritos e perdem-nos noutro dispositivo. Guardam um snapshot (`data: Record<string, any>`) que fica desatualizado (nomes, preços). Não existe tabela de favoritos. | Tabela `favorites (user_id, item_type, item_id, created_at)` com RLS "só o próprio"; guardar só referências e ler os dados atuais. | **Sim** (tabela + RLS) |
| L-04 | médio  | `src/contexts/AuthContext.tsx:206`, `:239-248` | O objeto `AppUser` inteiro (email, nome, `businessInfo`) é persistido em `localStorage` e **não é apagado no logout**. Dados pessoais ficam no dispositivo. | Deixa de ser necessário quando L-01/L-02 forem resolvidos; até lá, limpar a chave no logout. | Não |
| L-05 | baixo  | `src/data/game-tasks.ts:53-81`, `src/data/treasure-stops.ts:69-91` | `getGameLogs`/`addGameLog` e `getCheckedStops`/`saveCheckedStops` escrevem em `localStorage` (`ekaya.game.logs`, `ekaya.treasure.stops`), mas **não têm consumidores**. Se fossem usados, duplicariam `game_steps`/`game_completions`. O progresso real já vem de `fetchGameState` (`src/lib/games.ts:28`). | Remover. | Não |
| —    | legítimo | `src/contexts/LanguageContext.tsx:262`, `:268` | `ekaya.lang`: preferência de UI. OK. (Opcional: `profiles.locale` já existe e podia ser sincronizado.) | — | Não |
| —    | legítimo | `src/contexts/AuthContext.tsx:95`, `:145`, `:223`, `:242` | `sessionStorage` `ekaya.guest-mode`: modo convidado da sessão. OK. | — | Não |
| —    | legítimo | `src/integrations/supabase/previewAuthStorage.ts` | Sessão Supabase Auth (ficheiro gerado). OK. | — | Não |

## 2. Dados hardcoded ou fictícios

| ID   | Grav.   | Local | Problema | Recomendação | Requer DB |
| ---- | ------- | ----- | -------- | ------------ | --------- |
| H-01 | crítico | `src/data/news-extra.ts:115` (`WEATHER`) → `src/routes/news-alerts.tsx:596` | Meteorologia inventada (temperatura, humidade, vento, previsão de 4 dias) apresentada como atual. | Remover o separador ou ligar a um serviço meteorológico real com fonte e hora; nunca valores fixos. | Não (serviço externo) |
| H-02 | crítico | `src/data/news-extra.ts:178` (`ROAD_ALERTS`) → `src/routes/news-alerts.tsx:675` | Alertas de estrada fictícios ("EN1 Maputo-Xai-Xai: Obras em curso", "Há 2 horas", desvios, durações). É informação de segurança falsa. | Remover até existir uma fonte real/curada com data. | **Sim** (tabela de alertas curados por admin) |
| H-03 | crítico | `src/data/news.ts:14` (`MOCK_NEWS`) → `src/routes/home.tsx:606` | Notícias fictícias com datas, incluindo um falso aviso do INAM ("Alerta de chuvas fortes em Inhambane") e eventos inventados, na página inicial. | Mostrar as notícias reais (o feed RSS de `news-alerts.tsx:199`) ou uma tabela curada; remover `MOCK_NEWS`. | **Sim**, se forem notícias curadas |
| H-04 | alto    | `src/data/news-extra.ts:52` (`EVENTS`) → `src/routes/news-alerts.tsx:489-509` | Eventos fictícios (datas, local, preço, `attendees: 500`, imagens Unsplash). Os utilizadores registam **participações reais** em `event_participations` contra chaves inventadas (`ev1`…), via `useEngagement("event")` (`:490`). | Tabela de eventos com moderação; até lá, esconder a participação. | **Sim** (tabela `events` + RLS) |
| H-05 | alto    | `src/data/itineraries.ts:52` (`SAMPLE_ITINERARIES`) → `src/routes/home.tsx:103`, `:164`, `:503`; `src/components/GameTaskFields.tsx:68`; `src/data/treasure-stops.ts:14` | Roteiros de amostra com classificações (`rating: 4.9`, `totalReviews: 342`), custos, preços de entrada e telefones fictícios (`"+258 84 111 2222"`, `:77`). As "Story Stops" da home e a escolha de roteiro nos jogos g16/g19 usam estes dados em vez de `routes`/`route_progress`. | Home: histórias a partir de `routes`/`route_stops`. Jogos: `ItineraryTask` deve listar os roteiros reais do utilizador com progresso. Depois, remover o ficheiro. | Não (tabelas existem) |
| H-06 | alto    | `src/data/treasure-stops.ts:28-55`, `src/data/itinerary-coords.ts:42-66` → `src/components/TreasureStopPicker.tsx:21` → `src/routes/games.tsx:561` | Pontos da caça ao tesouro (bairros, praias, ilhas) com coordenadas escritas à mão. São usados como `step_ref` em `submit_game_step` sem ligação a `destinations`, e as coordenadas aproximadas não foram validadas. | Associar as paragens dos jogos a `destinations`/`route_stops` reais. | **Sim** (ligar paragens de jogo a destinos, ex. `game_stops`) |
| H-07 | médio   | `src/routes/games.tsx:86-113` (`INITIAL_GAMES`), `src/data/game-tasks.ts:23` (`GAME_TASKS`) | Título, descrição e dificuldade dos 21 jogos estão hardcoded, **só em PT**. `GAME_TASKS` duplica parcialmente `game_catalog.verification`. Pontos e estado já vêm da BD (`applyState`, `:122`), o que está correto. | Mover textos para `game_catalog` (`title_pt/en`, `description_pt/en`) ou, no mínimo, para o dicionário PT/EN. | **Sim** (colunas de texto em `game_catalog`), ou não, se ficarem no i18n |
| H-08 | médio   | `src/routes/useful-info.tsx:61`, `:72-73`, `:79` | Câmbio fixo "~63 MZN/USD" (desatualiza) e números de emergência (119, 117/112, 198) sem fonte nem data de verificação. É conteúdo de segurança. | Validar com fonte oficial e mostrar "verificado em <data>"; câmbio sem valor fixo. | Opcional |
| H-09 | médio   | `src/routes/culture-history.tsx:60` (`TOPICS`), `src/data/news-extra.ts:223` (`TRAVEL_TIPS`) | Conteúdo editorial fixo no código; imagens via hotlink Unsplash (11 em `news-extra.ts`, mais as de `culture-history`) que não mostram necessariamente os locais descritos. | Validar o conteúdo; imagens próprias ou com atribuição; considerar gestão por admin. | Opcional |
| H-10 | médio   | `src/routes/home.tsx:73`, `src/data/destinations.ts:6`, `src/lib/routes.ts:653` | Três taxonomias de interesses diferentes (`INTEREST_OPTIONS`, `INTERESTS`, `ROUTE_INTERESTS`) com mapeamento manual (`src/lib/routes.ts:731`). | Uma lista única (ou tabela). | Opcional |
| H-11 | baixo   | `src/components/InteractiveMap.tsx:87`, `src/components/ItineraryMap.tsx:15`, `src/data/itinerary-coords.ts:69` | Centro de Moçambique `[-18.5, 35.5]` repetido 3×. É uma constante de UI legítima, mas duplicada. | Constante única. | Não |
| H-12 | baixo   | `src/routes/impact.tsx:206` (`AREAS`) | Texto institucional, sem números. Legítimo. | — | Não |

Já corretos: `src/data/destinations.ts` e `src/data/experiences.ts` foram esvaziados (catálogo na BD); `/impact` usa `platform_impact_stats()`.

## 3. Chamadas Supabase: erros, loading e tipos

Varrimento: **163** chamadas Supabase em `src/` (sem testes nem ficheiros gerados). **18** não leem `error` (17 detetadas pelo script, mais 1 encontrada manualmente). Os hooks de catálogo (`useDestinations`, `useExperiences`, `useProvinces`, `useRoutes`, `useRecommendations`), `business.$id.tsx` e `AdminBusinesses.tsx` expõem `loading`/`error` corretamente. A maioria de `src/lib/*` lança exceção em caso de erro.

| ID   | Grav.  | Local | Problema | Recomendação | Requer DB |
| ---- | ------ | ----- | -------- | ------------ | --------- |
| E-01 | alto   | `src/contexts/AuthContext.tsx:150-153` | `Promise.all` sobre `profiles`, `user_roles` e `profile_provinces` ignora os três `error`. Numa falha transitória: os papéis ficam vazios, admin ou negócio é tratado como turista (`toLegacyRole`, `:103`); as preferências ficam vazias, `needsOnboarding` passa a `true` (`:332`) e o utilizador é enviado para o onboarding; entram os valores locais (L-02). Não há estado de erro exposto. | Verificar os erros; expor `error`/repetir; não decidir papel nem onboarding com dados em falta. | Não |
| E-02 | alto   | `src/contexts/AuthContext.tsx:250-273` | `setPreferences` ignora os erros de `update`, `select`, `delete` e `insert`. `delete` seguido de `insert` em `profile_provinces` (`:265-269`) **não é atómico**: se o insert falhar, as províncias perdem-se. O comentário `:261` ("several provinces") contradiz a regra do AGENTS.md "exactly one destination province". | Tratar erros e devolver resultado; operação atómica (RPC) para substituir províncias; impor uma única província. | **Sim** para atomicidade (RPC) — ou aceitar e tratar erros no cliente |
| E-03 | alto   | `src/lib/business-registration.functions.ts:108`, `:111`, `:121-124`, `:150-151` | Server function com **service role** ignora vários erros: se a verificação "um negócio por conta" (`:111`) falhar, é contornada; se o `insert` do papel (`:150`) falhar, o `delete` do papel `tourist` (`:151`) corre na mesma e a conta fica **sem papel**. | Verificar cada `error`; só remover `tourist` depois do insert confirmado. | Não |
| E-04 | médio  | `src/lib/news-engagement.ts:32`, `:37` | Erros do RPC (`news_like_counts`/`event_participant_counts`) e do select ignorados; sem estado de loading; 5× `as any` (`:32`, `:34`, `:37`, `:41`, `:55`), embora tabelas e RPCs existam em `types.ts`. | Tipar por ramo (`news`/`event`); expor `loading`/`error`. | Não |
| E-05 | médio  | `src/lib/community-experiences.ts:112` | Erro de `createSignedUrls` ignorado: as fotos desaparecem sem aviso. (`:149` também ignora o erro de `profiles`, mas o fallback está documentado — baixo.) | Registar ou propagar o erro. | Não |
| E-06 | médio  | `src/lib/platform-users.functions.ts:38-42` | Só `profilesError` é verificado; erros de `user_roles`/`businesses` são ignorados e o admin vê utilizadores sem papel ou negócio sem aviso. | Verificar os três. | Não |
| E-07 | médio  | `src/routes/news-alerts.tsx:210-214` | `fetch` ao proxy externo `api.rss2json.com` sem verificar `res.ok`. Envia o IP e o idioma do utilizador a um terceiro (dependência e privacidade). `any` em `:214`, `:228`. | Verificar `res.ok`; avaliar um proxy próprio (server function). | Não |
| E-08 | médio  | 25× `as unknown as` em `src/lib/bookings.ts:189,206,225`, `experiences.ts:124,138,152,193`, `routes.ts:340,351,361,367,379,442`, `games.ts:72,79,84,89,170`, `local-businesses.ts:105,116`, `community-experiences.ts:144`, `impact-stats.ts:36`, `dashboard.functions.ts:17`, `routes/business.$id.tsx:59` | Os casts escondem divergências entre o select e o tipo `Row`. `routes.ts:442` faz cast de `routeId` para `string`, o que sugere que o tipo aceita `null`. | Bloco 5: tipos derivados de `Tables<>`/`QueryData`; validar o retorno dos RPCs. | Não |
| E-09 | médio  | `src/lib/business-registration.functions.ts:136` vs `src/lib/business-management.functions.ts:38` | `businesses.province` é gravado como **código** no registo e como **nome PT** na gestão: dados inconsistentes na mesma coluna. | Usar sempre `province_id`; uniformizar (o legado decide qual). | Possivelmente (limpeza de dados) |
| E-10 | baixo  | `src/contexts/AuthContext.tsx:216` | Segunda leitura de `user_roles` no login, duplicada (já feita em `:152`) e com o erro ignorado: o destino após login pode ficar errado. | Reutilizar os papéis carregados. | Não |
| E-11 | baixo  | `src/routes/business-register.tsx:118` | Resultado de `signInWithPassword` ignorado: mostra "concluído" sem sessão. | Verificar o erro e informar. | Não |
| E-12 | baixo  | `src/routes/auth/callback.tsx:110` | Erro de `getUser` ignorado: uma falha de rede mostra "ligação inválida". | Distinguir erro de rede. | Não |
| E-13 | baixo  | `src/contexts/AuthContext.tsx:240`; `logout().then(...)` sem `catch` em `src/routes/admin.tsx:199`, `dashboard.tsx:120`, `home.tsx:227`, `src/components/AppSidebar.tsx:249` | Erro de `signOut` ignorado; promessa rejeitada sem tratamento. | `try/finally` no logout. | Não |

## 4. Segurança

| ID   | Grav.  | Local | Resultado |
| ---- | ------ | ----- | --------- |
| S-01 | OK     | `src/lib/business-registration.functions.ts:105`, `src/lib/platform-users.functions.ts:36` | `supabaseAdmin` é usado **só** via `await import("@/integrations/supabase/client.server")` dentro de `.handler(...)`. Não há import de topo fora de `client.server.ts`. Em `listPlatformUsers` o papel de admin é verificado (`has_role`, `:30-34`) antes de carregar o cliente privilegiado. Restantes server functions (`dashboard.functions.ts`, `business-management.functions.ts`) usam `requireSupabaseAuth` + RLS e verificam dono/papel. |
| S-02 | alto (plausível — a confirmar) | `src/lib/business-registration.functions.ts:62-153` | `registerBusinessAccount` é **pública** (sem `requireSupabaseAuth`) e usa service role para criar negócio e trocar papéis do `userId` devolvido por `signUp`. Só rejeita contas com `identities.length === 0` (já confirmadas). Para um email **já registado mas não confirmado**, o Supabase pode devolver o id da conta existente: um terceiro poderia anexar um negócio `pending` e trocar `tourist` → `business_*` na conta de outra pessoa. Também permite encher a fila de aprovação com contas não confirmadas. **Não foi testado** (sem BD de teste). Recomendação: criar negócio e papel só com sessão autenticada e email confirmado. |
| S-03 | baixo  | `.env` (versionado desde o commit `c728639`), `.gitignore` | O `.env` está no git e o `.gitignore` não o exclui. Conteúdo atual: só URL, project id e **publishable key** (públicos por design), sem segredo. Risco: um futuro `SUPABASE_SERVICE_ROLE_KEY` seria commitado. Recomendação: `.env` no `.gitignore` + `.env.example` (é alteração de configuração — não feita). |
| S-04 | OK     | ficheiros versionados + histórico (`git log -S/-G`) | Sem `service_role` key, `sb_secret_…`, JWTs, chaves privadas nem URLs de BD com credenciais. `drizzle.config.ts:8` lê `LOVABLE_DB_MIGRATION_URL` do ambiente. |
| —    | —      | ver L-03, L-04 | Favoritos partilhados entre contas no mesmo browser; dados pessoais persistidos sem limpeza no logout. |

## 5. TypeScript e lint

**`bunx tsc --noEmit`** → exit 0, **0 erros**.

**`bun run lint`** (`eslint .`) → exit 1, **29 204 problemas** (29 187 erros, 17 avisos):

| Categoria | Qtd. | Ficheiros | Natureza |
| --------- | ---: | --------: | -------- |
| Prettier — `Delete ␍` (CRLF) | 24 784 | 171 | **Artefacto do checkout Windows**: `core.autocrlf=true`, ficheiros LF no índice e CRLF no disco. Não existe no repositório. |
| Prettier — formatação real | 4 391 | 106 | 1 802 em ficheiros gerados (`types.ts` 1 695, `auth-middleware.ts` 42, `previewAuthStorage.ts` 29, `client.ts` 16, `client.server.ts` 13, `auth-attacher.ts` 7). **2 589 em código do projeto**: `itineraries.tsx` 337, `news-alerts.tsx` 232, `admin.tsx` 176, `games.tsx` 133, `BusinessManagement.tsx` 104, … |
| `@typescript-eslint/no-explicit-any` (erro real) | 12 | 7 | `AdminBusinesses.tsx:55`, `FavoriteButton.tsx:12`, `ShareButton.tsx:53`, `FavoritesContext.tsx:9`, `news-engagement.ts:32,34,37,41,55`, `favorites.tsx:321`, `news-alerts.tsx:214,228` |
| `react-refresh/only-export-components` (aviso) | 17 | 15 | Contextos, `router.tsx`, `ui/*`, `Stub.tsx`, `ShareButton.tsx:22`, `CommunityMiniMap.tsx:6` — afeta só o HMR. |

| ID   | Grav.  | Problema | Recomendação |
| ---- | ------ | -------- | ------------ |
| T-01 | médio  | 85% do lint é ruído CRLF: torna o `bun run lint` inútil como sinal em Windows. | `.gitattributes` com `* text=auto eol=lf`, ou `"endOfLine": "auto"` no `.prettierrc` (alteração de config — pedir aprovação). |
| T-02 | médio  | 12 `any` explícitos (lista acima) + 25 `as unknown as` (E-08). | Bloco 5. |
| T-03 | baixo  | 2 589 problemas de formatação em código do projeto. | `bun run format` num commit isolado, excluindo `src/integrations/` (gerado). |
| T-04 | baixo  | 6 `eslint-disable` de `react-hooks/exhaustive-deps` (`CommunitySubmitDialog.tsx:40`, `news-engagement.ts:43`, `community-experiences.tsx:86`, `experiences.tsx:160`, `map.tsx:106,112`). | Rever caso a caso. |

## 6. Código morto e duplicados

| ID   | Grav.  | Local | Problema |
| ---- | ------ | ----- | -------- |
| D-01 | médio  | `src/lib/itinerary-model.ts` | Ficheiro inteiro sem importadores (`draftItinerary`, `buildItineraryOptionSet`, …). |
| D-02 | médio  | `src/data/destination-itinerary-map.ts` | Sem importadores; mapeia destinos para roteiros de amostra (H-05). |
| D-03 | médio  | `src/contexts/AuthContext.tsx:45`, `:92`, `:275`, `:284`, `:306` | `computeLevel`, `isGuestModeActive`, `addXP`, `visitDestination`, `registerBusiness` (stub que falha sempre) não têm consumidores, mas fazem parte da API do contexto. |
| D-04 | médio  | `src/routes/home.tsx:103` e `src/data/treasure-stops.ts:14`; `src/contexts/AuthContext.tsx:81` e `:227` | Lógica duplicada: `STORY_STOPS` construído duas vezes a partir de `SAMPLE_ITINERARIES`; objeto convidado duplicado (`GUEST_USER` vs literal em `loginAsGuest`). |
| D-05 | baixo  | `src/components/Stub.tsx` | Sem importadores (`makeStubRoute`, `Stub`). |
| D-06 | baixo  | `src/data/experiences.ts` | Só reexporta tipos; sem importadores. |
| D-07 | baixo  | `src/data/game-tasks.ts:61,72`, `src/data/treasure-stops.ts:71,82`, `src/data/news.ts:101`, `src/data/itinerary-coords.ts:69` | Exports sem consumidores (ver L-05, H-11). |
| D-08 | baixo  | `src/lib/bookings.ts:213` `fetchBusinessBookings`, `business-dashboard.ts:2` `bookingStates`, `businesses.ts:25` `fetchOwnBusiness`, `destinations.ts:106` `findDestinationBySlug`, `experiences.ts:142` `fetchExperiencesByDestination`, `experiences.ts:181` `fetchOwnExperiences`, `games.ts:9` `QUIZ_PASS_RATIO` | Exports sem uso (nem em testes). `quizPassed`, `isRealisedBooking` e `SUPPORTED_ROUTING_MODES` são usados só em testes — manter. |
| D-09 | baixo  | 26 componentes `src/components/ui/*` (accordion, alert, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, radio-group, resizable, scroll-area, sidebar, table, toggle-group) + `src/hooks/use-mobile.tsx` (só usado por `ui/sidebar`) | shadcn não usado. É habitual mantê-los; remover só se se quiser reduzir dependências Radix. |

---

## Verificações

| Verificação | Estado | Nota |
| ----------- | ------ | ---- |
| `bunx tsc --noEmit` | **PASS** | 0 erros |
| `bun run lint` | **FAIL** | 29 204 problemas: 24 784 CRLF (artefacto), 4 391 formatação real, 12 `no-explicit-any`, 17 avisos |
| `supabaseAdmin` só em `.server.ts` ou dentro de handlers | **PASS** | S-01 |
| Sem chaves secretas no repositório/histórico | **PASS** | S-04 |
| `.env` fora do controlo de versões | **FAIL** | S-03 (só chaves públicas) |
| Registo de negócio público seguro (S-02) | **BLOCKED** | Requer projeto Supabase de teste e contas QA; nenhuma escrita na BD feita |
| Sem `localStorage` como fonte de verdade | **FAIL** | L-01, L-02, L-03 |
| Sem dados turísticos fictícios | **FAIL** | H-01..H-07 |
| Chamadas Supabase com tratamento de erro | **FAIL** | 18 de 163 sem leitura de `error` (E-01..E-13) |
| Hooks de dados com estado de loading/erro | **PASS** | Hooks de catálogo e roteiros; exceção `news-engagement` (E-04) |
| Código morto | **FAIL** | D-01..D-09 |
| `bun run build` | **NOT RUN** | Gera `.output/` e pode regenerar `src/routeTree.gen.ts`; o bloco proíbe alterar ficheiros |
| `bunx vitest run` | **NOT RUN** | Fora do âmbito pedido; a config Vite carrega o plugin do router, que pode regenerar `routeTree.gen.ts` |
| Coerência dados do código vs BD (ex.: chaves `g1..g21` em `game_catalog`) | **NOT RUN** | Sem acesso à BD numa auditoria só de leitura |

### Itens que requerem DB (para o responsável)

1. Tabela de favoritos por utilizador + RLS (L-03).
2. Fonte para "KM explorados", ou remover a métrica (L-01).
3. Tabela de alertas de estrada curados (H-02) e de notícias/eventos curados (H-03, H-04) + RLS. As participações existentes em `event_participations` referem eventos fictícios.
4. Ligação das paragens dos jogos a `destinations` (H-06).
5. Textos PT/EN em `game_catalog` (H-07, opcional).
6. RPC atómica para substituir `profile_provinces` (E-02).
7. Uniformizar `businesses.province` existente (E-09).
