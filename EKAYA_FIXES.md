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
