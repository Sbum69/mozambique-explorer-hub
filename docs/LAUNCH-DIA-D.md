# Dia D — runbook do lançamento

Runbook por tempo, com checks, responsáveis, reversão, comunicação e contactos. O passo a passo de
cada painel está em `docs/LAUNCH.md`; a checklist geral em `docs/OPERACAO.md`; os incidentes em
`docs/security/INCIDENTES.md`.

**Responsáveis**

- **CEO** (Sheldon Jasse): decide, aprova SQL, faz o merge e o Publish, fala com os utilizadores.
- **Claude Code**: repositório, verificações e propostas SQL. Nunca aplica SQL nem publica.
- **Claude chat**: textos para os utilizadores e revisão de redação.

**Contactos de suporte que constam no repositório**

- Email de apoio: `apoio@exploreekaya.com` (`SUPPORT_EMAIL` em `src/lib/app-info.ts`).
  - Aparece no rodapé, nas Definições, nos Termos e na Política.
  - Recebido no Gmail da equipa (Cloudflare Email Routing).
- Plataforma: suporte da Lovable / Supabase, para restauros, registos e infraestrutura
  (`docs/security/INCIDENTES.md` §1).
- Não há telefone nem WhatsApp publicados (`LEGAL_ENTITY.phone = null`): não se inventam.

## Regra fixa: migração e Publish juntos (versões legais)

Quando muda uma versão legal (`LEGAL_VERSIONS` em `src/lib/legal/versions.ts`):

- a migração de `current_legal_versions()` e o **Publish** do código com essa versão fazem-se **no
  mesmo momento**;
- com só um dos dois feito, `accept_legal_documents` recusa (`LEGAL_VERSION_MISMATCH`). Nenhuma
  conta consegue aceitar os textos e a app fica bloqueada no ecrã de aceitação;
- ordem: **merge** → **aplicar a migração** (e registar em `drizzle.__drizzle_migrations`) →
  **Publish** logo a seguir, fora das horas de mais uso.

Hoje: a 0077 (versões 2026-11-23, contacto `apoio@`) está no journal do `main`.
**[CONFIRMAR]** se já foi aplicada na produção ao mesmo tempo que o Publish.

## Comandos de verificação (Claude Code)

```sh
bunx tsc --noEmit                 # tipos
bun run lint                      # 0 erros (15 avisos react-refresh conhecidos)
bunx vitest run                   # testes
bun run build                     # build (repor src/routeTree.gen.ts se mudar)
bun run ci                        # tudo acima + route tree
bun run build && bunx wrangler@4.45.0 dev --port 4173 --local     # noutra janela
bun scripts/qa/prelaunch.ts       # PRELAUNCH: PASS ou FAIL (usa as contas QA do .env.test.local)
QA_BASE=https://exploreekaya.com bun scripts/qa/prelaunch.ts --skip-build   # contra o site publicado
```

O `prelaunch.ts` exige o registo dos testes de BD (`qa-output/db-tests.json`) com menos de 24 h.

## T−7 dias

| Check                                                                   | Quem             | Como confirmar                                                     |
| ----------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Mínimos: 5 negócios aprovados e 5 atividades ativas                     | CEO              | Admin → Estado do lançamento                                       |
| Todos os admins com 2FA                                                 | CEO              | Admin → Estado do lançamento; login pede o código                  |
| Domínio Active, HTTPS, `www` → raiz                                     | CEO              | `docs/LAUNCH.md` §1, passo 6                                       |
| Email: receção em `apoio@` e envio (SPF, DKIM, DMARC: PASS)             | CEO              | `docs/OPERACAO-PASSOS.md` §1 (branch `chore/fase-4-operacao`)      |
| Auth: palavra-passe com 8+, confirmação de email ligada, limites        | CEO              | `docs/LAUNCH.md` §8                                                |
| M-Pesa manual: número e nome reais em Admin → Destaques                 | CEO              | pedido de destaque de teste com a conta QA                         |
| Revisão jurídica dos Termos e da Privacidade                            | Advogado, CEO    | `docs/legal/BRIEFING-ADVOGADO.md` (branch `chore/fase-5-juridico`) |
| Propostas SQL pendentes revistas (0079 e outras): aprovar ou adiar      | CEO, Claude Code | guiões em `docs/security/testes/`                                  |
| Testes de BD no projeto final                                           | Claude Code      | `docs/QA.md`; `qa-output/db-tests.json`                            |
| `bun run ci` no `main`                                                  | Claude Code      | PASS                                                               |
| Primeiro backup manual (BD e Storage), guardado cifrado fora da Lovable | CEO              | `docs/security/BACKUPS.md`                                         |

## T−1 dia

| Check                                                                   | Quem             | Como confirmar                                          |
| ----------------------------------------------------------------------- | ---------------- | ------------------------------------------------------- |
| Todos os PRs do lançamento fundidos; `main` com o CI verde              | CEO              | GitHub                                                  |
| `bun run build` e o `prelaunch.ts` local → `PRELAUNCH: PASS`            | Claude Code      | saída do script                                         |
| Ensaio da desativação das contas QA com `ROLLBACK` (só "OK" nos NOTICE) | CEO              | `supabase/launch/proposta-0080-desativar-contas-qa.sql` |
| Texto de anúncio PT/EN pronto (o que é, como entrar, `apoio@`)          | Claude chat, CEO | texto aprovado pelo CEO                                 |
| Lista dos 5+ negócios com o contacto de cada um, para os avisar no dia  | CEO              | Admin → Negócios                                        |

