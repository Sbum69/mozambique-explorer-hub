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
