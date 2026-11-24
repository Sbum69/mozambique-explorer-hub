# Operação: checklist única do lançamento (Fases 4, 5 e 7)

Lista única e ordenada, do D-7 ao D+14. O passo a passo de cada linha está na fonte indicada; esta
lista não acrescenta dados novos.

- **Responsáveis:**
  - **CEO**: decide, aprova SQL e carrega em Publish;
  - **Claude Code**: repositório, PRs, propostas SQL e QA;
  - **Claude chat**: textos e revisão de redação;
  - **Advogado**;
  - **Lovable/Cloudflare**: ação num painel desses serviços, feita pelo CEO.
- **[SEM DOC]**: ainda não há documento nem procedimento no repositório. É preciso decidir ou pedir.
- **[CONFIRMAR]**: o valor ou o estado tem de ser visto no painel ou na produção.
- Não confundir com "FASE 4/5" do `roadmap.md`, que são as fases do fluxo de reservas.

## A. Antes (D-7 a D-1)

### A1. Legal (Fase 5)

| #   | Passo                                                                                                                                                                         | Responsável   | Fonte                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| 1   | Revisão jurídica dos Termos e da Privacidade (versão 2026-11-23, já com `apoio@exploreekaya.com`). Se mudarem, nova versão em `LEGAL_VERSIONS` e numa migração                | Advogado      | `docs/LAUNCH.md` §5; `drizzle/migrations/0077_…sql`                 |
| 2   | Licença de atividade (intermediação turística ou agência) e Banco de Moçambique (Lei 15/2026)                                                                                 | Advogado      | `docs/monetizacao/ESTUDO.md`                                        |
| 3   | RNAVT ou registo equivalente em Moçambique **[SEM DOC]**                                                                                                                      | Advogado      | —                                                                   |
| 4   | Seguro (responsabilidade civil, atividades) **[SEM DOC]**                                                                                                                     | Advogado, CEO | —                                                                   |
| 5   | DPA da Lovable (planos Business/Enterprise) ou confirmação por escrito **[DECIDIR]**; transferências para fora de Moçambique e da UE                                          | CEO, Advogado | `docs/legal/SUBCONTRATANTES.md`                                     |
| 6   | DPO formal ou não; contacto de privacidade (o email de apoio)                                                                                                                 | Advogado      | `docs/legal/ENCARREGADO-PROTECAO-DADOS.md`                          |
| 7   | Cookies: o aviso de armazenamento aparece e fecha-se. Política de cookies à parte **[SEM DOC]**                                                                               | Claude Code   | `docs/LAUNCH.md` §9, passo 7                                        |
| 8   | Aviso de IA: o assistente está sem IA (`ASSISTANT_LLM_ENABLED = false`). Antes de ligar a IA: Política, DPA da Cloudflare, texto "pode errar" e limite por IP (proposta 0079) | CEO           | `docs/legal/SUBCONTRATANTES.md`; `docs/security/QUOTAS-ANONIMOS.md` |
| 9   | Ler e aceitar os termos da MET Norway                                                                                                                                         | CEO           | `docs/legal/SUBCONTRATANTES.md`                                     |

### A2. Domínio, email e Auth (Fase 4)

| #   | Passo                                                                                                                                                                                                    | Responsável        | Fonte                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------- |
| 10  | Domínio `exploreekaya.com` em **Active** na Lovable, HTTPS, `www` → raiz (302 da Lovable por agora)                                                                                                      | Lovable/Cloudflare | `docs/LAUNCH.md` §1                          |
| 11  | Receção em `apoio@exploreekaya.com`: **feito** (Cloudflare Email Routing, 23/11/2026)                                                                                                                    | Lovable/Cloudflare | `docs/LAUNCH.md` §4                          |
| 12  | Envio de emails (Emails da Lovable, remetente `nao-responder@exploreekaya.com`, registos TXT/NS/`_dmarc`) e textos de `docs/email-templates.md` **[CONFIRMAR]** o estado                                 | Lovable/Cloudflare | `docs/LAUNCH.md` §2                          |
| 13  | Contacto `apoio@` na app (`DOMAIN_EMAIL_LIVE = true`) e versões legais 2026-11-23: merge do PR `feat/pre-lancamento`                                                                                     | Claude Code, CEO   | `src/lib/app-info.ts`; `docs/LAUNCH.md` §4   |
| 14  | Aplicar a 0077 (`current_legal_versions` = 2026-11-23) **e** fazer Publish logo a seguir, juntos. Com só um dos dois feito, ninguém consegue aceitar os textos. Todas as contas voltam a aceitar uma vez | CEO                | `drizzle/migrations/0077_…sql` (cabeçalho)   |
| 15  | Auth → URL configuration: Site URL e Redirect URLs com `/auth/callback`                                                                                                                                  | Lovable/Cloudflare | `docs/LAUNCH.md` §3                          |
| 16  | Auth → Password: mínimo de **8** caracteres, letras e números; proteção contra palavras-passe em fugas, se o plano a tiver                                                                               | Lovable/Cloudflare | `docs/LAUNCH.md` §8                          |
| 17  | Auth → **confirmação de email ligada** (não desligar: sem ela, o registo revela contas existentes)                                                                                                       | Lovable/Cloudflare | `docs/SECURITY.md` §6                        |
| 18  | Auth → Rate limits: `/token` 90 por 5 min, registos 30 por 5 min, emails 60 por hora                                                                                                                     | Lovable/Cloudflare | `docs/LAUNCH.md` §8                          |
| 19  | **2FA em todos os administradores** (a administração só abre com `aal2`)                                                                                                                                 | CEO                | `docs/SECURITY.md` §6.1; `docs/LAUNCH.md` §0 |

### A3. Pagamentos, conteúdo e dados

