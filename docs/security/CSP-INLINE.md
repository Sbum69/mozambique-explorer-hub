# CSP: tirar `script-src 'unsafe-inline'` (plano)

> Estado a 23/11/2026, `@tanstack/react-router` 1.170.41, `@tanstack/react-start` 1.168.60.
> **Modo de teste ativo (passos 1, 2, 3 e 5 do plano):** cada página leva, além da CSP obrigatória
> (`script-src 'self' 'unsafe-inline'`, sem mudanças), um `Content-Security-Policy-Report-Only` com
> `script-src 'self' 'nonce-<valor do pedido>'`. Ver "Modo de teste" no fim.

## Scripts inline do site

| #   | Script                                        | Onde                                                              | Conteúdo                                                                                           | Muda por pedido?                          |
| --- | --------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | `THEME_INIT_SCRIPT`                           | `src/routes/__root.tsx:100` (`head.scripts`), em todas as páginas | Lê `ekaya.theme` do `localStorage` e põe `class="dark"` e `color-scheme` antes da primeira pintura | Não (texto fixo, `src/lib/theme.ts`)      |
| 2   | `MOTION_INIT_SCRIPT`                          | `src/lib/home-head.ts:45`, só na página inicial                   | Põe `data-motion="off"` em aparelhos fracos ou com movimento reduzido                              | Não (`src/lib/home-story-motion-gate.ts`) |
| 3   | Estado do router e hidratação (`<Scripts />`) | `src/routes/__root.tsx:117`, TanStack Start                       | Dados do SSR (`$_TSR`, carregadores, query cache) e arranque da hidratação                         | **Sim** (dados de cada página)            |
| 4   | JSON-LD (`type="application/ld+json"`)        | `src/lib/home-head.ts:46`, `src/lib/page-meta.ts:158`             | Dados estruturados para SEO                                                                        | Sim (por página)                          |

- O n.º 4 **não é executado**: blocos de dados com `type` não-JavaScript não estão sujeitos ao
  `script-src`, por isso não precisam de nonce nem de hash.
- Não há `dangerouslySetInnerHTML`, handlers inline (`onclick="…"`) nem URLs `javascript:` em `src/`.
- **[CONFIRMAR]**: scripts injetados pela Lovable no preview (o editor mostra a app num iframe) e
  pela Cloudflare (ex.: Email Obfuscation, Rocket Loader, Web Analytics, se forem ligados). Verificar
  com `scripts/qa/csp.ts` no preview e no domínio publicado.

## Opções

- **Só hashes:** servem para os n.os 1 e 2 (texto fixo, o `sha256` calcula-se no build). **Não servem**
  para o n.º 3, que muda em cada pedido. Sozinhos não chegam.
- **Nonce por pedido (recomendado):** o TanStack já o suporta. `router.options.ssr.nonce` é lido por
  `<Scripts />` (`@tanstack/react-router/dist/esm/Scripts.js`) e pelos `head.scripts`
  (`Asset.js`). Cobre os três sem listar hashes.

## Plano (nonce)

1. **Gerar o nonce por pedido** no servidor (16 bytes aleatórios, base64) no início do pedido SSR.
   Tem de ser o mesmo valor no cabeçalho e no HTML.
2. **Passá-lo ao router** em `src/router.tsx` (`ssr: { nonce }`), criado por pedido no servidor.
3. **Pô-lo na CSP:** `contentSecurityPolicy()` passa a receber o nonce e devolve
   `script-src 'self' 'nonce-<valor>'`. O `headers` da rota raiz tem de ler o mesmo valor do contexto
   do pedido **[CONFIRMAR]** (onde o TanStack Start expõe o contexto ao `headers()`).
4. **Opcional:** acrescentar `'strict-dynamic'`, para os chunks que o Vite carrega dinamicamente
   herdarem a confiança. Mantém-se `'self'` para browsers antigos.
5. **Período de observação:** primeiro em `Content-Security-Policy-Report-Only` com a política nova,
   ao lado da atual. Correr `bun scripts/qa/csp.ts` (todas as páginas, convidado e com sessão) e
   `scripts/qa/hydration.ts`.
6. **Passar a obrigatória** com 0 violações no local, no preview da Lovable e no domínio publicado.
7. **Testes:** `security-headers` com um caso de nonce (sem `'unsafe-inline'` em `script-src`), mais
   um teste que confirma que o nonce muda entre dois pedidos.

## Riscos e limites

- **HTML em cache:** se o HTML ficar em cache (CDN), o nonce repete-se e perde valor. Hoje o HTML
  tem `Vary: Cookie`. Confirmar que nenhuma camada guarda o HTML **[CONFIRMAR]**.