## Dia D (por horas, hora de Maputo)

| Hora                | Passo                                                                                                                                                                                         | Quem        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 08:00               | Backup manual (BD e Storage). Registar a hora                                                                                                                                                 | CEO         |
| 08:30               | Desativar as contas QA **sem apagar**: `supabase/launch/proposta-0080-desativar-contas-qa.sql` com `COMMIT`, e depois a verificação do fim do ficheiro. **NÃO usar `launch-day.sql`** (apaga) | CEO         |
| 09:00               | Migrações aprovadas para o dia, se houver (cada uma com o seu guião) e registo em `drizzle.__drizzle_migrations`                                                                              | CEO         |
| 09:15               | **Publish** na Lovable, logo a seguir às migrações (regra "migração e Publish juntos")                                                                                                        | CEO         |
| 09:30               | `QA_BASE=https://exploreekaya.com bun scripts/qa/prelaunch.ts --skip-build` e Lighthouse no domínio real                                                                                      | Claude Code |
| 09:30               | No telemóvel, com a rede móvel: registo, email de confirmação, login, recuperação, reserva de teste num negócio real (e cancelar), painel do negócio, admin com 2FA, mapa                     | CEO         |
| 10:00               | Consola do browser sem erros de CSP nas páginas acima                                                                                                                                         | CEO         |
| 10:30               | Anúncio (texto aprovado) e aviso aos negócios                                                                                                                                                 | CEO         |
| 12:00, 16:00, 20:00 | Admin → Estado do lançamento → erros; caixa do `apoio@`                                                                                                                                       | CEO         |

## T+1 dia

| Check                                                                                     | Quem             |
| ----------------------------------------------------------------------------------------- | ---------------- |
| Erros das últimas 24 h (Admin → Estado do lançamento) e registos da Cloud se houver novos | CEO, Claude Code |
| Responder a todos os emails do `apoio@` e aos pedidos "Para negócios"                     | CEO              |
| Confirmar que nenhuma conta QA entrou (banidas) e que os negócios de teste não aparecem   | CEO              |
| Backup do dia                                                                             | CEO              |

## T+7 dias

| Check                                                                                                                                           | Quem             |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Rever as perguntas sem resposta do assistente e criar entradas na FAQ                                                                           | CEO, Claude chat |
| DMARC de `p=none` para `p=quarantine`, se não houver falhas                                                                                     | CEO              |
| CSP: 7 dias sem mensagens `[Report Only]` → decidir a passagem a obrigatória (`docs/security/CSP-ENFORCE.md`, branch `chore/fase-6-desempenho`) | CEO, Claude Code |
| `www` com 301 pelo Cloudflare (`docs/LAUNCH.md` §1, passo 8)                                                                                    | CEO              |
| Primeira rotina semanal de backups (BD e Storage)                                                                                               | CEO              |
| Lighthouse no domínio real; comparar com as medições de `docs/DESEMPENHO.md`                                                                    | Claude Code      |

## Plano de reversão

| Problema                                    | O que fazer                                                                                                                                                                         | Quem             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| A app nova parte depois do Publish          | Na Lovable, voltar a publicar a versão anterior **[CONFIRMAR]** onde fica o histórico de versões; ou reverter o commit no `main` e fazer Publish                                    | CEO              |
| Ecrã de aceitação dos Termos bloqueado      | Ver se a versão em `current_legal_versions()` é igual à de `LEGAL_VERSIONS` publicada. Alinhar com a migração de reversão do cabeçalho da migração legal e o Publish ao mesmo tempo | CEO, Claude Code |
| Migração com efeito errado                  | Correr a secção "COMO REVERTER" do cabeçalho da migração (aprovada pelo CEO); se houver dados estragados, restaurar (`docs/security/BACKUPS.md`)                                    | CEO              |
| Contas QA desativadas por engano / precisas | Reversão no cabeçalho da proposta 0080 (`banned_until = NULL` e repor o estado dos negócios)                                                                                        | CEO              |
| Conta ou admin comprometido                 | `docs/security/INCIDENTES.md` §3 (terminar sessões, retirar o papel, rodar chaves)                                                                                                  | CEO              |
| Funcionalidade com problema                 | Desligar pela flag no código (`docs/security/INCIDENTES.md` §3) e Publish                                                                                                           | CEO, Claude Code |
| CSP a bloquear scripts                      | `docs/security/CSP-ENFORCE.md` §4                                                                                                                                                   | Claude Code, CEO |

## Quem fala com os utilizadores

- **Só o CEO** responde e anuncia, pelo `apoio@exploreekaya.com`.
- Os textos (anúncio, aviso de falha, resposta a incidentes) são redigidos pelo Claude chat e
  aprovados pelo CEO. Para incidentes com dados pessoais: o modelo de email em
  `docs/security/INCIDENTES.md` §5 e o prazo de notificação no §4.
- Não se prometem prazos, números de utilizadores nem funcionalidades que não existam.
