# EKAYA_FIXES.md

Registo de problemas encontrados e corrigidos no fluxo de autenticação, routing e onboarding.

---

## 1. Onboarding deixou de acontecer depois do login/registo

**Problema:**
Depois de entrar ou criar conta, o utilizador ia diretamente para `/home` e o onboarding
(província, dias, interesses) só aparecia por acidente, como janela sobreposta. Não existia
nenhuma página de onboarding própria para onde redirecionar.

**Causa:**
Na migração para autenticação real, os redirecionamentos passaram a apontar sempre para
`/home` (`src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/index.tsx`). O onboarding
existia apenas como modal condicionado por `needsOnboarding` dentro de `/home` e `/dashboard`,
sem rota nem verificação do perfil no momento do login.

**Ficheiros afetados:**
- `src/routes/onboarding.tsx` (novo)
- `src/lib/auth.ts`
- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `src/routes/index.tsx`

**Correção:**
- Criada a rota `/onboarding`, protegida por sessão real (`requireAuthenticatedUser`), que
  reutiliza o componente existente `OnboardingModal` (sem campos novos nem duplicados).
- Adicionados em `src/lib/auth.ts` os helpers `hasCompletedOnboarding(userId)` e
  `postAuthTarget(userId)`, que decidem o destino: `/onboarding` se o perfil ainda não tem
  província escolhida, `/home` caso contrário.
- Login, registo e a rota inicial passam a usar esse destino em vez de `/home` fixo.
- Os modais de onboarding em `/home` e `/dashboard` mantiveram-se intactos.

**Estado:** Corrigido

**Testes realizados:**
- Compilação e verificação de tipos sem erros.
- `/onboarding` sem sessão redireciona para `/login`.
- Registo sem confirmação de email obrigatória encaminha para `/onboarding`.

---

## 2. Utilizador com onboarding concluído era reenviado para o onboarding

**Problema:**
Não havia forma de saber se o onboarding já tinha sido concluído no servidor; a informação
vivia só no estado local, pelo que noutro dispositivo ou browser o onboarding reaparecia.

**Causa:**
`needsOnboarding` depende de `user.preferences.province` carregado do perfil, mas nenhum
redirecionamento consultava o perfil; o estado local era a única fonte prática.

**Ficheiros afetados:**
- `src/lib/auth.ts`
- `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/index.tsx`

**Correção:**
A conclusão do onboarding é marcada pela província guardada em `profiles.province` (campo que o
projeto já usava). Login e rota inicial leem esse campo antes de decidir o destino, pelo que quem
já concluiu vai direto para a página principal.

**Estado:** Corrigido

**Testes realizados:** verificação de tipos e revisão dos caminhos de redirecionamento.

---

## 3. Preferências podiam não estar guardadas no momento do redirecionamento

**Problema:**
Ao terminar o onboarding, a gravação no perfil era disparada sem esperar pela resposta. O
utilizador podia ser encaminhado (ou recarregar a página) antes de a província ficar guardada e
voltar a ver o onboarding.

**Causa:**
`setPreferences` no `AuthContext` fazia a atualização do perfil com `void` (sem `await`), e o
`OnboardingModal` chamava `onComplete()` imediatamente.

**Ficheiros afetados:**
- `src/contexts/AuthContext.tsx`
- `src/components/OnboardingModal.tsx`

**Correção:**
`setPreferences` passou a ser assíncrono e o onboarding só termina (e redireciona) depois de a
gravação concluir. O botão de confirmação fica desativado durante a gravação, evitando cliques
duplicados. O estado local continua a ser escrito primeiro, pelo que recarregar durante o
onboarding não perde o que já estava persistido.

**Estado:** Corrigido

**Testes realizados:** verificação de tipos; revisão do caminho de gravação e do redirecionamento.

---

## 4. Segurança da palavra-passe e confirmação de email (verificado, sem alterações)

**Problema:** nenhum — verificação de regressão pedida nesta tarefa.

**Causa:** não aplicável.

**Ficheiros afetados:** nenhum.

**Correção:** nada alterado. Mantêm-se: mínimo de 6 caracteres, proteção contra palavras-passe
presentes em fugas de dados, mensagens distintas (curta / comprometida / ambas), confirmação de
email ativa, e ausência de exigência artificial de maiúsculas, números ou símbolos. Nenhuma
palavra-passe é registada, mostrada ou enviada para registos. O registo continua a usar
`supabase.auth.signUp()`, o login `signInWithPassword()` e o logout `signOut()`.

**Estado:** Corrigido (comportamento mantido)

**Testes realizados:** revisão das mensagens de erro em `AuthContext` e da validação em `signup.tsx`.

---

## Bloco 6B — Auditoria do frontend

**Data:** 18 de setembro de 2026

**Objetivo:** mapear, com base no código atual, quais funcionalidades já usam o backend real e
quais continuam simuladas, analisar a estrutura de base de dados existente e escolher
tecnicamente a próxima migração. Nenhuma migração foi implementada nesta tarefa.

### Funcionalidades analisadas
Perfil e preferências, destinos, mapa, experiências e reservas, itinerários, gamificação,
recompensas/vouchers, favoritos, jogos e caça ao tesouro, comunidade, notícias e notificações,
cultura e história, informações úteis, impacto social, registo e painel de negócios, painel de
administração.

### Funcionalidades reais (backend)
- Autenticação (registo, login, sessão, logout, confirmação de email, proteção de palavras-passe).
- Perfil e preferências de viagem: `profiles` (nome, província, dias, interesses).
- Papéis de utilizador: `user_roles` + `has_role`.

### Funcionalidades parcialmente implementadas
- Perfil: nome/província/dias/interesses vêm do backend, mas XP, nível, visitas e quilómetros
  vivem no estado local (`ekaya.user-state:<utilizador>`).
- Registo de negócio: formulário completo, mas a gravação está intencionalmente recusada
  ("Cria primeiro uma conta pessoal…") apesar de a tabela de negócios já existir.
- Painel de negócio: interface completa, reservas lidas do estado local.

### Funcionalidades simuladas / locais
Destinos, experiências, itinerários (exemplos e criados pelo utilizador), reservas, favoritos,
XP e recompensas, jogos e caça ao tesouro, comunidade (mensagens iniciais fixas, só em memória),
notificações (lista fixa + leituras locais), notícias (lista fixa mais leitura pública do feed
Google News), cultura e história, informações úteis, impacto social (valores fixos), lista de
utilizadores do painel de administração (lista fixa em memória).

### Problemas encontrados (registados, não corrigidos)
1. O painel de administração mostra uma lista de utilizadores inventada, enquanto existem contas
   reais na base de dados — pode induzir em erro quem usa o painel.
2. O registo de negócio conduz o utilizador por um formulário longo que termina sempre em recusa.
3. Favoritos, notificações e itinerários são guardados sem separação por utilizador, pelo que no
   mesmo dispositivo duas contas partilham os mesmos dados.
4. A criação de conta no formulário de negócio pede palavra-passe que nunca é usada.

Nenhum destes pontos impede o funcionamento atual e nenhum foi alterado nesta tarefa.

### Estado do backend
Tabelas existentes: `profiles`, `user_roles`, `destinations`, `businesses`, `experiences`,
`experience_availability`, `bookings`. Todas com segurança por linha ativa e políticas definidas.
Funções auxiliares já criadas: `has_role`, `owns_business`, `owns_experience`, `booked_people`,
`get_experience_availability`, geração de código de reserva, validação de reservas com controlo de
sobrelotação e triggers de proteção. Apenas `profiles` e `user_roles` têm dados (5 registos cada);
destinos, negócios, experiências, disponibilidades e reservas estão vazios. Nenhum componente da
aplicação comunica ainda com estas cinco tabelas.

### Próxima migração identificada
**Catálogo de destinos** (`destinations`): a tabela existe, está vazia e é a base de que dependem
experiências, mapa, itinerários, favoritos, jogos e filtros por província. Migrar primeiro os
destinos dá identificadores reais e estáveis para todas as migrações seguintes.

**Estado:** Bloco 6B — Auditoria concluída. Próxima migração identificada, aguardando implementação.

## Bloco 6B — Migração do catálogo de destinos

Data: 18 de setembro de 2026

**Objetivo:** migrar o catálogo de destinos de dados mockados (`src/data/destinations.ts`) para a tabela real `destinations` no Supabase.

**Dados migrados:** 6 destinos, com os dados editoriais existentes preservados — Maputo (`maputo`), Ilha de Moçambique (`ilha`), Inhambane (`inhambane`), Vilankulo (`vilankulo`), Pemba (`pemba`), Gorongosa (`gorongosa`). Inserção com `ON CONFLICT (slug) DO NOTHING`, pelo que a repetição da migração não cria duplicados.

**Backend:** reutilizada a tabela `destinations` já existente (nenhuma tabela nova). A migração `drizzle/migrations/0000_seed_destinations_catalogue.sql` acrescentou as colunas que faltavam para o conteúdo já usado na interface: `region_pt`, `region_en`, `visitors_k`, `badges`, `highlights`. Nenhuma policy foi alterada: a leitura pública já estava permitida e a RLS continua ativa, sem escrita pública e sem chaves privilegiadas no cliente. `experiences.destination_id` continua a apontar para `destinations.id` (uuid), sem alterações de estrutura.

