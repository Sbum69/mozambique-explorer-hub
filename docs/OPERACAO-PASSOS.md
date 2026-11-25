# Operação — passos ordenados (Fase 4)

Cada passo diz **quem faz** e **como confirmar**:

- **CEO**: dono do projeto; faz tudo o que é painel (Lovable, Cloudflare, Gmail) e aprovações.
- **Claude Code**: repositório, propostas SQL e verificações.
- **Claude chat**: redação e revisão de textos.

A checklist geral do lançamento continua em `docs/OPERACAO.md`. Este ficheiro detalha a operação.
É um ficheiro separado porque o `docs/OPERACAO.md` está a ser alterado no branch
`feat/suporte-recompensas`, ainda por fundir.

`[CONFIRMAR]` = nome de menu ou valor a ver no ecrã do fornecedor no dia.

## 1. Email do domínio

### 1.1 Receber em `apoio@exploreekaya.com` — feito (23/11/2026)

- **Quem faz:** CEO (Cloudflare Email Routing).
- **Como confirmar:**
  1. De uma conta que não seja da equipa, enviar um email para `apoio@exploreekaya.com`.
  2. Tem de chegar ao Gmail da equipa (ver também o spam).
  3. Repetir uma vez por mês.
- **Fonte:** `docs/LAUNCH.md` §4.

### 1.2 Enviar emails de autenticação a partir do domínio (SPF, DKIM, DMARC)

- **Quem faz:** CEO (Lovable → Emails; registos no DNS da Cloudflare).
- **Passos:** `docs/LAUNCH.md` §2. Remetente `nao-responder@exploreekaya.com`, subdomínio `notify`
  com os NS da Lovable, e TXT `_dmarc`.
- **Como confirmar:**
  1. Registos no DNS (de qualquer computador):
     ```sh
     nslookup -type=TXT _dmarc.exploreekaya.com      # tem de existir v=DMARC1
     nslookup -type=NS notify.exploreekaya.com       # os nameservers da Lovable
     nslookup -type=TXT exploreekaya.com             # SPF da raiz (v=spf1 … _spf.mx.cloudflare.net)
     ```
  2. Pedir a recuperação da palavra-passe com uma conta QA. No Gmail: abrir o email →
     **⋮ → Mostrar original**. Tem de dizer **SPF: PASS**, **DKIM: PASS** e **DMARC: PASS**.
  3. O email chega à caixa de entrada, não ao spam.
- **Estado:** **[CONFIRMAR]** se os Emails da Lovable já estão ativos.

### 1.3 Responder como `apoio@` (enviar como)

- **Quem faz:** CEO.
- **Estado:** **[FUTURO]**. Precisa de um servidor SMTP. Até lá, as respostas saem do Gmail da
  equipa (`docs/LAUNCH.md` §4).
- Se for ligado: o Gmail → Definições → Contas → "Enviar email como" com o SMTP do fornecedor, e o
  SPF da raiz tem de incluir esse fornecedor.
  - O SPF só pode ter **um** registo `v=spf1`: juntar os `include:` num só.
  - **[DECIDIR]** Qual o fornecedor (Resend ou Brevo, `docs/LAUNCH.md` §2).
- **Como confirmar:** enviar "como apoio@" para uma conta externa → Mostrar original → SPF, DKIM e
  DMARC: PASS.

## 2. Limites do Auth (painel)

- **Quem faz:** CEO (Lovable → Cloud → Users → Auth settings) **[CONFIRMAR]** o nome dos menus.
- **Valores** (`docs/LAUNCH.md` §8, `docs/security/RATE-LIMITS.md` §1):

| Definição                    | Valor                                         |
| ---------------------------- | --------------------------------------------- |
| Token endpoint (login)       | 90 por 5 min, por IP                          |
| Sign-ups and sign-ins        | 30 por 5 min                                  |
| Envio de emails              | 60 por hora (depois de ativar os Emails, 1.2) |
| Comprimento da palavra-passe | 8, com letras e números                       |
| Palavras-passe em fugas      | ligado, se o plano mostrar a opção            |
| Confirmação de email         | **ligada** (sem ela, o registo revela contas) |

