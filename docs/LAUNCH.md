# Lançamento do EKAYA — guia passo a passo

Para quem faz o lançamento (dono do projeto). Cada passo diz **onde** se faz e **como confirmar**.
Valores que dependem de fornecedores estão entre `<…>`; os passos marcados **[CONFIRMAR]** devem
ser conferidos no ecrã do fornecedor no dia (os menus mudam).

## 0. Mínimos para lançar

Admin → **Estado do lançamento** mostra tudo isto ao vivo (contas internas não contam):

- [ ] ≥ **5 negócios aprovados** e ≥ **5 atividades ativas** (só ficam ativas se nada faltar).
- [ ] **Todos os administradores com verificação em dois passos** (Definições → Segurança).
- [ ] Pedidos "Para negócios" e destaques pendentes tratados (não bloqueiam, mas não os deixes
      sem resposta).
- [ ] `bun scripts/qa/prelaunch.ts` → **PRELAUNCH: PASS** (ver §6).

## 1. Domínio (Lovable)

1. Lovable → projeto EKAYA → **Settings → Domains → Connect domain**. Escrever `<domínio>` (e
   depois `www.<domínio>`). **[CONFIRMAR]**
2. No fornecedor do domínio, criar os registos DNS que o Lovable mostrar. Normalmente:

   | Tipo | Nome       | Valor                                |
   | ---- | ---------- | ------------------------------------ |
   | A    | `@`        | `<IP indicado pelo Lovable>`         |
   | A    | `www`      | `<IP indicado pelo Lovable>`         |
   | TXT  | `_lovable` | `<código de verificação do Lovable>` |

3. Esperar a verificação e o certificado HTTPS (minutos a 48 h). Confirmar: `https://<domínio>`
   abre a aplicação com o cadeado.
4. Escolher o domínio principal (com ou sem `www`) e redirecionar o outro para ele.

## 2. Email (envio de emails de conta)

1. Escolher o fornecedor de email transacional `<fornecedor SMTP>` e criar a conta (só tu podes).
2. No DNS do domínio, criar os registos que o fornecedor indicar:

   | Tipo      | Nome                   | Valor                                                                                                   |
   | --------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
   | TXT       | `@`                    | SPF: `v=spf1 include:<fornecedor> ~all` (um só registo SPF por domínio)                                 |
   | TXT/CNAME | `<seletor>._domainkey` | DKIM: o valor do fornecedor                                                                             |
   | TXT       | `_dmarc`               | `v=DMARC1; p=none; rua=mailto:dmarc@<domínio>` (passar a `quarantine` depois de 2–4 semanas sem falhas) |

3. Lovable Cloud → **Users / Authentication → Emails → SMTP settings** **[CONFIRMAR]**: host,
   porta, utilizador, palavra-passe do SMTP (ficam no servidor, nunca no código), remetente
   `EKAYA <nao-responder@<domínio>>`.
4. Confirmar: criar uma conta de teste com um email teu e ver que o email de confirmação chega
   (e não vai para spam). Apagar essa conta depois.

## 3. Autenticação: URLs de retorno

Lovable Cloud → **Authentication → URL configuration** **[CONFIRMAR]**:

- Site URL: `https://<domínio>`
- Redirect URLs: `https://<domínio>/auth/callback`, `https://www.<domínio>/auth/callback` e, até
  ao fim dos testes, o URL de pré-visualização do Lovable.
- Confirmar: "Esqueci-me da palavra-passe" envia um link que abre `https://<domínio>/auth/callback`.

## 4. Contacto oficial

1. Criar a caixa `apoio@<domínio>`.
2. Mudar `SUPPORT_EMAIL` em `src/lib/app-info.ts` para `apoio@<domínio>` (aparece nos Termos, na
   Privacidade, no assistente e em Para negócios), num PR próprio.
3. Atualizar `docs/sales/*` e as respostas da FAQ que citam o email (Admin → Assistente; o texto
   usa `{SUPPORT}`, por isso basta o passo 2).
4. Se o NUIT já existir: preencher `LEGAL_ENTITY.nuit` e `incorporated` em `app-info.ts`.

## 5. Antes / durante / depois

**Antes (D-7 a D-1)**

- [ ] Lote B aplicado e testes de BD a PASS (registo em `qa-output/db-tests.json`).
- [ ] Revisão jurídica dos Termos e da Privacidade; se mudarem, nova versão em
      `LEGAL_VERSIONS` + migração de `current_legal_versions()` (obriga a aceitar de novo).
- [ ] Mínimos de conteúdo cumpridos (§0); fotografias com licença e créditos em `/creditos`.
- [ ] Domínio, email e URLs de retorno (§1–3) a funcionar na pré-visualização https.
- [ ] Instruções de pagamento M-Pesa em Admin → Destaques (número e nome da conta reais).
- [ ] `prelaunch.ts` → PASS.
- [ ] Cópia de segurança: exportar a base de dados (Lovable Cloud) e guardar fora do projeto.

**Dia D**

1. Ensaiar `supabase/launch/launch-day.sql` com `ROLLBACK` (ver o cabeçalho do ficheiro).
2. **Aprovar** e correr com `COMMIT`; correr a verificação do fim do ficheiro.
3. Apagar no Storage os ficheiros listados pelo SQL.
4. Apagar `.env.test.local` e as sessões de teste; retirar das Redirect URLs o URL de
   pré-visualização se já não for preciso.
5. Publicar no Lovable (**Publish**) — só tu.
6. Abrir `https://<domínio>`: página inicial, registo, entrada, uma reserva de teste com uma conta
   tua real (e cancelar), Para negócios, assistente.

**Depois (D+1 a D+14)**

- [ ] Admin → Estado do lançamento → erros dos últimos 7 dias, todos os dias na primeira semana.
- [ ] Responder aos pedidos Para negócios em ≤ 48 h.
- [ ] Rever as perguntas sem resposta do assistente (Admin → Assistente) e criar entradas.
- [ ] DMARC de `p=none` para `p=quarantine` quando não houver falhas.
- [ ] Apagar `backups/` (só depois do lançamento estável e com autorização).

## 6. Verificação técnica (`prelaunch.ts`)

```sh
bun run build && bunx wrangler@4.45.0 dev --port 4173 --local   # noutra janela
bun scripts/qa/prelaunch.ts
```

Corre tsc, lint, Vitest, build, confirma o registo dos testes de BD (menos de 24 h, todos PASS),
hidratação, larguras, idioma, contraste, CSP, as 3 jornadas (admin com TOTP), os módulos novos e o
Lighthouse. Resultado final numa linha: `PRELAUNCH: PASS` ou `FAIL`.
