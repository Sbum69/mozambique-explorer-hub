# CSP: tirar `script-src 'unsafe-inline'` (plano)

> Só plano: o código não muda neste bloco. Estado a 23/11/2026, `@tanstack/react-router` 1.170.41,
> `@tanstack/react-start` 1.168.60. CSP atual em `src/lib/security-headers.ts`:
> `script-src 'self' 'unsafe-inline'`.

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