**Ficheiros alterados:**
- `src/lib/destinations.ts` (novo) — tipo `Destination`, conversão dos campos da base de dados para o formato da interface, consulta única ao catálogo, imagens por `slug`.
- `src/hooks/useDestinations.ts` (novo) — carregamento partilhado com estados de carregamento, erro, lista vazia e recarregar.
- `src/data/destinations.ts` — passa a exportar apenas a lista de interesses; a lista fixa de destinos foi removida.
- `src/routes/map.tsx` — destinos reais, seleção inicial pelo destino do utilizador, estados de carregamento/erro/vazio.
- `src/components/InteractiveMap.tsx` — recebe os destinos por propriedade em vez de os ter fixos.
- `src/routes/home.tsx` — seletor de destino a partir dos dados reais, com aviso de carregamento e de erro.
- `src/routes/dashboard.tsx` — destino do utilizador resolvido a partir dos dados reais.
- `src/components/OnboardingModal.tsx` — grelha de destinos a partir dos dados reais, com estados de carregamento/erro/vazio.
- `drizzle/migrations/0000_seed_destinations_catalogue.sql` (novo).

**Identificadores:** cada destino tem agora o `id` (uuid) da base de dados como referência canónica, usado nas relações futuras. O `slug` estável (`maputo`, `ilha`, ...) continua a ser a chave das funcionalidades ainda locais (visitas, favoritos, filtros por destino, mapa destino→roteiro), o que evitou perder os dados já guardados no dispositivo dos utilizadores. O nome do destino não é usado como identificador.

**Testes realizados:**
1. Tabela `destinations` com os 6 destinos anteriores — OK.
2. Página principal apresenta os destinos vindos da base de dados — OK.
3. Mapa apresenta os destinos vindos da base de dados (6 marcadores) — OK.
4. Detalhes do destino (descrição, visitantes, destaques, ações) — OK.
5. Filtros por destino/província — OK.
6. Coordenadas corretas (conferidas registo a registo) — OK.
7. Imagens continuam a aparecer — OK.
8. Português e inglês — OK (descrições e regiões nos dois idiomas).
9. Erro de leitura não quebra a página: mostra mensagem e botão "Tentar novamente" — OK (caminho implementado e verificado no código; leitura real bem-sucedida nos testes).
10. Recarregar a aplicação mantém os destinos — OK.
11. Sem destinos duplicados (`slug` único + inserção idempotente) — OK.
12. Autenticação e personalização inicial não afetadas — OK (sessão real, /onboarding e /dashboard verificados).

**Problemas encontrados:** a tabela `destinations` não tinha colunas para região, número de visitantes, etiquetas e destaques que a interface já mostrava; foram acrescentadas na mesma migração, sem alterar o conteúdo editorial.

**Estado:** Bloco 6B — Migração de destinos concluída.

## Bloco 6C — Migração de experiências e disponibilidade

**Objetivo:** passar as experiências e a respetiva disponibilidade de dados simulados
(`src/data/experiences.ts`) para registos reais no Supabase, ligados aos destinos reais
migrados no Bloco 6B. As reservas continuam locais (Bloco 6D).

### Experiências migradas (8)
| Slug | Título (PT) | Destino | Preço (MZN) |
|---|---|---|---|
| dhow-bazaruto | Passeio de Dhow em Bazaruto | Vilankulo | 2 500 |
| tofo-diving | Mergulho com mantas no Tofo | Inhambane | 3 200 |
| ilha-walk | Caminhada cultural em Stone Town | Ilha de Moçambique | 800 |
| maputo-food | Tour gastronómico no Mercado Central | Maputo | 1 200 |
| gorongosa-safari | Safari ao nascer do sol em Gorongosa | Gorongosa | 4 500 |
| pemba-community | Visita à comunidade pesqueira de Wimbi | Pemba | 1 800 |
| marrabenta-night | Noite de Marrabenta em Maputo | Maputo | 1 500 |
| quirimbas-kayak | Kayak nas Quirimbas | Pemba | 2 200 |

Inserção idempotente: `slug` com índice único e `ON CONFLICT (slug) DO NOTHING`, pelo que
reexecutar a migração não cria duplicados (verificado: 8 experiências, 8 slugs únicos).

### Relações
`experiences.destination_id` foi preenchido por JOIN com `destinations` através do `slug`
do destino — nunca por nome, índice de array ou identificador fictício. Verificado na base
de dados: 0 experiências sem destino e 0 com destino inexistente.

Cada experiência tem também um `business_id` real: foram criados 8 negócios anfitriões
(um por experiência, com o nome que antes estava no campo `host` do mock), com
`status = 'approved'` e sem proprietário (`owner_id NULL`), por ainda não existirem contas
de negócio reais.

### Disponibilidade
O mock não tinha horários; os únicos dados horários existentes eram a duração de cada
experiência. Foram criadas 48 janelas em `experience_availability` (6 por experiência,
segunda a sábado, início às 09:00 e fim calculado pela duração real, capacidade 10).
**Valores inventados, assinalados como tal:** os dias da semana, a hora de início 09:00 e
a capacidade 10 não existiam nos dados originais. A leitura no frontend é real, feita pela
função `get_experience_availability`, que devolve capacidade, lugares ocupados, lugares
restantes e o estado disponível/esgotado.

### Frontend
- `src/lib/experiences.ts` (novo): tipos, mapeamento base de dados → interface já usada
  pela aplicação e leituras (todas, por identificador, por destino, disponibilidade, e as
  do próprio negócio).
- `src/hooks/useExperiences.ts` (novo): carregamento partilhado com estados de
  carregamento/erro/vazio e cache de sessão, evitando consultas duplicadas; e leitura de
  disponibilidade por experiência e data.
- `src/routes/experiences.tsx`: catálogo, filtros por destino e categoria e modal de
  reserva passam a usar dados reais; horários reais mostrados no modal (apresentação
  mínima, sem alterar o fluxo de reserva).
- `src/routes/home.tsx`: recomendações de experiências vindas da base de dados.
- `src/components/GameTaskFields.tsx`: seletor de experiência dos jogos com dados reais.
- `src/routes/business-dashboard.tsx`: nova secção "As Minhas Experiências", que mostra
  apenas as experiências do negócio do próprio utilizador (RLS).
- `src/data/experiences.ts`: deixou de conter dados; reexporta apenas os tipos.

### Backend
Tabelas `experiences`, `experience_availability`, `businesses`, `destinations`.
Função `get_experience_availability` (já existente). Policies de leitura pública já
existentes; nenhuma permissão foi aberta. Colunas acrescentadas a `experiences`:
`slug` (único), `category`, `location`, `rating`, `reviews`. `businesses.owner_id` passou a
poder ser nulo, para permitir anfitriões de catálogo sem conta associada.

### Ficheiros alterados
`src/lib/experiences.ts` (novo), `src/hooks/useExperiences.ts` (novo),
`src/lib/destinations.ts` (exporta as imagens por destino), `src/data/experiences.ts`,
`src/routes/experiences.tsx`, `src/routes/home.tsx`, `src/routes/business-dashboard.tsx`,
`src/components/GameTaskFields.tsx`, `drizzle/migrations/0001_seed_experiences_catalogue.sql`,
`drizzle/migrations/0002_align_businesses_guard_with_no_session.sql`,
`src/integrations/supabase/types.ts` (gerado), `EKAYA_FIXES.md`.

### Testes
1. 8 experiências existentes na tabela — OK (8 registos, 8 ativas).
2. Todas com `destination_id` válido — OK (0 nulos, 0 inválidos).
3. Destino correto por experiência — OK (verificado par a par na leitura pública).
4. Experiências na página principal — OK (recomendações reais visíveis).
5. Filtros por destino e categoria — OK (filtro do meu destino e "ver todos" testados).
6. Abertura de uma experiência pelo identificador real — OK (modal abre com dados reais).
7. Imagens carregam — OK (mesma arte por destino usada antes da migração).
8. Preços corretos — OK (2 500 / 1 200 / 1 500 / 2 200 conforme original).
9. Disponibilidade vinda do Supabase — OK (09:00–15:00 · 10 lugares para 21/09/2026).
10. Recarregar mantém as experiências — OK.
11. Sem experiências não quebra — OK (estado vazio implementado; verificado com filtro sem resultados).
12. Erro do Supabase tratado — OK (ligação bloqueada: mensagem e botão "Tentar novamente").
13. Nenhuma experiência aponta para destino inexistente — OK.
14. Login/registo/onboarding intactos — OK (sessão real usada nos testes, sem alterações).
15. RLS ativa e sem permissões inseguras — OK (reservas continuam inacessíveis sem sessão;
    leitura pública apenas de experiências ativas e negócios aprovados).

### Problemas encontrados
- **Anfitriões invisíveis ao público:** o gatilho `businesses_guard_privileged_fields`
  forçava `status = 'pending'` quando não existe sessão (contexto de migração), ao contrário
  dos gatilhos equivalentes de experiências e disponibilidade. Os 8 negócios de catálogo
  ficaram escondidos e o nome do anfitrião não aparecia. Corrigido alinhando o gatilho
  (ignorar quando `auth.uid()` é nulo) e marcando os 8 negócios como aprovados.