- **`style-src 'unsafe-inline'` fica igual:** os estilos inline do React, do Leaflet e do
  framer-motion precisam dele. Retirá-lo é outro trabalho e tem menos risco do que o dos scripts.
- **Scripts de terceiros futuros** (CAPTCHA, análise) precisam do nonce ou de entrar na CSP, e entram
  em `CSP_SOURCES` e no `scripts/qa/csp.ts`.

## Modo de teste (implementado)

### Como funciona

- `src/lib/csp-nonce-middleware.ts` (request middleware, o primeiro em `src/start.ts`):
  - gera um nonce por pedido (`createCspNonce`, 16 bytes, base64);
  - passa-o no contexto do pedido;
  - nas respostas `text/html`, acrescenta `Content-Security-Policy-Report-Only` com
    `reportOnlyContentSecurityPolicy()` (`src/lib/security-headers.ts`).
  - As outras diretivas são as da CSP obrigatória (o teste unitário confirma).
- `src/router.tsx`: `ssr: { nonce }` com o nonce do contexto (`getGlobalStartContext()`). O
  TanStack põe-no em todos os `<script>` (tema, movimento, hidratação, módulos) e em
  `<meta property="csp-nonce">`, de onde o router do browser o lê ao hidratar.
- O passo 3 do plano resolveu-se assim: o cabeçalho é posto pelo middleware, que conhece o nonce,
  e não pelo `headers()` da rota raiz.

### Verificado localmente (wrangler dev, 23/11/2026)

- 19 páginas de convidado, em tema claro e escuro (38 casos):
  - cabeçalho Report-Only presente;
  - 0 avisos de CSP na consola, 0 erros de hidratação, 0 erros de página;
  - tema certo antes de hidratar.
- Todos os `<script>` levam o nonce do pedido, e o nonce muda de pedido para pedido.
- Controlo negativo: um script inline injetado sem nonce gera o aviso `[Report Only]` e continua a
  correr (a CSP obrigatória ainda o permite).
- **Por fazer:** as páginas com sessão (turista, negócio, admin). Correr `bun scripts/qa/csp.ts`
  com as contas de teste (lê o `.env.test.local`).

### Como verificar em produção

O cabeçalho não tem `report-uri`/`report-to`: as violações aparecem **só na consola do browser**
(não há endpoint que as receba).

1. Confirmar o cabeçalho:
   `curl -sI https://exploreekaya.com/home | grep -i content-security-policy`
   - Têm de aparecer as duas linhas.
   - O `nonce-…` tem de mudar entre dois pedidos. Se se repetir, o HTML está em cache: parar.
2. No computador, abrir F12 → Console e percorrer:
   - as páginas de `docs/LAUNCH.md` §9, passo 7;
   - entrar e sair;
   - uma reserva de teste;
   - o mapa;
   - o painel do negócio;
   - o admin com 2FA.
3. **O que procurar:** mensagens que começam por `[Report Only] Refused to execute inline script` ou
   `Executing inline script violates the following Content Security Policy directive 'script-src 'self' 'nonce-…''`.
   - **0 mensagens** = pronto para o modo ativo.
   - Uma mensagem mostra o script (o `sha256-…` e a linha). Se vier da Lovable ou da Cloudflare
     (Rocket Loader, Email Obfuscation, Web Analytics), desligar essa função no painel ou decidir
     se entra na política.
4. Repetir no preview da Lovable (dentro do editor) e em `bun scripts/qa/csp.ts` com
   `QA_BASE=https://exploreekaya.com`. O script já conta as mensagens Report-Only como violações.

### Como passar a modo ativo

Depois de pelo menos uma semana com 0 mensagens em produção:

1. Em `securityHeaders()`, a CSP obrigatória passa a receber o nonce. É preciso movê-la para o
   middleware (o único sítio que conhece o nonce), com `script-src 'self' 'nonce-…'`. Retirar o
   `Content-Security-Policy` do `headers()` da rota raiz para não haver duas políticas
   obrigatórias, porque o browser aplica as duas e a mais restrita ganha.
2. Retirar o `Content-Security-Policy-Report-Only` (ou mantê-lo uma semana com a próxima política
   em teste).
3. Atualizar `security-headers.test.ts`: a obrigatória sem `'unsafe-inline'` em `script-src`.
4. Correr `bun scripts/qa/csp.ts`, `scripts/qa/hydration.ts` e o `prelaunch.ts`.
5. **Para voltar atrás**: repor `'unsafe-inline'` em `script-src` (uma linha).
