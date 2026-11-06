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

## 2. Email: enviar (confirmação de conta, recuperação, notificações)

**Opção recomendada: os Emails da própria Lovable Cloud.** Não é preciso conta noutro fornecedor nem
chave SMTP. Está incluída no plano pago:

- 50 000 emails de transação por mês;
- no plano Pro, até 500 emails de autenticação por hora e 100 emails da app por hora;
- SPF, DKIM e DMARC configurados pela Lovable;
- resolve o limite atual de 2 emails por hora.

Fonte: <https://docs.lovable.dev/features/custom-emails>.

1. Lovable → projeto EKAYA → **More → Emails → Get started**.
2. **Email domain:** `exploreekaya.com` → **Continue**.
3. Mudar o prefixo do remetente para `nao-responder` e ligar **Show as sent from
   @exploreekaya.com**. O remetente fica `nao-responder@exploreekaya.com`. Nome a mostrar: `EKAYA`.
   **[CONFIRMAR]** onde fica o campo do nome. → **Set up domain**.
4. **Go to our manual setup** e copiar para o DNS os registos que a janela mostrar:

   | Tipo | Nome                        | Valor                                                        |
   | ---- | --------------------------- | ------------------------------------------------------------ |
   | TXT  | o nome que a janela mostrar | o valor de verificação                                       |
   | NS   | `notify`                    | cada um dos nameservers da Lovable (um registo NS por valor) |
   | TXT  | `_dmarc`                    | o valor que a janela mostrar                                 |

   Os registos NS são **só para o subdomínio `notify`**. **Não mudar** os nameservers do domínio
   principal no registrador por causa disto. O SPF e o DKIM ficam no subdomínio e são geridos pela
   Lovable, por isso não há registos SPF ou DKIM a criar à mão para o envio.

5. Esperar o estado **Active** (algumas horas; até 72 h).
6. **More → Emails → Auth emails → Customize auth emails** e aplicar os textos de
   `docs/email-templates.md`. Os modelos só entram em vigor depois de **Publish**.
7. Lovable → **Cloud → Users → Auth settings → Rate limits** **[CONFIRMAR]**: "Rate limit for
   sending emails" para **60 por hora**. O máximo do Pro são 500; 60 chega para o piloto e trava
   abusos.
8. Diz-me **"SMTP configurado"**. Eu testo o registo, a recuperação, a entrada na caixa de entrada
   (cabeçalhos SPF, DKIM e DMARC) e vários envios seguidos.

**Alternativa**, se os Emails da Lovable não estiverem disponíveis no teu plano: Resend como SMTP.

- Plano grátis: 3 000 emails por mês e 100 por dia; tem relay SMTP. Fonte:
  <https://resend.com/pricing>.
- Se 100 por dia não chegar: Brevo, com 300 por dia no plano grátis. Fonte:
  <https://www.brevo.com/free-smtp-server/>.
- Os registos SPF, DKIM e DMARC vêm do painel do fornecedor.
- O SMTP põe-se no Auth: Cloud → Users → Auth settings → SMTP **[CONFIRMAR]**.
- A chave fica só no painel, nunca no código nem no chat.

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

## 4. Email: receber em apoio@exploreekaya.com

**Opção recomendada: Cloudflare Email Routing (grátis).** Reencaminha `apoio@exploreekaya.com` para
o teu Gmail. Exige que o DNS do domínio esteja no Cloudflare (plano grátis). Fonte:
<https://developers.cloudflare.com/email-routing/>.

1. Criar conta em <https://dash.cloudflare.com> (plano **Free**) → **Add a domain** →
   `exploreekaya.com`. O Cloudflare copia os registos DNS que já existem.
2. Conferir que estão lá os registos da Lovable (§1 e §2): os dois A em **DNS only**, o TXT
   `_lovable`, os NS do `notify` e o `_dmarc`. Acrescentar os que faltarem.
3. No registrador do domínio, trocar os **nameservers** pelos dois que o Cloudflare mostrar. A
   propagação demora de minutos a 24 h.
4. Cloudflare → `exploreekaya.com` → **Email → Email Routing → Onboard Domain / Get started**. O
   Cloudflare cria sozinho:
   - os registos **MX** (`route1/2/3.mx.cloudflare.net`);
   - o **SPF** da raiz (`v=spf1 include:_spf.mx.cloudflare.net ~all`);
   - o **DKIM** do reencaminhamento.

   Aceitar.

5. **Destination addresses** → adicionar o teu Gmail → abrir o email de verificação do Cloudflare e
   confirmar.
6. **Routing rules → Create routing rule**: `apoio` @exploreekaya.com → **Send to an email** → o teu
   Gmail → **Save**.
7. Testar: de outra conta, enviar um email para `apoio@exploreekaya.com` e confirmar que chega ao
   Gmail (ver também o spam).

Para **responder como apoio@** a partir do Gmail ("Enviar como"), é preciso um SMTP. Fica para depois
do piloto **[FUTURO]**. Até lá, as respostas saem do teu Gmail.

**Alternativa:** se o teu registrador tiver reencaminhamento de email grátis (muitos têm), serve o
mesmo. Basta criar `apoio` → teu Gmail no painel do registrador, sem mudar os nameservers.

**Depois de o email funcionar** (passo 7), eu ligo `DOMAIN_EMAIL_LIVE` em `app-info.ts` num PR.
Isso muda o contacto nos Termos, na Política e na página Preços:

- a página Preços não exige nova aceitação;
- os Termos e a Política exigem: sobe-se a versão (`LEGAL_VERSIONS` + migração de
  `current_legal_versions()`, com a tua aprovação) e todas as contas aceitam outra vez.

Atualizar também `docs/sales/*`. As respostas da FAQ usam `{SUPPORT}` e mudam sozinhas.

Se o NUIT já existir, preencher `LEGAL_ENTITY.nuit` e `incorporated` em `app-info.ts`.

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

## 7. Mapas: chave ArcGIS (recomendada antes de crescer)

Sem chave, os mapas usam os mosaicos do OpenStreetMap. A política do OSM não proíbe uso comercial,
mas não dá garantias. Com a chave, a app passa para a Esri: são 2 milhões de mosaicos grátis por mês,
a licença permite uso comercial e o satélite volta ao mapa dos roteiros. Fonte:
<https://location.arcgis.com/pricing/>.

1. Criar conta grátis em <https://location.arcgis.com> (**ArcGIS Location Platform**).
2. **Developer credentials → New developer credentials → API key credentials**.
3. **Privileges:** marcar só **Location services → Basemaps** (mosaicos estáticos e imagens).
   Nada mais.
4. **Referrers** (restrição de origem): `https://exploreekaya.com`, `https://www.exploreekaya.com` e
   o URL `https://<projeto>.lovable.app`.
5. Prazo de validade: o máximo que o painel deixar (1 ano). Pôr um lembrete para a renovar.
6. Copiar a chave para o `.env.test.local` como `VITE_ARCGIS_API_KEY=…` e dizer-me "chave ArcGIS
   no .env.test.local". **Não a colar no chat.**
   - É uma chave de browser, pública por natureza e limitada aos referrers acima, como a chave
     publicável da Supabase.
   - Eu passo-a para o `.env` num PR, meço o Lighthouse do mapa e confirmo a atribuição
     "Powered by Esri" com os dados que a Esri publica para o estilo `arcgis/streets`.
7. No painel da Location Platform, confirmar todos os meses o consumo de mosaicos (aviso a 80 %).