| #   | Passo                                                                                                                                                                                                        | Responsável      | Fonte                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------- |
| 20  | M-Pesa manual: instruções em Admin → Destaques, com o número e o nome reais da conta                                                                                                                         | CEO              | `docs/LAUNCH.md` §5                                                   |
| 21  | Mínimos: pelo menos 5 negócios aprovados e 5 atividades ativas, com fotografias licenciadas e créditos                                                                                                       | CEO              | `docs/LAUNCH.md` §0 e §5; `docs/content/RECRUTAMENTO.md`              |
| 22  | Negócios demo: os 8 negócios sem dono do catálogo inicial (0001: Capitão Sálvio, Tofo Dive Co-op, …) **[CONFIRMAR]** quais são reais; para os que não forem, suspender ou retirar **[SEM DOC]** (não há SQL) | CEO, Claude Code | `drizzle/migrations/0001_seed_experiences_catalogue.sql`              |
| 23  | Regra da 0074 (foto de jogo sem localização não conta): **ligar só antes de ativar recompensas reais**, numa migração própria                                                                                | CEO, Claude Code | `drizzle/migrations/0074_game_photo_location_flag.sql` ("COMO LIGAR") |
| 24  | Aplicar e testar as propostas pendentes: 0079 (quotas por IP)                                                                                                                                                | CEO, Claude Code | `drizzle/migrations/0079_anon_quotas_per_ip.sql`                      |

### A4. Backups e verificação técnica

| #   | Passo                                                                                                                  | Responsável        | Fonte                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------- |
| 25  | Confirmar o backup diário e a retenção de cerca de 14 dias **[VALIDAR]**                                               | Lovable/Cloudflare | `docs/security/BACKUPS.md`                      |
| 26  | Exportar a BD e descarregar os buckets do Storage (sem backup automático); guardar tudo cifrado fora da Lovable        | CEO                | `docs/security/BACKUPS.md`; `docs/LAUNCH.md` §5 |
| 27  | Testes de BD a PASS no projeto final (registo em `qa-output/db-tests.json` com menos de 24 h; o atual é de 05/11/2026) | Claude Code        | `docs/QA.md`; `docs/LAUNCH.md` §5               |
| 28  | `bun scripts/qa/prelaunch.ts` → `PRELAUNCH: PASS` (entra com as contas de teste: só com autorização)                   | Claude Code        | `docs/LAUNCH.md` §6                             |
| 29  | CSP em modo de teste: 0 avisos `[Report Only]` na consola do site publicado                                            | Claude Code, CEO   | `docs/security/CSP-INLINE.md`                   |

## B. Dia D (Fase 7)

| #   | Passo                                                                                                                                                                                                                                                                                                            | Responsável      | Fonte                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| 30  | Cópia de segurança imediatamente antes (BD e Storage)                                                                                                                                                                                                                                                            | CEO              | `docs/security/BACKUPS.md`                                                 |
| 31  | **Contas QA (turista, negócio, admin): desativar, não apagar**, com a proposta **0080** (banir no Auth e suspender "EKAYA Teste", "QA Negócio A" e "QA Negócio B — não reservar"; o histórico de pontos fica). **NÃO usar `supabase/launch/launch-day.sql` para isto: apaga as contas, os pontos e os negócios** | CEO, Claude Code | `drizzle/migrations/0080_disable_test_accounts.sql`; `docs/SECURITY.md` §8 |
| 32  | Decidir sobre as 2 contas internas que ficaram                                                                                                                                                                                                                                                                   | CEO              | `docs/SECURITY.md` §8                                                      |
| 33  | Apagar o `.env.test.local` das máquinas de quem testou; retirar das Redirect URLs o URL de pré-visualização, se já não for preciso                                                                                                                                                                               | CEO              | `docs/LAUNCH.md` §5                                                        |
| 34  | **Publish** na Lovable                                                                                                                                                                                                                                                                                           | CEO              | `docs/LAUNCH.md` §5 e §9                                                   |
| 35  | Verificação no domínio real: `prelaunch.ts --skip-build` e Lighthouse; no telemóvel: registo, recuperação, reserva de teste, painel do negócio, admin com 2FA, mapa; consola sem erros de CSP                                                                                                                    | Claude Code, CEO | `docs/LAUNCH.md` §9                                                        |
| 36  | **Repositório GitHub a privado** **[SEM DOC]** (decisão e momento por definir; a CI e os PRs continuam a funcionar)                                                                                                                                                                                              | CEO              | —                                                                          |

## C. Depois (D+1 a D+14)

| #   | Passo                                                                                                 | Responsável        | Fonte                         |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------- |
| 37  | Admin → Estado do lançamento → erros, todos os dias na primeira semana; `apoio@` no Gmail             | CEO                | `docs/LAUNCH.md` §5 e §9      |
| 38  | Responder aos pedidos "Para negócios" em 48 h ou menos; rever as perguntas sem resposta do assistente | CEO                | `docs/LAUNCH.md` §5           |
| 39  | **`www` com 301** pelo Cloudflare (decidido a 08/11/2026: depois do lançamento)                       | Lovable/Cloudflare | `docs/LAUNCH.md` §1, passo 8  |
| 40  | DMARC de `p=none` para `p=quarantine` quando não houver falhas                                        | Lovable/Cloudflare | `docs/LAUNCH.md` §5           |
| 41  | CSP: com uma semana sem avisos, passar o modo de teste a obrigatório                                  | Claude Code        | `docs/security/CSP-INLINE.md` |
| 42  | Rotina semanal de backups e teste de restauro                                                         | CEO                | `docs/security/BACKUPS.md`    |
| 43  | Apagar a pasta local `backups/` (fora do Git; só com o lançamento estável e com autorização)          | CEO                | `docs/LAUNCH.md` §5           |