- **Como confirmar:**
  1. Captura do ecrã de cada valor, guardada pelo CEO.
  2. No registo, uma palavra-passe de 7 caracteres mostra "Mínimo 8 caracteres".
  3. Uma conta nova recebe o email de confirmação e não entra antes de confirmar.
  4. Cada administrador: depois da palavra-passe, a app pede o código de 2FA
     (`docs/SECURITY.md` §6.1).

## 3. Backups e exportação do Storage

- **Quem faz:** CEO.
- **Passos:** `docs/security/BACKUPS.md`.

| Quando              | O quê                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Uma vez, antes do D | Confirmar no painel o backup diário e a retenção (cerca de 14 dias) **[VALIDAR]**                    |
| Semanal (segunda)   | Exportar a BD (botão do painel ou `pg_dump` com a connection string do painel, nunca colada no chat) |
| Semanal             | Descarregar os buckets do Storage (as fotos e provas **não** têm backup automático)                  |
| Semanal             | Guardar cifrado fora da conta Lovable                                                                |
| Trimestral          | Teste de restauro numa BD temporária e registo da data em `BACKUPS.md`                               |

- **Buckets a descarregar:**
  - `community-photos`, `route-proofs` e `game-proofs` (privados);
  - `avatars` e `content-photos` (públicos).
- **Como confirmar:**
  1. O ficheiro `.dump` abre com `pg_restore --list`, sem erro.
  2. O número de ficheiros descarregados por bucket coincide com o do painel do Storage.
  3. O teste de restauro mostra as contagens das tabelas principais iguais às da produção.

## 4. Pagamentos M-Pesa manuais

- **Quem faz:** CEO (Admin → Destaques: número e nome reais da conta M-Pesa).
- **Factos do código:**
  - O M-Pesa manual existe **só para os destaques** (`manual_payment_configs`; a página Preços e
    reembolsos).
  - As **reservas** não se pagam na app. Os Termos dizem: "o pagamento não é feito na aplicação:
    combina-se diretamente com o negócio" (`src/lib/legal/terms.ts`).
- **Textos:** `docs/content/PAGAMENTO-MPESA.md` (PT/EN), com o texto para o ecrã de reserva
  coerente com os Termos e o texto das instruções dos destaques.
- **Como confirmar:**
  1. Admin → Destaques mostra o número e o nome reais.
  2. Um pedido de destaque de teste (conta QA de negócio) mostra a referência `EKD-…` e as
     instruções.
  3. O recibo (`/recibo/$id`) só aparece depois de o admin confirmar o pagamento.
- **[DECIDIR]** Se o EKAYA passar a receber as reservas por M-Pesa, mudam os Termos e a página
  Preços: é preciso uma nova versão legal, uma migração de `current_legal_versions()` e o
  Publish ao mesmo tempo.

## 5. Contas de teste no lançamento

- **Quem faz:** CEO (aprova e corre), com Claude Code (proposta).
- **Proposta:** `supabase/launch/proposta-0080-desativar-contas-qa.sql`. Desativa sem apagar,
  preserva `points_ledger`, é idempotente e corre numa transação com verificação final.
- **NÃO usar** o `supabase/launch/launch-day.sql` para isto: **apaga** contas, reservas e pontos.
- **Como confirmar:**
  1. O ensaio com `ROLLBACK` mostra `OK` em todas as verificações.
  2. Depois do `COMMIT`, uma tentativa de login com a conta QA é recusada.
  3. Os negócios de teste não aparecem em `/businesses` num separador anónimo.

## 6. Quotas por IP (proposta 0079)

- **Quem faz:** CEO (confirma com a Lovable), com Claude Code.
- **Antes de aprovar:** a lista e o teste em `docs/security/QUOTAS-ANONIMOS.md`, secção "0079 — O
  que confirmar sobre o cabeçalho de IP".