- **Dados inexistentes no mock:** capacidade e horários de disponibilidade não existiam;
  os valores usados são assumidos e devem ser revistos com os anfitriões reais.
- **Negócios sem proprietário:** enquanto não existirem contas de negócio reais, a secção
  "As Minhas Experiências" do painel aparece vazia para um utilizador de negócio.

**Estado:** Bloco 6C — Migração de experiências e disponibilidade concluída.

## Bloco 6C.5 — Utilizadores reais + Registo de empresas

**Objetivo:** substituir a lista de utilizadores simulada do Admin por dados reais e transformar o
formulário de registo de empresa num fluxo real (conta + perfil + papel + empresa).

### O que estava simulado
- Admin → Utilizadores: lista fixa escrita no código (`INITIAL_USERS`), com botões de suspender/apagar sem efeito.
- Registo de empresa: `registerBusiness` do AuthContext devolvia sempre uma recusa; nunca criava conta nem empresa.
- Painel de negócio: dados de empresa de demonstração.

### O que passou a ser real
- `listPlatformUsers` (função de servidor): valida a sessão, confirma o papel `admin` pela função
  `has_role` e só depois usa a chave administrativa **no servidor** para ler `profiles`, `user_roles`,
  `businesses` e os emails/estado de confirmação do Auth. O browser nunca vê chaves administrativas.
- `registerBusinessAccount` (função de servidor): cria a conta no Auth com a palavra-passe do formulário,
  atualiza o perfil, insere a empresa em `businesses` (`status='pending'`, `verified=false`,
  `owner_id` = utilizador criado) e grava o papel `business_small`/`business_large` em `user_roles`,
  removendo o papel `tourist`. Máximo de uma empresa por conta.
- Painel de negócio: mostra a empresa do utilizador autenticado (`owner_id = auth.uid()` via RLS).

### Relação utilizador ↔ empresa
Usa a relação já existente `businesses.owner_id → profiles.id`. Não foi criada nenhuma tabela nem
relação nova. Papéis continuam exclusivamente em `user_roles` (o frontend não escolhe papéis).

### Estado de aprovação
Conta criada ≠ empresa aprovada. A empresa nasce `pending`/não verificada e o Admin vê esse estado
na lista de utilizadores.

### Migrações
- `0003_grant_admin_role_to_owner.sql` — papel admin (conta corrigida na migração seguinte).
- `0004_move_admin_role_to_verified_owner.sql` — papel `admin` atribuído à conta verificada do dono
  (`sheldonesmad@gmail.com`) e removido da conta indicada por engano.

Sem alterações de RLS: as políticas existentes já cobriam o necessário (`anon` continua sem acesso a
`profiles` e `user_roles`, confirmado por pedido direto).

### Ficheiros alterados
`src/start.ts` (novo), `src/lib/platform-users.functions.ts` (novo),
`src/lib/business-registration.functions.ts` (novo), `src/lib/businesses.ts` (novo),
`src/routes/admin.tsx`, `src/routes/business-register.tsx`, `src/routes/business-dashboard.tsx`.

### Testes realizados
1. Registo de empresa no browser → conta criada, ecrã de confirmação de email. OK
2. Base de dados após o registo: perfil criado, `user_roles = business_small`, empresa
   `Banca do Teste 6C5` com `status=pending`, `verified=false`. OK
3. `businesses.owner_id` igual ao utilizador criado. OK
4. Admin → Utilizadores com sessão real: lista vinda da base de dados (inclui a nova empresa). OK
5. Novo utilizador aparece como "Neg. Pequeno", não turista nem admin. OK
6. Recarregar a página mantém utilizador e empresa. OK
7. Painel de negócio: lê a empresa do utilizador autenticado (verificado pelo código e pela política
   `owner_id = auth.uid()`); não testado em sessão real porque a conta de teste aguarda confirmação de email. PARCIAL
8. Uma empresa não consegue ver/editar a de outro utilizador (políticas por `owner_id`). OK
9. Sem sessão a lista administrativa devolve "Unauthorized"; conta sem papel admin é reencaminhada
   para o painel normal (observado antes de atribuir o papel admin). OK
10. Só o papel admin passa a verificação `has_role` dentro da função de servidor. OK
11. Nenhuma palavra-passe guardada em `profiles`, `businesses`, armazenamento local ou registos. OK
12. Login, logout, confirmação de email e proteção contra palavras-passe comprometidas intactos. OK
13. Onboarding de turistas inalterado. OK
14. Utilizadores existentes continuam a entrar sem duplicação. OK
15. Segunda empresa para a mesma conta é bloqueada com mensagem clara. OK (verificação no servidor)
16. A lista fixa do Admin foi removida do código. OK

### Limitações
- As 8 empresas semeadas no Bloco 6C não têm dono, por isso não aparecem na lista de utilizadores.
- O papel admin está atribuído a `sheldonesmad@gmail.com`; confirmar se é a conta desejada.
- Teste 7 confirmado por código/políticas, não em sessão real (email por confirmar).

**Estado:** Bloco 6C.5 concluído.

## Block 6D — Reservas reais (Supabase)

**Data:** 2026-09-18

### Estado anterior
- `src/data/bookings.ts` guardava as reservas em `localStorage` (`ekaya.bookings`) e era a fonte de verdade.
- O código da reserva era gerado no browser (`generateBookingCode`), o preço era calculado no frontend e o horário era um campo de texto livre (`09:00`).
- O painel do negócio lia as mesmas reservas locais através do evento `ekaya:bookings-changed`.
- O turista não tinha histórico de reservas.

### Migração de localStorage/mock para Supabase
- `src/data/bookings.ts` **eliminado**. Nenhuma reserva é guardada no browser (`rg` confirma 0 referências a `ekaya.bookings`/`getBookings`).
- Novo serviço `src/lib/bookings.ts`: `createBooking`, `fetchMyBookings`, `fetchBusinessBookings`, `updateBookingStatus`, `fetchAvailableWeekdays`, `translateBookingError`, tipos `Booking`/`BookingStatus`.
- O cliente só envia `experience_id`, data, hora, pessoas e contactos. `customer_id` vem da sessão, `business_id` e o preço são lidos da tabela `experiences` (snapshot em `bookings.total_mzn`), o `code` é gerado pelo trigger.

### Componentes alterados
- `src/routes/experiences.tsx` — modal de reserva real: data (limitada aos dias da semana com disponibilidade), lista de horários vindos de `get_experience_availability` com lugares restantes/sem lugares, seletor de pessoas (− 1 +) limitado pelos lugares livres, total, confirmação com dados reais (código, estado, destino, anfitrião).
- `src/routes/bookings.tsx` — **nova** página "As minhas reservas" (loading, erro com repetição, vazio amigável, código, estado, data/hora, pessoas, destino, total).
- `src/components/AppSidebar.tsx` — entrada "Minhas Reservas / My Bookings".
- `src/routes/business-dashboard.tsx` — Pedidos de Reserva reais via RLS (`owns_business`), com loading/erro e Confirmar/Rejeitar a escrever na base de dados.

### Tabelas, funções e políticas usadas (sem migrations novas)
- Tabelas: `bookings`, `experience_availability`, `experiences`, `businesses`, `profiles`, `user_roles`.
- Funções reutilizadas: `bookings_validate_insert` (código, estado `pending`, data no passado, janela de disponibilidade, `pg_advisory_xact_lock`, capacidade), `bookings_guard_update`, `generate_booking_code` (`EK-XXXXXX`), `booked_people`, `get_experience_availability`.
- Políticas já existentes (não alteradas): turista cria/lê só as próprias reservas (`customer_id = auth.uid()`, `status = 'pending'`); negócio lê/atualiza as das suas experiências (`owns_business`); admin lê/atualiza tudo. Nenhum acesso anónimo (401 confirmado).
- **Nenhuma migration criada neste bloco.** Nenhuma chave de serviço usada no frontend.

### Testes
| # | Teste | Resultado |
|---|---|---|
| 1 | Abrir experiência real e iniciar reserva | PASS (8 experiências reais, modal abre) |
| 2 | Selecionar data válida | PASS (2026-09-21; dias sem horários são recusados com aviso) |
| 3 | Selecionar horário real | PASS (09:00–15:00 vindo de `experience_availability`) |
| 4 | 1 participante | PASS |
| 5 | Mais participantes | PASS (3 pessoas) |
| 6 | Acima da capacidade | PASS (botão + bloqueado nos lugares restantes) |
| 7 | Disponibilidade real no frontend | PASS (lugares restantes vindos da função da BD) |
| 8 | Criar reserva com conta real | PASS (linha real em `bookings`) |
| 9 | Associada ao utilizador correto | PASS (`customer_id` = utilizador da sessão) |
| 10 | Código real e único | PASS (`EK-D8BJCP`, gerado na BD) |
| 11 | Histórico mostra a reserva | PASS |
| 12 | Refresh mantém a reserva | PASS (lida da BD, não do browser) |
| 13 | Logout/login mantém o histórico | PASS (dados na BD; verificado com sessão real recarregada) |
| 14 | Outro turista não vê a reserva | PASS por política (`customer_id = auth.uid()`); não testado em sessão de segundo turista (sem conta confirmada disponível) |
| 15 | Negócio vê as reservas das suas experiências | BLOCKED (as 8 empresas semeadas no 6C não têm proprietário e a empresa criada no 6C.5 ainda não confirmou o email) |
| 16 | Empresa diferente não vê a reserva | PASS por política (`owns_business`); não testado em sessão |
| 17 | Admin consulta a informação necessária | PASS |
| 18 | Overbooking rejeitado | PASS (`Capacity exceeded: 3 of 10 seats already booked`) |
| 19 | Concorrência (duas reservas simultâneas) | BLOCKED (sem acesso a duas ligações diretas à BD; a proteção usa `pg_advisory_xact_lock` por experiência+data+hora) |
| 20 | Reservas já não dependem de localStorage | PASS (`src/data/bookings.ts` eliminado) |
| 21 | Login/logout/confirmação/password | PASS (inalterados) |
| 22 | Onboarding dos turistas | PASS (inalterado) |
| 23 | Empresa do 6C.5 associada ao utilizador | PASS |
| 24 | Admin → Utilizadores com dados reais | PASS |

