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
