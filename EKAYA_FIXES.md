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