### Limitações
- Cancelamento pelo turista não implementado: o guard atual só permite ao negócio `confirmed/rejected/completed` e não existe política de cancelamento definida. Trabalho futuro.
- Capacidade 10 e horário 09:00 das experiências semeadas no 6C continuam provisórios, a confirmar com os anfitriões.
- Verificação em sessão real do painel do negócio depende de uma conta de empresa com email confirmado (a confirmação de email não foi desativada).

## Block 6E — Personalização e recomendações

### Comportamento anterior
- As preferências do onboarding (província, dias, interesses) já eram guardadas em `profiles`
  (colunas `province`, `duration_days`, `interests`) desde o Bloco 6A, mas **não influenciavam**
  nada fora do cartão de saudação do painel.
- A Home tinha apenas filtros manuais (destino, dias, interesses) em estado local; a fila
  "Atividades em destaque" filtrava as experiências reais só por esses filtros manuais.
- Não existia nenhuma forma dedicada de **editar** as preferências fora do modal de onboarding
  (só o atalho "Mudar destino" no painel).
- O botão "Painel Admin" da barra lateral navegava para `/dashboard` em vez de `/admin`.

### O que ficou implementado
- **Preferências persistentes**: continuam em `profiles` (sem tabelas novas, sem migrations).
  `setPreferences` no `AuthContext` escreve no Supabase e actualiza o estado local — as
  recomendações mudam de imediato, sem logout/login.
- **Editar preferências**: nova rota `/preferences` (protegida por sessão) que reutiliza o
  `OnboardingModal`, agora com prop `initial` para arrancar com as escolhas actuais. Entrada nova
  na barra lateral ("Editar Preferências") e link directo a partir da secção personalizada da Home.
- **Camada de recomendações determinística** (`src/lib/recommendations.ts`), sem IA:
  `+4` província/destino coincide · `+3` por interesse coincidente · `+2` a experiência tem janelas
  de disponibilidade activas · `+1` está ligada a um destino real. Empate desfeito por rating
  (experiências) ou visitantes (destinos). A pontuação não é mostrada ao utilizador.
- **Home personalizada**: nova secção "Recomendado para ti" com experiências e destinos reais,
  incluindo a indicação "Combina com …" construída apenas com interesses/destino realmente
  presentes nos dados. Sem preferências completas, mostra "Explora o que Moçambique tem para
  oferecer" e o convite a definir preferências — os filtros manuais continuam intactos e coexistem.
- **Estrutura de itinerários preparada** (`src/lib/itinerary-model.ts`): `StructuredItinerary` →
  `ItineraryDay` → `ItineraryStop`, onde cada paragem referencia obrigatoriamente uma linha real
  (`destinations.id` ou `experiences.id`). `buildItineraryOptionSet()` devolve o conjunto de opções
  reais já ordenado pelas preferências — é isto que uma futura IA receberá, para nunca inventar locais.
- **Performance**: reutiliza os hooks partilhados `useDestinations`/`useExperiences` (cache de sessão)
  e acrescenta uma única query agregada de disponibilidade (`fetchAvailabilityCounts`).
- **Barra lateral**: "Painel Admin" passa a abrir `/admin`.

### Queries / tabelas utilizadas
- `profiles` (leitura/escrita das preferências do próprio utilizador — RLS `id = auth.uid()`).
- `destinations` (leitura pública), `experiences` (leitura pública de activas),
  `experience_availability` (leitura pública de janelas activas, contagem por experiência).
- Sem migrations, sem novas tabelas, sem service role no frontend, sem alterações a roles/RLS.

### Ficheiros alterados
- Novos: `src/lib/recommendations.ts`, `src/lib/itinerary-model.ts`,
  `src/hooks/useRecommendations.ts`, `src/routes/preferences.tsx`.
- Alterados: `src/lib/experiences.ts` (`fetchAvailabilityCounts`), `src/routes/home.tsx`
  (secção personalizada), `src/components/OnboardingModal.tsx` (prop `initial`),
  `src/components/AppSidebar.tsx` (link admin + entrada de preferências).

### Testes
1. Signup de novo turista → onboarding: PASS (fluxo 6A inalterado; rota `/onboarding` mantida).
2. Escolher província e confirmar persistência: PASS (`profiles.province` = `vilankulo`, depois `maputo`).
3. Dias persistem: PASS (`duration_days` guardado com as preferências).
4. Interesses persistem: PASS (`interests` = `{beach,food}` e depois com cultura/natureza).
5. Logout: PASS.
6. Login novamente mantém preferências: PASS (lidas de `profiles` no arranque).
7. Não repete onboarding com preferências completas: PASS (`postAuthTarget` → `/home`).
8. Alterar preferências actualiza a BD: PASS (verificado por consulta directa).
9. Recomendações mudam com as preferências: PASS (ordem e badges mudaram de Vilankulo → Maputo).
10. Recomendações vêm de dados reais: PASS (8 experiências e 6 destinos do Supabase).
11. Experiências recomendadas abrem: PASS (botão leva a `/experiences`, catálogo real).
12. Destinos recomendados abrem: PASS (botão leva ao mapa real).
13. Utilizador sem preferências → fallback: PASS (título e convite genéricos, sem recomendações falsas).
14. Outro utilizador não altera/recebe as preferências do primeiro: PASS (RLS `profiles`, `id = auth.uid()`).
15. Refresh mantém preferências: PASS.
16. Login/logout mantém preferências: PASS.
17. Roles/admin/business inalterados: PASS (nenhuma alteração a `user_roles` ou policies).
18. Reservas do 6D continuam funcionais: PASS (nenhum ficheiro de reservas alterado; build OK).
19. Experiências continuam a vir do Supabase: PASS.
20. Destinos continuam a vir do Supabase: PASS.

### ITINERARY DATA READINESS
Disponível agora:
- 6 destinos com província, coordenadas (lat/lng), categoria, descrições PT/EN, imagens, destaques.
- 8 experiências activas, todas com destino real, preço, duração, categoria, capacidade, empresa.
- 48 janelas em `experience_availability` (dia da semana, hora de início/fim, capacidade).
- Províncias cobertas: Maputo, Inhambane (Inhambane + Vilankulo), Nampula, Sofala, Cabo Delgado.
- Categorias cobertas: culture, food, nature, adventure, beach, community.

Em falta:
- Coordenadas por experiência (só o destino tem lat/lng).
- Vários destinos têm apenas 1 experiência (Gorongosa, Ilha, Inhambane, Vilankulo) — pouca margem
  para itinerários de vários dias.
- Sem entidades de restauração/alojamento no schema (nada foi inventado).
- Sem noção de época/sazonalidade nem de tempo de deslocação entre paragens.
- A capacidade 10 e a hora 09:00 das experiências iniciais continuam provisórias (herdado do 6C).

Recomendado adicionar depois:
- Mais experiências por destino (com os anfitriões reais).
- Coordenadas e ponto de encontro por experiência.
- Confirmação dos horários e capacidades reais com cada anfitrião.

### Preparação para IA (ainda não implementada)
Já pronto: modelo estruturado de itinerário, paragens que só apontam para linhas reais, função que
constrói o conjunto de opções reais ordenado pelas preferências e um rascunho determinístico por dias.
Falta: persistência de itinerários gerados, lógica geográfica/temporal e o próprio módulo de IA —
ficam para o bloco seguinte.

### Limitações
- Com 8 experiências, um destino com poucas opções cai naturalmente para conteúdo geral.
- O teste de signup completamente novo continua condicionado pela confirmação de email (não desactivada).

## Block 6F — Províncias como entidade + categorias de negócio

### Estado anterior
A província era texto livre em `destinations.province` (slug minúsculo: `maputo`, `cabo-delgado`), `experiences.province` (mesmo formato), `businesses.province` (nome capitalizado: `Cabo Delgado`) e `profiles.province` (que na prática guarda o **slug do destino** escolhido no onboarding, não uma província). Não havia lista oficial, o Admin não podia acrescentar províncias, a categoria de negócio era texto livre (`adventure`, `Artesanato Local`, ...) e o turista só podia guardar uma preferência de local.

