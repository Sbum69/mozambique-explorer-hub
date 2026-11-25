# Desempenho — medições de 25/11/2026 (branch `chore/fase-6-desempenho`)

## Como foi medido

- **Ambiente:**
  - build de produção servido com `bunx wrangler@4.45.0 dev --port 4173 --local`;
  - Lighthouse 12 (de `scripts/qa/node_modules`), mobile, throttling simulado, Edge headless;
  - só desempenho; **sem sessão** (não se usou o `.env.test.local`);
  - 5 corridas por página, com a mediana.
- **Variação grande:** as 5 corridas da mesma página foram de 52 a 77 antes e de 60 a 91 depois.
  Por isso, o score sozinho não serve: comparam-se o trabalho na thread principal e o JS de cada
  rota.
- `/games` e `/dashboard` **exigem sessão** (`requireAuthenticatedUser`, `requireTravellerPanel`).
  Sem as contas QA, o Lighthouse só veria a página de login. Para estas duas rotas mediu-se o JS que
  cada uma carrega (chunk da rota e imports estáticos, sem o `index` partilhado de 242 KB gz).

## Resultados

| Página         | Medida                             | Antes    | Depois  | Mudança                                   |
| -------------- | ---------------------------------- | -------- | ------- | ----------------------------------------- |
| `/itineraries` | Score (mediana de 5)               | 67       | 64      | dentro do ruído                           |
| `/itineraries` | LCP                                | 3,85 s   | 3,87 s  | igual                                     |
| `/itineraries` | TBT                                | 810 ms   | 600 ms  | −210 ms                                   |
| `/itineraries` | Pintura (paint/composite)          | 375 ms   | 116 ms  | −259 ms                                   |
| `/itineraries` | Trabalho total na thread principal | 3,88 s   | 3,56 s  | −0,32 s                                   |
| `/games`       | JS da rota (gz, além do `index`)   | 102,1 KB | 76,7 KB | −25,4 KB (o zod deixou de vir com a rota) |
| `/dashboard`   | JS da rota (gz, além do `index`)   | 88,5 KB  | 88,5 KB | sem mudança                               |

## O que mudou (sem mudar comportamento nem design)

1. **`src/routes/itineraries.tsx`:** os cartões da lista têm
   `content-visibility: auto` e `contain-intrinsic-size: auto 440px`.
   - O browser deixa de calcular layout e pintura dos cartões fora do ecrã.
   - Verificado no browser, a 1280 e 390 px: 41 cartões, scroll até ao fim sem erros, a altura da
     página varia cerca de 1% ao fazer scroll, e o aspeto é igual.
2. **`src/lib/maputo-date.ts` (novo):** `maputoToday()` passou para um módulo próprio.
   - O `src/lib/games.ts` só precisava desta função, mas importava-a de `src/lib/rewards.ts`, que
     traz o zod.
   - O `rewards.ts` continua a exportar `maputoToday`, por isso os outros imports não mudam.

## O que não se mexeu, e porquê

- **Imagens das capas dos roteiros**, com 47 KB a mais: não há variante do mesmo corte. A `-card`
  é vertical (450×600) e a `-thumb` tem 288 px. Gerar uma nova muda os ficheiros de fotografia e os
  créditos, e as capas já são `lazy` e não são o LCP.
- **framer-motion** (chunk `proxy`, 38,8 KB gz em `/itineraries`, `/games` e `/dashboard`):
  tirá-lo muda as animações de entrada.
- **`index` de entrada** (242 KB gz, cerca de 123 KB por usar no `/itineraries`): está partilhado
  por todas as páginas, e partir mais exige mexer no router e no root. O `__root.tsx` está alterado
  no branch `feat/css-teste`.
- **LCP de 3,9 s** em `/itineraries`: o elemento é texto que já vem no HTML do servidor, e 88% do
  tempo é "render delay". Melhorar isto pede menos JS no arranque (ver o ponto anterior).

## Por medir

- `/games` e `/dashboard` com sessão (Lighthouse com as contas QA, que lê o `.env.test.local`):

  ```sh
  bun scripts/qa/lighthouse.ts --pages=games,dashboard --runs=3
  ```
