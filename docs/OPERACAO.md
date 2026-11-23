# Operação: checklist das Fases 4 e 5

Índice do que falta fazer antes de lançar: **Fase 4** (operação) e **Fase 5** (legal). Cada linha
remete para o documento onde está o passo a passo. Esta lista não acrescenta dados novos.

- **[SEM DOC]**: o tema ainda não tem nenhum documento no repositório. É preciso decidir ou pedir.
- Não confundir com "FASE 4/5" do `roadmap.md`, que são as fases do fluxo de reservas.

## Fase 4 — Operação

### 4.1 Domínio e email

- [ ] Domínio `exploreekaya.com` ligado na Lovable (plano pago), estado **Active**, HTTPS e `www` →
      raiz (`docs/LAUNCH.md` §1).
- [ ] HSTS confirmado no domínio real (`docs/LAUNCH.md` §1, passo 7).
- [ ] `www` com 301 pelo Cloudflare: **depois do lançamento** (decidido a 08/11/2026;
      `docs/LAUNCH.md` §1, passo 8).
- [ ] Envio de email: Emails da Lovable Cloud com remetente `nao-responder@exploreekaya.com`, e
      registos TXT, NS `notify` e `_dmarc` no DNS (`docs/LAUNCH.md` §2). Alternativa: Resend ou
      Brevo por SMTP.
- [ ] Textos dos emails de autenticação aplicados (`docs/email-templates.md`; `docs/LAUNCH.md` §2,
      passo 6).
- [ ] Receção em `apoio@exploreekaya.com` por Cloudflare Email Routing ou pelo reencaminhamento do
      registrador (`docs/LAUNCH.md` §4).
- [ ] Depois do email a funcionar: ligar `DOMAIN_EMAIL_LIVE` (`src/lib/app-info.ts`). Muda os Termos e
      a Política, por isso sobe `LEGAL_VERSIONS` e precisa de uma migração de
      `current_legal_versions()` (`docs/LAUNCH.md` §4).
- [ ] DMARC de `p=none` para `p=quarantine` quando não houver falhas (`docs/LAUNCH.md` §5, D+1 a
      D+14).

### 4.2 Pagamentos M-Pesa (manual)

- [ ] Instruções de pagamento M-Pesa em Admin → Destaques, com o número e o nome reais da conta
      (`docs/LAUNCH.md` §5).
- [ ] Integração automática (EPay, pawaPay, M-Pesa direto): só depois das respostas dos fornecedores
      (`docs/monetizacao/ESTUDO.md`; perguntas em `docs/monetizacao/emails-fornecedores.md`).
      Pagamentos na app: não usados hoje (`docs/legal/SUBCONTRATANTES.md`).

### 4.3 Autenticação (painel do Auth)

- [ ] URLs de retorno: Site URL e Redirect URLs com `/auth/callback` (`docs/LAUNCH.md` §3;
      `docs/SECURITY.md` §8).
- [ ] Limites: Token endpoint de 150 para 90 por 5 min; Sign-ups e sign-ins em 30 por 5 min; envio
      de emails em 60 por hora (`docs/LAUNCH.md` §8; `docs/security/RATE-LIMITS.md` §1).
- [ ] Palavra-passe com mínimo de 8 caracteres, letras e números; proteção contra palavras-passe
      em fugas, se o plano a tiver (`docs/LAUNCH.md` §8).
- [ ] 2FA ligada em todos os administradores (`docs/LAUNCH.md` §0; `docs/SECURITY.md` §6.1 e §8).

### 4.4 Backups

- [ ] Confirmar no painel o backup diário e a retenção de cerca de 14 dias **[VALIDAR]**
      (`docs/security/BACKUPS.md`).
- [ ] Rotina semanal: exportar a BD e descarregar os buckets do Storage (que não têm backup), e
      guardar tudo cifrado fora da Lovable (`docs/security/BACKUPS.md`).
- [ ] Teste de restauro numa BD temporária, com a data registada (`docs/security/BACKUPS.md`).
- [ ] Cópia de segurança antes do lançamento (`docs/LAUNCH.md` §5, D-7 a D-1).

### 4.5 Pré-lançamento (prelaunch)

- [ ] Mínimos em Admin → Estado do lançamento: pelo menos 5 negócios aprovados e 5 atividades
      ativas (`docs/LAUNCH.md` §0).
- [ ] `bun scripts/qa/prelaunch.ts` → `PRELAUNCH: PASS` (`docs/LAUNCH.md` §6), e depois contra o
      domínio real (`docs/LAUNCH.md` §9, passo 6).