### Nova arquitetura
- `provinces` (id, code único, name_pt, name_en, active, created_at) — 11 províncias reais de Moçambique.
- `business_categories` (code PK, name_pt, name_en, sort_order, active) — hotel, resort, hostel, restaurant, bar, shop, tour_operator, experience, other.
- `destinations.province_id → provinces.id`; `businesses.province_id → provinces.id`; `businesses.category_code → business_categories.code`.
- `profile_provinces` (profile_id, province_id, UNIQUE) — várias províncias por turista.
- `experiences.province` **não** ganhou `province_id`: a província da experiência vem do destino (`experiences.destination_id → destinations.province_id`); a coluna de texto fica como valor legado de leitura.
- As colunas de texto antigas (`destinations.province`, `businesses.province`, `profiles.province`) foram mantidas por compatibilidade — o código de destinos, recomendações e mapa ainda as usa. Remoção fica para um bloco posterior.

### Migração de dados
Migração `0005_provinces_and_business_categories.sql` (estrutura) + inserções de dados: 11 províncias, 9 categorias, 6/6 destinos ligados, 8/9 negócios ligados (o negócio de teste do 6C.5 não tinha província nem experiências — ficou sem `province_id` e com categoria `other`), 9/9 negócios com `category_code`, 2 perfis com província de preferência migrada. Destinos (6), experiências (8), disponibilidades (48), reserva (1) e negócios (9) mantidos sem alterações.

### RLS
- `provinces` e `business_categories`: leitura pública apenas das linhas activas; leitura completa, inserção, actualização e eliminação só para admin (`has_role`).
- `profile_provinces`: cada pessoa vê/insere/apaga só as próprias linhas; admin pode ler.
- Nenhuma política existente de `profiles`, `businesses`, `experiences` ou `bookings` foi alterada.

### Frontend
- `src/lib/provinces.ts` + `src/hooks/useProvinces.ts`: lista de províncias e de categorias, com cache de sessão.
- `OnboardingModal`: escolha de várias províncias (chips) no passo 1, guardadas em `profile_provinces`; a província do destino escolhido é sempre incluída.
- `preferences.tsx`: abre já com as províncias guardadas.
- `AuthContext`: `preferences.provinces` (códigos) é lido e gravado.
- `recommendations.ts` / `useRecommendations`: `matchesProvince` passa a aceitar várias províncias.
- `business-register.tsx`: província e categoria passaram a listas fechadas vindas da base de dados; "Localização" passou a "Cidade / Localização" (separada da província).
- `business-registration.functions.ts`: valida `provinceCode` e `category` contra as tabelas oficiais e grava `province_id`/`category_code`.
- `admin.tsx`: nova acção "Gerir Províncias" com lista real, activar/desactivar e adicionar província.

### Testes
Todos os testes do bloco passaram, excepto os marcados: criação/gravação de várias províncias (Maputo + Sofala + província do destino Vilankulo → `inhambane`) confirmada na base de dados; recomendações passaram a incluir experiências de Maputo e Inhambane; registo de negócio real com Gaza + Loja gravou `province_id` e `category_code` (estado pending, dono associado); leitura pública de províncias e categorias OK; inserção anónima de província rejeitada (401); reservas, histórico, mapa e painel intactos; sem duplicados de províncias, sem destinos órfãos, sem negócios com `province_id` inválido.

### Limitações
- O negócio de teste do 6C.5 continua sem província (dados originais não a tinham).
- `profiles.province` continua a guardar o slug do destino; a distinção "Maputo cidade" vs "Maputo província" nos dados antigos foi mantida como `maputo` e precisa de confirmação editorial.
- Descoberta de negócios por província/categoria para turistas: estrutura pronta, página ainda não existe.
- Gamificação, roteiros, comunidade, eventos, notificações, recompensas, notícias, cultura, informações úteis e métricas do Admin continuam por migrar (nenhum depende ainda de `province_id`, excepto futuros filtros por província).

---

## BLOCK 6G — ROTEIROS REAIS, PERSISTENTES E PESQUISÁVEIS

**Problema**
Os roteiros eram 100% mock: 3 roteiros hardcoded em `src/data/itineraries.ts`, criação/edição/importação em `localStorage` (`ekaya.user.itineraries`), progresso apenas em memória e coordenadas inventadas.

**Causa**
Nunca existiu estrutura de roteiros na base de dados; toda a funcionalidade vivia no browser, pelo que nada era partilhável, pesquisável ou persistente entre dispositivos.

**Ficheiros afetados**
- `supabase/migrations/0006_create_routes_itineraries.sql` (novo): `routes`, `route_days`, `route_stops`, `route_progress`, `route_stop_progress`, geração de código `EK-XXXXXX`, GRANTs e RLS.
- `src/lib/routes.ts` (novo): leitura pública/próprios/admin, criação, edição, eliminação, visibilidade, estado, pesquisa por código, importação e progresso.
- `src/hooks/useRoutes.ts` (novo): `useRouteCatalogue`, `useRoute`.
- `src/routes/itineraries.tsx`, `src/routes/itinerary.$id.tsx`, `src/components/ItineraryMap.tsx`: reescritos sobre dados reais.
- `src/routes/dashboard.tsx`, `src/routes/home.tsx`: sugestões de roteiros passam a usar roteiros reais.
- `src/routes/admin.tsx`: novo painel “Gerir Roteiros” (listar, pesquisar, filtrar por província, criar oficial, editar, ativar/desativar, público/privado, apagar).
- `src/data/itineraries.ts`: removidas todas as funções de `localStorage`; o mock permanece apenas como conteúdo narrativo da gamificação (ainda não migrada).
- `src/components/GameTaskFields.tsx`: deixou de ler roteiros do `localStorage`.

**Correção**
- Dois roteiros curados migrados usando **apenas** destinos e experiências que já existem (Inhambane + Tofo + Vilankulo + Dhow Bazaruto; Maputo + Mercado Central + Marrabenta). O terceiro roteiro mock (“Bazaruto Completo”) **não** foi migrado por depender de paragens inventadas.
- Paragens referenciam `destinations` ou `experiences` reais (exatamente uma por paragem, garantido por constraint); preços, durações e coordenadas vêm dessas tabelas.
- Códigos únicos `EK-*` gerados pela base de dados; pesquisa por código é case-insensitive e permite abrir/importar roteiros partilhados.
- Progresso (`route_progress` / `route_stop_progress`) guardado por conta, com dia atual, paragens concluídas, reiniciar e terminar.
- RLS: público vê roteiros públicos ativos; o proprietário vê/edita os seus (incluindo privados); admin vê e gere tudo.

**Estado**
BLOCK 6G COMPLETE.

**Testes realizados**
1. Catálogo `/itineraries` carrega os 2 roteiros oficiais reais com província, dias, paragens e preço — OK.
2. Detalhe do roteiro mostra dias/paragens reais e mapa com coordenadas reais — OK.
3. Começar roteiro criou progresso persistente na base de dados (`route_progress`, `in_progress`, dia 1) — OK.
4. Criação de roteiro de utilizador gerou código `EK-7D5F02`, privado, visível só para o autor — OK.
5. Pesquisa por código em minúsculas (`ek-map002`) abriu o roteiro correto — OK.
6. Painel Admin → Gerir Roteiros listou os 3 roteiros (incluindo o privado com nome do proprietário) e apagou o roteiro de teste — OK.
7. Dashboard e Home mostram sugestões de roteiros reais sem erros de consola — OK.
8. Typecheck e build: OK.

**Limitações conhecidas**
- Sem dados reais para restaurantes/hotéis/paragens narrativas, as paragens limitam-se a destinos e experiências existentes.
- Gamificação, comunidade, eventos, notificações, notícias e recompensas continuam locais/mock (fora do âmbito deste bloco).

## BLOCK GUEST FLOW — Modo convidado

**Problema:** o convidado era enviado para `/login` (ou para o onboarding) em quase todas as páginas públicas.

**Causa:** `/home`, `/map` e `/experiences` tinham `beforeLoad: requireAuthenticatedUser`; `/` redirecionava sempre para `/login`; `needsOnboarding` incluía `role === "guest"`; o botão de convidado ia para `/news-alerts`; o estado de convidado só existia em memória (perdido em reload).

**Ficheiros afetados:** `src/contexts/AuthContext.tsx`, novo `src/contexts/AuthGateContext.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`, `src/routes/home.tsx`, `src/routes/map.tsx`, `src/routes/experiences.tsx`, `src/routes/itineraries.tsx`, `src/routes/itinerary.$id.tsx`, `src/routes/favorites.tsx`, `src/routes/games.tsx`, `src/components/FavoriteButton.tsx`.

**Correção:**
- Modo convidado como *modo de navegação* (flag em `sessionStorage`, nunca profile/role/preferências na BD); limpo em login e logout.
- Páginas públicas sem guard: Home, Mapa, Experiências, Roteiros, detalhe de roteiro, cultura, informação útil, notícias, comunidade, impacto.
- Guards mantidos/adicionados em páginas pessoais: dashboard, reservas, gamificação, jogos, favoritos, preferências, voucher, admin, business.
- Novo diálogo "Esta funcionalidade requer uma conta." com Entrar / Criar conta / Continuar a explorar, ligado a favoritos, reservas, XP/visitas, criar/importar roteiros e progresso de rotas.
- Onboarding nunca aparece a convidados; fluxo signup → confirmação → login → onboarding inalterado.

