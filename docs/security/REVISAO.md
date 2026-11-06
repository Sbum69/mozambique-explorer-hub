# Revisão de código e de segurança

## Regra

**PR com CI verde + revisão por mim (Sheldon Jasse) antes do merge.**

- Nada entra na `main` sem PR. O agente nunca faz merge.
- O CI corre `tsc`, Vitest, ESLint, build e as verificações de ficheiros gerados.
- A auditoria de dependências (`bun audit --audit-level=high`) está em **modo aviso**:
  - aparece como falhada no resumo do CI, mas não bloqueia;
  - hoje todos os avisos "high" vêm de ferramentas de build (miniflare, wrangler, devtools, gerador de
    rotas), e não do código publicado;
  - o `bun audit` não tem opção "só produção".
- Se surgir um aviso "high" num pacote de `dependencies` que vá para o browser ou para o Worker, é
  corrigido antes do merge.
- Escritas na BD (migrações, dados): o SQL é validado em ROLLBACK e mostrado. Só se aplica com
  "aprovo" explícito.
- Os PRs do Dependabot seguem a mesma regra (CI verde + revisão). Nunca entram automaticamente.

## Checklist de segurança do PR

- [ ] **Segredos**: nenhuma chave, palavra-passe ou `.env.test.local` no diff. A service role só em
      código de servidor, importada dentro do handler.
- [ ] **RLS**: tabela nova com RLS ativa. O visitante (`anon`) não recebe grants de escrita. Mudanças
      de políticas têm o SQL aprovado e um teste em `supabase/tests/`.
- [ ] **RPC `SECURITY DEFINER`**:
  - `SET search_path`;
  - verifica `auth.uid()` e `has_role` quando é de admin;
  - `REVOKE … FROM PUBLIC, anon`;
  - ações de admin escrevem em `admin_audit`.
- [ ] **Admin**: a rota usa `requireAdmin`; os poderes exigem uma sessão `aal2` (2FA).
- [ ] **Dados pessoais**:
  - sem emails, tokens nem conteúdos privados em `console.*` ou no `app_errors`;
  - dados novos recolhidos estão na Política e em `docs/legal/SUBCONTRATANTES.md`.
- [ ] **Origens novas no browser** entram em `CSP_SOURCES` e passam no `scripts/qa/csp.ts`.
- [ ] **Links externos** têm `rel="noopener noreferrer"`.
- [ ] **Validação**: as entradas são validadas no servidor (zod ou checks na RPC), não só no formulário.
- [ ] **Limites**: formulários públicos têm limite de envios (ver `RATE-LIMITS.md`).
- [ ] **Dependências**: nenhuma biblioteca nova sem pedir. Se houver, a licença é compatível e aparece
      em `public/licenses.json` (`bun run licenses`).
- [ ] **Textos legais**: se mudaram, mudar `LEGAL_VERSIONS` e criar a migração de
      `current_legal_versions()`.
- [ ] **Desempenho**: o bundle inicial não cresce mais de 2 KB gz sem justificação.

## Reportar vulnerabilidades

Ver `SECURITY.md` na raiz.