- [ ] Testes de BD a PASS (`docs/QA.md`; `docs/LAUNCH.md` §5).
- [ ] CSP sem avisos na consola do site publicado (`docs/SECURITY.md` §7.1 e §8).
- [ ] Dia D: ensaiar `supabase/launch/launch-day.sql` com ROLLBACK, aprovar, apagar as contas de teste
      e o `.env.test.local` (`docs/LAUNCH.md` §5; `docs/SECURITY.md` §8).
- [ ] Decidir sobre as 2 contas internas que ficaram (`docs/SECURITY.md` §8).

## Fase 5 — Legal

### 5.1 Proteção de dados (RGPD e lei moçambicana)

- [ ] Contacto de privacidade e prazos de resposta (30 dias, mais 60 se for complexo)
      (`docs/legal/ENCARREGADO-PROTECAO-DADOS.md`).
- [ ] Decidir se é preciso um DPO formal (`docs/legal/ENCARREGADO-PROTECAO-DADOS.md`).
- [ ] DPA da Lovable **[DECIDIR]**: só existe nos planos Business e Enterprise
      (`docs/legal/SUBCONTRATANTES.md`).
- [ ] Transferências para fora de Moçambique e da UE **[VALIDAR COM JURISTA]**
      (`docs/legal/SUBCONTRATANTES.md`).
- [ ] Notificação de violações: 72 h à autoridade da UE e aviso às pessoas afetadas, se o risco
      for elevado (`docs/security/INCIDENTES.md`).
- [ ] Lei moçambicana de proteção de dados: proposta submetida mas sem aprovação encontrada até
      agosto de 2026 (`docs/monetizacao/ESTUDO.md`).

### 5.2 Termos e Política de Privacidade

- [ ] Revisão jurídica dos Termos e da Privacidade. Se mudarem, nova versão em `LEGAL_VERSIONS` e
      migração de `current_legal_versions()`, o que obriga a aceitar de novo (`docs/LAUNCH.md` §5;
      `CLAUDE.md`).
- [ ] Ler e confirmar os termos da MET Norway (têm de ser aceites por uma pessoa responsável)
      (`docs/legal/SUBCONTRATANTES.md`).
- [ ] Licença do react-leaflet para uso comercial **[VALIDAR COM JURISTA]**
      (`docs/legal/SUBCONTRATANTES.md`).
- [ ] Questões para o jurista: contrato de parceiro, defesa do consumidor (Lei n.º 22/2009),
      publicidade e conteúdo patrocinado (`docs/monetizacao/ESTUDO.md`).
- [ ] Questões para o contabilista: IVA, faturação legal e retenções (`docs/monetizacao/ESTUDO.md`).

### 5.3 Licença de atividade (RNAVT ou equivalente)

- [ ] **[SEM DOC]** O RNAVT não aparece em nenhum documento. A única referência é a pergunta ao
      jurista sobre se o EKAYA é intermediação turística ou agência de viagens à luz da lei do
      turismo, e se precisa de licença de atividade (`docs/monetizacao/ESTUDO.md`).
- [ ] Banco de Moçambique: confirmar se o fluxo de pagamento é um serviço de pagamento à luz da Lei
      15/2026 (`docs/monetizacao/ESTUDO.md`).

### 5.4 Seguro

- [ ] **[SEM DOC]** Nenhum documento trata de seguros (responsabilidade civil, atividades).

### 5.5 Cookies e armazenamento

- [ ] O aviso de armazenamento aparece no primeiro toque e o OK fecha-o (`docs/LAUNCH.md` §9,
      passo 7).
- [ ] **[SEM DOC]** Não há uma política de cookies à parte. Sem ferramentas de análise nem de
      publicidade (`docs/legal/SUBCONTRATANTES.md`).

### 5.6 Aviso de IA

- [ ] Hoje o assistente não usa IA generativa (`ASSISTANT_LLM_ENABLED = false`).
- [ ] Antes de ligar a fase 2 (Cloudflare Workers AI):
  - acrescentar o fornecedor à tabela de subcontratantes e à Política, e mudar a versão da Política;
  - confirmar que o DPA da Cloudflare cobre o Workers AI;
  - confirmar que o texto passa a "Assistente com IA, pode errar".
  - Fonte: `docs/legal/SUBCONTRATANTES.md`, "Assistente com IA (futuro)".
- [ ] Ligar só com limite por IP (`docs/security/QUALIDADE-V1.md`).