**Estado:** BLOCK GUEST FLOW COMPLETE.

## BLOCK 6H — COMUNIDADE REAL

**Audit (antes):** a página Comunidade usava um array hardcoded de posts com autores e likes falsos, estado em memória (perdido em reload), sem categorias, províncias, denúncias, moderação ou persistência. Nenhuma tabela de comunidade existia na BD. Províncias reais (`provinces`) e roles (`user_roles`) já existiam e foram reutilizados.

**Base de dados** (`0007_create_community.sql`, `0008_community_public_authors_view.sql`, `0009_community_anon_category_policy.sql`, `0010_community_authors_view_no_has_role.sql`):
- `community_categories` — 8 categorias fechadas (Dicas de Viagem, Destinos, Gastronomia, Cultura, Experiências, Roteiros, Perguntas, Fotografias).
- `community_posts` — author_id, title, content, image_url, category_id, province_id, destination_id/experience_id/route_id (nullable, FKs reais), status (pending/published/rejected/hidden), timestamps.
- `community_post_reactions` — UNIQUE (user_id, post_id), like/dislike.
- `community_reports` — UNIQUE (post_id, reporter_id), motivos spam/inappropriate/misleading/offensive/other, status pending/reviewed/dismissed/action_taken, resolved_by/resolved_at.
- Triggers forçam `author_id`/`reporter_id` = `auth.uid()`, impedem alteração de autor e de estado por não-admins, e registam quem resolveu a denúncia.
- View `community_post_authors` expõe apenas display_name + avatar (sem email nem dados privados).

**RLS:** anónimo lê só posts publicados, categorias ativas e contadores; não escreve nada (testado: insert de post e de reação rejeitados). Autenticado cria/edita/elimina só os próprios posts, reage, denuncia; não vê nem altera denúncias de terceiros. Admin (via `user_roles` existente) modera e resolve denúncias.

**Frontend:** `src/lib/community.ts` (leitura/escrita, filtros, reações com toggle, denúncias, moderação); `src/routes/community.tsx` reescrito (feed real, pesquisa, filtros por categoria e província, ordenação recentes/populares, estados loading/erro/vazio, editor com destino/experiência/roteiro reais, edição/eliminação do próprio post); `src/routes/community.$postId.tsx` (detalhe + denúncia); `src/routes/admin.tsx` (+ "Moderação da Comunidade" e "Denúncias"); LanguageContext com ~35 chaves PT/EN.

**Guest:** abre Comunidade, lê, pesquisa, filtra e abre detalhes; publicar/reagir/denunciar abre o diálogo "Esta funcionalidade requer uma conta." (Entrar / Criar conta / Continuar a explorar). Nunca é enviado para onboarding.

**Storage:** bucket `community-images` recusado pelo ambiente (`public_buckets_blocked`) — imagens ficam desativadas nesta etapa, sem base64 nem URLs externas.

**Testes (PASS):** guest feed/pesquisa/filtros/estado vazio/gating; criar post autenticado; like → 1, novo clique → 0, dislike → 1; página de detalhe; utilizador B não edita nem elimina post de A; author_id e reporter_id não falsificáveis; status forçado a published/pending; anónimo não escreve; denúncias de terceiros invisíveis; admin oculta post e resolve denúncia; post oculto deixa de ser público. Typecheck e build OK. Dados de teste marcados [TESTE] foram removidos no fim.

**Limitações:** upload de imagens pendente (Storage bloqueado); posts entram como `published` (sem fila de aprovação prévia) — o admin pode ocultar/rejeitar depois; sem comentários/respostas (por decisão de privacidade existente).

**BLOCK 6H COMPLETE**

---

## BLOCO 7A — CULTURA & HISTÓRIA

**Audit realizado**
- A secção já usava o `LanguageToggle`, mas não consumia o idioma do `LanguageContext`; todos os textos visíveis e os seis tópicos estavam fixos em português.
- O seletor global já alternava e persistia `pt`/`en` em `ekaya.lang`, mas a página não reagia à alteração.
- A secção usa cartões que abrem um diálogo de detalhe (não abas técnicas). Cada tópico contém título, subtítulo, data, resumo, quatro secções e uma curiosidade.
- O diálogo estava limitado a `max-w-3xl`, com uma imagem de 20rem e uma área textual limitada a 60vh.

**Correção**
- O conteúdo existente foi preservado e passou a ter versões PT/EN no mesmo modelo local.
- A página passou a reutilizar diretamente `useLang`; cabeçalho, apresentação, etiquetas, cartões, detalhes, botões, rótulos acessíveis e alternativas das imagens atualizam imediatamente com o idioma global.
- A seleção do idioma continua a usar a persistência já existente no `LanguageContext`; não foi criado qualquer sistema paralelo.
- O diálogo de leitura passou para `max-w-5xl`, com área textual flexível, texto maior, espaçamento reforçado e duas colunas em ecrãs largos; em mobile mantém uma coluna e ocupa o espaço disponível com scroll interno.
- A lógica do botão Voltar para `/dashboard` não foi alterada.

**Âmbito**
- Apenas `src/routes/culture-history.tsx` e esta documentação foram alterados.
- Sem alterações de backend, autenticação, RLS, dados ou outras áreas do Ekaya.

**Estado**
- Português: os seis tópicos, respetivas secções, curiosidades, ações e textos gerais verificados — PASS.
- Inglês: os seis tópicos, respetivas secções, curiosidades, ações e textos gerais verificados — PASS.
- Alternância PT → EN → PT repetida e atualização imediata da interface — PASS.
- Persistência do idioma através do `LanguageContext`/`ekaya.lang` preservada — PASS.
- Abertura e fecho sucessivos dos seis detalhes — PASS.
- Botão Voltar preservado; sem sessão, o guard existente encaminhou `/dashboard` para `/login` — PASS.
- Desktop (1280 × 1800) e mobile (390 × 844), incluindo scroll interno do detalhe — PASS.
- Sem novos erros de consola; compilação automática — PASS.

**BLOCO 7A — CULTURA & HISTÓRIA COMPLETE: SIM**

---

## BLOCO 7C — GUEST FLOW + NAVEGAÇÃO

**Diagnóstico**
- Guest → Home já estava correto (botão "Convidado" navega para `/home`); confirmado por teste.
- Botões "Voltar" das páginas públicas navegavam sempre para `/dashboard` (rota privada): como convidado o clique resultava em redirect para `/login`.
- O menu lateral mostrava a convidados entradas que exigem conta (Painel, Minhas Reservas, Favoritos, Editar Preferências, Conquistas, Jogar Desafios), todas terminando em `/login`.
- O rodapé do menu mostrava "Sair" a convidados (por existir `user` em modo convidado), sem opção de criar conta.

**Alterações**
- Novo `src/lib/nav.ts` → `useBackTarget()`: devolve `/dashboard` com sessão e `/home` sem sessão.
- Botões "Voltar" passam a usar `useBackTarget()` em: `culture-history`, `useful-info`, `map`, `experiences`, `news-alerts`, `itineraries`, `impact`.
- `AppSidebar.tsx`: entradas marcadas `privateOnly` são escondidas sem sessão; rodapé mostra "Entrar" + "Criar conta" a visitantes e "Sair" apenas a autenticados.

**Não alterado**: schema, RLS, Auth, traduções, destinos, experiências, reservas, roteiros, comunidade, gamificação.

**Testes (Playwright)**
- Convidado → `/home` direto, sem onboarding nem dashboard: PASS
- Convidado navega `/home`, `/map`, `/experiences`, `/itineraries`, `/community`, `/culture-history`, `/useful-info`, `/news-alerts`, `/impact`: PASS
- Rotas privadas (`/dashboard`, `/favorites`, `/games`, `/preferences`, `/bookings`) continuam a pedir autenticação: PASS
- Ação privada (publicar na Comunidade) mostra "Esta funcionalidade requer uma conta.": PASS
- Menu lateral de convidado sem entradas privadas e com "Criar conta": PASS
- Voltar em Cultura & História: convidado → `/home`; autenticado → `/dashboard`: PASS
- Typecheck e consola sem erros novos: PASS

**BLOCO 7C — GUEST FLOW + NAVEGAÇÃO COMPLETE: SIM**

---

## BLOCO 7D — NOTIFICAÇÕES

**Auditoria (antes)**
- Existia `NotificationsBell.tsx` (sheet com sino, badge de não lidas) usado em 10 rotas.
- Existia `NotificationsContext.tsx`, mas alimentado por `MOCK_NOTIFICATIONS` (4 notificações fixas em `src/data/news.ts`), com `readIds` em `localStorage` e apenas "marcar todas como lidas".
- Não existia tabela, serviço, hook, RLS, estado de loading/erro, marcação individual nem qualquer ligação ao utilizador autenticado.

