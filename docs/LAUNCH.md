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

## 1. Domínio exploreekaya.com (Lovable)

Precisa de um plano pago da Lovable (domínios próprios não estão no plano grátis).

1. Lovable → projeto EKAYA → **Project → Settings → Domains → Connect domain**.
2. Escrever `exploreekaya.com` → **Continue** → **Root domain**. Deixar ligado
   **Redirect www.exploreekaya.com → exploreekaya.com** (vem ligado por omissão). Não ligar
   "Uses Cloudflare or similar proxy".
3. Escolher **manual setup** e copiar para o DNS do domínio (no registrador, ou no Cloudflare se
   mudares os nameservers no passo do email, §4) os registos que a janela mostrar:

   | Tipo | Nome       | Valor                                                               |
   | ---- | ---------- | ------------------------------------------------------------------- |
   | A    | `@`        | o IP que a Lovable mostrar                                          |
   | A    | `www`      | o mesmo IP (a janela mostra-o quando o redirect do www está ligado) |
   | TXT  | `_lovable` | `lovable_verify=…` (o valor completo da janela)                     |
   - Se a Lovable mostrar também um registo AAAA, criá-lo.
   - No Cloudflare: os dois registos A em **DNS only** (nuvem cinzenta), não "Proxied".
   - Se houver registos CAA, têm de permitir `letsencrypt.org` ou `pki.goog`.

4. **Done** e esperar o estado **Active** (normalmente algumas horas; até 72 h). O certificado HTTPS
   é emitido pela Lovable.
5. **Publish** (o domínio só serve a app depois de publicar).
6. Confirmar:
   - `https://exploreekaya.com` abre com o cadeado;
   - `https://www.exploreekaya.com` redireciona para a raiz;
   - `https://exploreekaya.com/robots.txt` tem `Sitemap: https://exploreekaya.com/sitemap.xml`;
   - o URL `*.lovable.app` responde com `X-Robots-Tag: noindex` e o seu `robots.txt` é `Disallow: /`.
7. **HSTS**: a app envia `Strict-Transport-Security: max-age=31536000; includeSubDomains` em cada
   página. Confirmar no domínio real:

   ```sh
   curl -sI https://exploreekaya.com/home | grep -i strict-transport-security
   ```

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

Lovable → **Cloud → Users → Auth settings → URL configuration** **[CONFIRMAR]** (o nome do menu
pode mudar):

- **Site URL:** `https://exploreekaya.com`
- **Redirect URLs** (uma por linha):
  - `https://exploreekaya.com/auth/callback`
  - `https://www.exploreekaya.com/auth/callback`
  - `https://<o teu projeto>.lovable.app/auth/callback` (o URL publicado atual, enquanto o piloto
    também correr lá)
- Os emails de confirmação e recuperação voltam para o domínio onde a pessoa se registou: `www`
  vai sempre para a raiz, e as pré-visualizações privadas nunca são usadas. Depois do login, a app só
  volta para páginas da lista fixa (`parseAuthReturn`).
- Confirmar: em `https://exploreekaya.com/forgot-password`, pedir o email. O link abre
  `https://exploreekaya.com/auth/callback` e leva a `/reset-password`.

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
