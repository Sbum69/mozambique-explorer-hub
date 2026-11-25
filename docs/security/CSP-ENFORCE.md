# CSP: passar de Report-Only a obrigatória (passos, NÃO ativado)

Estado a 25/11/2026, no `main`:

- **CSP obrigatória** em vigor: `script-src 'self' 'unsafe-inline'`. Vem de `securityHeaders()`,
  no `headers()` da rota raiz (`src/routes/__root.tsx`).
- **Política em teste:** `Content-Security-Policy-Report-Only` com `script-src 'self' 'nonce-…'`
  (nonce por pedido), posta pelo middleware `src/lib/csp-nonce-middleware.ts` nas respostas HTML.
- Os detalhes e o modo de teste estão em `docs/security/CSP-INLINE.md`. Este ficheiro é só a lista
  de passos para o dia da mudança.

Nada aqui está ativado. Cada passo diz quem faz.

## 0. Condições para avançar (CEO decide)

- [ ] Pelo menos **7 dias** com o site publicado e **0 mensagens `[Report Only]`** na consola, nas
      páginas de `docs/LAUNCH.md` §9 (convidado e com sessão: turista, negócio, admin com 2FA).
- [ ] O `nonce-…` do cabeçalho muda entre dois pedidos à mesma página (o HTML não fica em cache):
      `curl -sI https://exploreekaya.com/home | grep -i content-security-policy-report-only`, duas
      vezes.
- [ ] O preview da Lovable (dentro do editor) também sem mensagens.
- [ ] Os branches que mexem no `src/routes/__root.tsx` já fundidos ou fechados. Hoje:
      `feat/css-teste` acrescenta lá o `data-variant`, e convém evitar conflitos.

## 1. Mudança no código (Claude Code, num branch próprio)

1. `src/lib/security-headers.ts`: `securityHeaders()` deixa de incluir `Content-Security-Policy`.
   A política obrigatória passa a vir do middleware, que é o único sítio que conhece o nonce.
2. `src/lib/csp-nonce-middleware.ts`: nas respostas HTML, enviar
   `Content-Security-Policy: <reportOnlyContentSecurityPolicy(…, nonce)>` (a mesma política que
   hoje está em teste). Retirar o cabeçalho `Report-Only`, ou mantê-lo uma semana com a próxima
   política em teste.
3. Respostas que **não** são HTML (server functions, ficheiros): sem CSP, como hoje. A CSP só
   protege documentos.
4. `src/lib/security-headers.test.ts`:
   - a política obrigatória **sem** `'unsafe-inline'` em `script-src`;
   - um teste de que o nonce muda entre dois pedidos.
5. Não regenerar o `src/routeTree.gen.ts` à mão (o build pode regenerá-lo: repor a cópia).

## 2. Verificação antes do Publish (Claude Code)

- `bun run ci` (tsc, vitest, lint, build, route tree) → PASS.
- `bun run build` e `bunx wrangler@4.45.0 dev --port 4173 --local`:
  - `curl -sI http://127.0.0.1:4173/home`: um só `Content-Security-Policy`, com `'nonce-…'` e sem
    `'unsafe-inline'` em `script-src`;
  - `scripts/qa/csp.ts`, `scripts/qa/hydration.ts` e `scripts/qa/prelaunch.ts` → PASS. Com sessão,
    precisam das contas QA no `.env.test.local`;
  - teste negativo: um `<script>` inline sem nonce injetado na consola **é bloqueado** (antes só era
    reportado).

## 3. Publicação (CEO)

1. Merge do PR (CEO) e **Publish** na Lovable.
2. Logo a seguir, no site publicado:
   - a consola sem erros "Refused to execute inline script";
   - entrar, ver o mapa, fazer uma reserva de teste com a conta QA e abrir o admin com 2FA.

## 4. Reverter (se alguma coisa partir)

- **Rápido:** repor `'unsafe-inline'` no `script-src` da política obrigatória (uma linha em
  `reportOnlyContentSecurityPolicy`, ou voltar a pôr a CSP antiga em `securityHeaders()`), e depois
  `bun run ci`, merge e Publish.
- **Completo:** reverter o commit do passo 1.
- Os nonces continuam nos scripts e não fazem mal com `'unsafe-inline'`.

## 5. Riscos conhecidos

- Scripts injetados pela Lovable ou pela Cloudflare (Rocket Loader, Email Obfuscation, Web
  Analytics) ficam bloqueados. Desligá-los no painel antes da mudança.
- `style-src 'unsafe-inline'` fica igual. Retirá-lo é outro trabalho (React, Leaflet e
  framer-motion usam estilos inline).