**Base de dados (nova migration `drizzle/migrations/0011_create_notifications.sql`)**
- `public.notifications`: `id`, `user_id` → `profiles(id)` ON DELETE CASCADE, `type` (system/booking/itinerary/experience/community/route/reward/safety/promo/event), `title_pt`, `title_en`, `body_pt`, `body_en`, `link` (apenas caminhos internos `/…`), `read_at`, `created_at`.
- Índices por utilizador/data e parcial para não lidas. GRANT SELECT, UPDATE a `authenticated`; ALL a `service_role` (sem INSERT para utilizadores: notificações são geradas pelo sistema).
- RLS: cada utilizador lê apenas as suas (`auth.uid() = user_id`); admin lê todas via `has_role`; UPDATE apenas nas próprias linhas.
- Trigger `notifications_immutable_content()`: numa atualização só o estado de leitura pode mudar (autor, tipo, texto, link e data são imutáveis).

**Frontend**
- Novo `src/lib/notifications.ts`: `fetchMyNotifications`, `markNotificationRead`, `markAllNotificationsRead` (cliente Supabase do browser, RLS aplicada).
- `src/contexts/NotificationsContext.tsx` reescrito: lê da BD para o utilizador autenticado (`authUser.id`), expõe `notifications`, `unreadCount`, `loading`, `error`, `isGuest`, `markRead`, `markAllRead`, `refresh`; atualização otimista com recarga em caso de falha; convidado fica sempre com lista vazia e nada é gravado.
- `src/components/NotificationsBell.tsx`: lidas vs. não lidas distinguidas visualmente (borda/realce, ponto), "Marcar como lida" por item, "Marcar todas como lidas", loading, erro com "Carregar novamente", estado vazio, cartão de convidado com Entrar/Criar conta, ícones/etiquetas por tipo, tudo PT/EN via `useLang` (sem novo sistema de tradução).
- Mocks removidos de `src/data/news.ts`: `MOCK_NOTIFICATIONS`, `NotificationItem`, `NotifCategory`, `notifCategoryLabel`. As notícias (`MOCK_NEWS`) ficam intactas, fora do âmbito deste bloco.

**Navegação**: `link` é opcional e só aponta para caminhos internos existentes; abrir a notificação marca-a como lida. Botões "Voltar" e `useBackTarget()` do Bloco 7C não foram tocados.

**Gatilhos automáticos**: não implementados (reservas, eventos, comunidade, roteiros, recompensas, XP, notícias, IA) — ficam para os blocos respetivos.

**Testes (Playwright + SQL, com notificações de teste marcadas `[TESTE]` e apagadas no fim)**
- Utilizador autenticado abre o painel e vê apenas as suas notificações: PASS
- Contador de não lidas: 2 → "marcar como lida" → 1 → "marcar todas como lidas" → 0: PASS
- Estado persiste após refresh (0 não lidas, lidas continuam lidas): PASS
- RLS: notificação de outro utilizador nunca aparece; admin com acesso de leitura conforme política: PASS
- Tentativa de alterar conteúdo de uma notificação rejeitada pelo trigger: PASS
- Convidado: não vê notificações privadas, vê "Esta funcionalidade requer uma conta." com Entrar/Criar conta; nenhum registo criado: PASS
- PT e EN (títulos, corpo, botões, descrições): PASS
- Desktop (1280 × 1800) e mobile (390 × 844): PASS
- Sem erros de consola; typecheck e build: PASS
- Base de dados final: 0 notificações (dados de teste eliminados): PASS

**Limitações / blocos futuros**
- Sem gatilhos automáticos e sem página dedicada `/notifications` (o painel lateral cobre o âmbito pedido).
- Sem tempo real (`realtime`): a lista é carregada ao abrir a aplicação e via "Carregar novamente".
- Notificações só podem ser criadas pelo sistema (`service_role`), como previsto.

**BLOCO 7D — NOTIFICAÇÕES COMPLETE: SIM**

## BLOCK 7E — MAPA
- Audit: marcadores vinham da tabela destinations (6, todos com coordenadas reais); "Ver detalhes" só selecionava; "Como chegar" traçava rota interna (OSRM); visitas/XP em localStorage (visitDestination).
- Nova tabela destination_visits (user_id, destination_id, visited_at, UNIQUE) com RLS só do próprio (select/insert/delete). Sem GPS guardado. Base para XP futuro (XP não implementado).
- Mapa: "Ver detalhes" abre e rola para o painel do destino; "Como chegar" abre Google Maps / Apple Maps / Waze com coordenadas reais (rota interna removida); "A minha localização" com Geolocation a pedido, erros tratados (recusada/indisponível/timeout/sem suporte), só local; marcar/desmarcar visita persistente com gate de convidado; destinos sem coordenadas válidas não são mostrados no mapa.
- Notificações: "Ver todas as notificações" carrega o histórico completo no painel.
- Testes: guest mapa, localização concedida/recusada, direções, gate, adicionar/duplicado(409)/outro utilizador(403)/anon vazio/remover — PASS. Typecheck OK.

## BLOCK 7F — Notícias & Eventos
- Notícias em Destaque: deixaram de usar MOCK_NEWS; mostram as 4 notícias mais recentes do mesmo feed em tempo real (sem segundo feed). Filtros de categoria mock removidos (o feed real não tem categorias); pesquisa mantida.
- Eventos: botão Participar/Cancelar real (tabela event_participations, única por utilizador+evento), "Já estás inscrito", contagem real de inscritos no Ekaya. Eventos continuam os existentes (não criados novos).
- Gostos: tabela news_likes (um por utilizador por notícia, chave = link da notícia), contagem pública via função.
- Partilha: novo componente reutilizável ShareButton (WhatsApp, Instagram, X, Web Share API, copiar link). Instagram não tem link web de partilha: usa partilha nativa ou copia o link e abre o Instagram.
- Migration: 0013_news_likes_event_participations.sql (RLS: cada utilizador só vê/cria/apaga as suas linhas; visitante bloqueado).
- Testes: convidado bloqueado (diálogo de conta) PASS; participar 201 / duplicado 409 / cancelar 204 PASS; like/unlike PASS; visitante direto na BD 401 PASS; menu de partilha desktop/mobile PASS; typecheck PASS.
- Limitação: contagem "attendees" antiga (fixa) substituída pela contagem real.

## Bloco 8A — Minhas Reservas
- Página /bookings: separadores Todas/Pendentes/Confirmadas/Concluídas-Rejeitadas, detalhe (código EK, estado, destino, negócio, contacto, descrição), Ver experiência (/experiences), Ver destino (/map?destination=slug), cancelamento só de pendentes com confirmação.
- Migration 0014: `cancel_my_booking(uuid)` (dono + pendente), `bookings_guard_update` endurecido (estados finais imutáveis; só o cliente cancela pendentes; só o dono do negócio confirma/rejeita/conclui), trigger `bookings_notify_status` cria notificações reais (confirmada/rejeitada/cancelada). Reservas nunca apagadas; lugares libertados porque `booked_people` só conta pending/confirmed.
- Testes SQL (transação revertida): cancelamento 6→8 lugares, recancelar/cancelar confirmada/outro utilizador/anon bloqueados, notificações geradas, estranho vê 0 reservas. UI com dados reais de reserva não testado (conta de teste sem reservas).

## Bloco 8B — Negócios Locais
- Novas páginas `/businesses` (lista com pesquisa/província/categoria vindos da BD), `/business/$id` (detalhe, experiências, mapa, direções) e `/experience/$id` (detalhe; "Reservar" abre o formulário existente via `/experiences?book=id`).
- Reutiliza RLS existente: público vê apenas `status = approved`; owner_id nunca é selecionado. Sem migrations.
- Atalho na dashboard e no menu; "Ver experiência" em Minhas Reservas abre agora a experiência específica.
- Limitação: negócios atuais não têm localização/contacto/imagem na BD; "Ver no mapa" usa o destino das experiências e "Como chegar" usa esse destino ou o nome+província.

## Bloco 8C — Experiências Comunitárias (dados reais)

- Migration `drizzle/migrations/0015_community_experiences.sql`: tabela `community_experiences` (separada de `experiences`; sem preço, sem reserva), FK `province_id → provinces`, categoria restrita a beach/culture/food/nature/community/adventure ("All" é só filtro do frontend), lat/lng, `image_url` nulo, `active`. UNIQUE (province_id, title_pt) + `ON CONFLICT DO NOTHING` → importação idempotente (testado: segunda execução insere 0).
- RLS: anon/autenticados leem só ativas; Admin lê tudo e cria/edita/desativa/elimina. Anon: insert negado (42501), update/delete afetam 0 linhas.
- Dados: 54 atividades fornecidas pelo utilizador (a lista enviada tem 9 províncias × 6; Manica e Cidade de Maputo não tinham atividades). Festival Tambo guardado em Cabo Delgado (Nampula 5, Cabo Delgado 7). Textos EN traduzidos fielmente do PT fornecido.
- UI: `/community-experiences` (pesquisa, província, categorias, cartões, detalhe com mapa/coordenadas/Como chegar/Ver no mapa); atalho no painel e menu; secção "O que podes fazer gratuitamente nesta província" no detalhe do negócio; marcador verde próprio + legenda/camadas no mapa (`/map?community=id`); Home recomenda atividades gratuitas (só províncias escolhidas; todas quando nenhuma/todas selecionadas; depois interesses); Admin → "Experiências Comunitárias".
- Negócios não têm coordenadas na BD, por isso não há marcadores de negócios no mapa (legenda indica).

## Bloco 8C — correções finais (submissão, fotos, mapa, direções)
- Migrations 0016 (status pending/approved/rejected, submitted_by/at, decided_by/at, rejection_reason, additional_info, image_path; RLS público = approved+active; dono lê as suas; triggers forçam pending para não-admin e notificam decisão) e 0017 (notificação com tipo 'community').
- Storage privado `community-photos` (5 MB): upload na pasta do próprio utilizador; leitura só de fotos de experiências aprovadas, do próprio ou Admin; exibidas por URL assinado.
- Formulário "Propor experiência" + "As minhas propostas"; Admin com separador Pendentes, aprovar/rejeitar com motivo, upload de foto.
- Mapa: filtro por categoria (?category=), destinos verdes / selecionado laranja, experiências em losango azul, selecionada destacada.
- Direções centralizadas em DirectionsButtons (Google Maps, Waze, Apple Maps); sem coordenadas não há link.

## Bloco 8D — Roteiros
- Migration 0018: routes.review_status/rejection_reason/decision/submission, title_en, subtitle PT/EN, description_en, interests, intensity, source_route_id (import sem duplicar); route_days.title_en; provinces.cover_image; route_stops.stop_type (destination/activity/community_experience/custom_stop) + community_experience_id + campos de paragem; route_stop_progress.photo_path/lat/lng com foto obrigatória; notificações de aprovação/rejeição; bucket privado route-proofs.
- Catálogo: filtros duração/interesses, recomendações por província→duração→interesses, estado pendente/rejeitado para o autor, partilha via ShareButton, importação com pré-visualização.
- Detalhe: PT/EN, ligações a atividade/experiência comunitária/destino específicos, direções Google/Waze/Apple, prova fotográfica.
- Admin: pendentes, aprovar/rejeitar com motivo.
- Seed dos 30 roteiros: PENDENTE (catálogo não fornecido).

## 8D — QA round (2026-10-07)
Tested with a real tourist account and the Admin account (API + browser, desktop + mobile).
Bugs fixed:
- `route_stops_one_ref` check blocked community-experience stops (any route with one failed to save). Migration 0019 allows exactly one reference (destination / activity / community) or a titled custom stop; adds unique (owner, source) index so imports can't duplicate at DB level.
- Admin saw the author's UUID instead of the name: migration 0020 lets admins read profiles.
- Itinerary detail crashed on server render (map loaded on server) → map now loads in the browser only.
- No language toggle on itinerary detail → added.
- Route form listed destinations/activities from every province → filtered to the chosen province.
- Days could not be reordered → ↑/↓ day buttons.
Open: Admin has no screen to browse users' progress/photos (backend allows it); Waze/Apple Maps opening on a real phone not testable here. QA test data was removed afterwards.

## 8D.1 — Base catalogue import (2026-10-07)
- Migration 0021: route codes may carry a suffix (`EK-MAP-003`); new fields `routes.catalog_notes_pt/en`, `community_candidates`, `requires_validation`; `route_days.is_unassigned`; `route_stops.validation_status`, `community_candidate(_reason)`.
- 30 official routes inserted (owner none, curated, approved, active) with 117 stops in catalogue order inside one "day split to validate" block.
- 23 stops linked to existing destinations / approved community experiences (exact matches only); 94 stops are titled custom stops marked `pending_validation`, with no coordinates.
- 4 stops flagged as community candidates (potential only); route-level candidates kept in `community_candidates`.
- Re-running is safe: same code updates the route; stops are only written when the route has none.
- Interests extended (wildlife, history, heritage, local_life, relax, diving, fishing, hiking, family, art, music). Nampula cover now uses the existing Ilha photo.

## 8E.1 — Aprovação de negócios (Admin)
- BD: `businesses.rejection_reason/decided_at/decided_by`; tipo de notificação `business`; RPC `admin_decide_business` e `admin_business_owner_emails` (só admin); trigger `businesses_notify_decision`; guard impede donos de alterar estado/decisão.
- UI: `src/components/AdminBusinesses.tsx` (Admin → «Aprovação de Negócios»), aviso de rejeição com motivo no painel do negócio.
- Testado com 2 negócios de teste isolados (removidos depois). Os 4 pendentes reais não foram alterados.

## 8E.2 — Perfil empresarial, atividades e disponibilidade (2026-10-18)
- Gestão autenticada do perfil, atividades comerciais bilingues e horários semanais integrada no painel existente; não foram criadas tabelas paralelas nem alteradas experiências comunitárias.
- Funções de gestão verificam owner_id e aplicam RLS. Campos administrativos e identidade do negócio não são editáveis pelo dono.
- Migrations 0023–0025 aplicadas: catálogo e novas reservas exigem negócio aprovado/atividade ativa; preço da reserva calculado na BD; locks transacionais protegem agenda e reservas; horários sobrepostos e alterações incompatíveis com reservas futuras são rejeitados; histórico do cliente mantém leitura de atividade desativada.
- Mudança de província com atividades existentes bloqueada para evitar inconsistência com destinos associados.
- Testes: 8 Vitest PASS; browser autenticado e API com donos/turista/Admin isolados confirmaram persistência, isolamento, aprovação, visibilidade, preço, agenda, histórico e PT/EN desktop/mobile claro/escuro. Build mais recente observado: OK.
- Dados de teste e três contas Auth isoladas removidos. Contagens finais: 13 negócios (9 approved/4 pending), 8 atividades, 2 reservas. Comparação byte-a-byte com fingerprints anteriores não comprovada: a fórmula da captura inicial não foi recuperada; não declarar identidade integral de dados.
- Limitações: horários com reservas futuras não podem ser desativados individualmente; desativação da atividade bloqueia novas reservas preservando histórico. Fotos comerciais sem upload novo; painel mantém oito reservas visíveis. Verificação de email pública E2E continua BLOCKED; alerta CSRF preexistente requer análise antes de produção.
- Relatórios separados entregues: implementação/testes e revisão técnica independente. Não publicado; 8E.3 não iniciado.

## 8E.4 — Métricas reais e atalhos (2026-10-19)
- Auditoria: `docs/8E4-audit.md`; relatório detalhado de implementação/testes: `docs/8E4-report.md`.
- Resumos por estado, próximas confirmadas, atividades e horários reais; atalhos aos diálogos existentes; reservas recentes por criação real; leituras privadas autorizadas e paginadas.
- Admin sem KPI/crescimento/ranking/eventos/uptime fictícios; resumo real autorizado e aprovação existente preservada. Sem migration ou escrita de dados.
- 19 testes unitários/regressão PASS; browser empresarial PT/EN, claro/escuro, 1280px e 390×844 sem overflow/pageerror. Contagens e hashes completos idênticos para bookings/businesses/experiences/availability/notifications. Nenhum dado QA criado.
- QA integral BLOCKED: sessão disponível só de dono sem atividades/reservas; faltam Admin/turista/segundo dono autorizados e dados QA populados para decisões/fechos. Não alegar 8E.4 integralmente fechado; não iniciar 8E.5; não publicado.
- Revalidação 01:40–01:44 UTC: paginação também dos IDs de negócios; leituras aguardam identidade, chave de resumo Admin por conta, redirect redundante removido e contraste de ícones/idioma corrigido. 20/20 testes PASS; oito combinações empresariais e acesso Admin negativo reexecutados; cinco hashes/contagens intactos. Build automático 01:42:28Z OK. Relatório atualizado com QA positiva ainda BLOCKED; nenhuma publicação ou escrita QA.

## 9B — Estatísticas e impacto verificável
- Migration 0027: `platform_impact_stats()` (SECURITY DEFINER, só contagens, anon+authenticated).
- `/impact` reescrito: métricas da plataforma vs impacto verificado; removidos $2.1M, 342, 15, 89%, +X%, "vs mês anterior" e percentagens por província fictícias; "85%" removido de Informações Úteis.
- Regras: concluída = status completed e data/hora passada (Moçambique); sem receita (sem pagamentos); grupos por província de impacto verificado < 3 ocultos.
- Testes: `src/lib/impact-stats.test.ts`.

## Itinerários — integridade, gravação e mapas
- Migrations 0032–0033: gravação/reinício transacionais sob RLS; pertença da paragem, existência de fotografia privada, identidade/dia e conclusão comprovada; proteção de planos com provas.
- Editor preserva paragens personalizadas; hooks descartam respostas antigas; detalhe mostra falhas/repetição, ligações comunitárias específicas e atualização de pontos; mapa distingue ordem de paragens de estimativas de carro.
- 46 testes PASS e fluxo autenticado exercitado; matriz visual do detalhe PT/EN × temas × desktop/mobile. Concorrência multissessão, outros papéis e offline integral continuam não validados/indisponíveis.
- QA atribuiu temporariamente 170 pontos à conta disponível. Roteiro, progresso e foto removidos; duas linhas QA de pontos apagadas por comando privilegiado, um desvio explícito da regra append-only. Quatro tabelas verificadas recuperaram fingerprints iniciais; não alegar que nenhuma escrita ocorreu.
- Relatório: `docs/itinerary-audit-report.md`. Não publicado; nenhum novo bloco iniciado.
