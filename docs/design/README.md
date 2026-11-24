# Variantes de aspeto (teste) — branch `feat/css-teste`

Duas alternativas ao aspeto atual ("Capulana e Índico", `docs/DESIGN.md`), **só com tokens**: cores,
raios, sombras e tipos de letra. A lógica, a estrutura e os componentes não mudam. O aspeto atual
continua a ser a predefinição.

| Variante               | Ficheiro                   | Ideia                                                                                                                                                    |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` (atual)      | `src/styles.css`           | Índico (azul-petróleo) como cor de ação, neutros frios, raio 10 px, contorno em vez de sombra, Bricolage Grotesque + Atkinson Hyperlegible               |
| **A** — Terra e Índico | `src/themes/variant-a.css` | Mais quente e cultural: fundo areia, ação em **terracota** (terra), **azul do mar** como secundária, **ocre** nos destaques, raio 12 px, mesmas fontes   |
| **B** — Limpo          | `src/themes/variant-b.css` | Mais limpa e moderna: superfícies brancas, cinzentos neutros, o Índico como única cor de ação, **fontes do sistema**, raio 8 px, sombra leve nos cartões |

As duas têm tema claro e escuro.

## Como ver localmente

```sh
# Bash
VITE_THEME_VARIANT=a bun run dev      # variante A
VITE_THEME_VARIANT=b bun run dev      # variante B
bun run dev                           # atual

# PowerShell
$env:VITE_THEME_VARIANT='a'; bun run dev
```

Para um build igual ao de produção: `VITE_THEME_VARIANT=a bun run build`, e depois
`bunx wrangler@4.45.0 dev --port 4173 --local`. O HTML sai com `<html data-variant="a">`
(confirmado a 24/11/2026).

## Como passar uma variante a predefinição

Mudar **uma linha** em `src/lib/theme-variant.ts`:

```ts
export const DEFAULT_THEME_VARIANT: ThemeVariant = "a"; // ou "b"
```

Depois:

- atualizar `docs/DESIGN.md`. A A muda a cor de ação e o raio; a B muda o raio, as fontes e as
  sombras. Ambas contrariam regras atuais do DESIGN.md;
- correr `bun run ci` e a QA de contraste.

Se a B ficar, as fontes da marca (`public/fonts`) deixam de ser usadas e podem deixar de carregar
(`src/lib/brand-fonts.ts`): é uma mudança de código à parte. A faixa da capulana
(`capulana-band`) tem cores fixas no SVG e não muda com a variante.

## O que mudou fora dos tokens (exceções)

| Ficheiro                                | Mudança                                                                         | Porquê                           |
| --------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| `src/routes/__root.tsx`                 | atributo `data-variant={variantAttribute()}` no `<html>`                        | é o interruptor das variantes    |
| `src/styles.css`                        | dois `@import` dos ficheiros das variantes                                      | carregar os tokens das variantes |
| `src/lib/theme-variant.ts` (novo)       | constante `DEFAULT_THEME_VARIANT` e leitura de `VITE_THEME_VARIANT`             | a "linha única"                  |
| `src/lib/theme-variants.test.ts` (novo) | contraste AA dos pares principais e tokens completos, nas 2 variantes × 2 temas | verificação no CI                |

Nenhum componente foi alterado.

## Contraste (AA)

- **Pares de tokens** (`theme-variants.test.ts`, corre no CI), em A e B, claro e escuro:
  - texto (4,5:1): texto e texto secundário sobre fundo, cartão e muted; texto sobre todos os botões
    cheios (primário, secundário, accent, sucesso, aviso, destrutivo); ligações (`primary`) e erros
    sobre fundo e cartão; barra lateral;
  - controlos e foco (3:1): contorno dos campos (`input`) e anel de foco (`ring`) sobre fundo e cartão.
- **Páginas reais** (axe-core `color-contrast`): ver "Resultado da QA" abaixo.

## Capturas

Pasta `docs/design/capturas/`, em JPEG (qualidade 70, só a área visível). Nome do ficheiro:
`<página>-<variante>-<tema>-<largura>.jpg`.

- Desktop: 1280 px. Telemóvel: 390 px (emulação de telemóvel).
- Tema claro em todas as páginas. Tema escuro em desktop, só na página inicial e em negócios, para a
  pasta não crescer demasiado.
- **Painel do negócio:** exige sessão de negócio. As capturas foram feitas sem conta (não se usaram
  as credenciais de teste), por isso mostram a página para onde a app manda quem não tem sessão.
  **[POR FAZER]** Capturas com sessão.

| Página                                  | Ecrã      | Tema   | Atual                                                 | A — Terra e Índico                              | B — Limpo                                       |
| --------------------------------------- | --------- | ------ | ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Página inicial                          | desktop   | claro  | [ver](capturas/home-default-light-1280.jpg)           | [ver](capturas/home-a-light-1280.jpg)           | [ver](capturas/home-b-light-1280.jpg)           |
| Página inicial                          | desktop   | escuro | [ver](capturas/home-default-dark-1280.jpg)            | [ver](capturas/home-a-dark-1280.jpg)            | [ver](capturas/home-b-dark-1280.jpg)            |
| Página inicial                          | telemóvel | claro  | [ver](capturas/home-default-light-390.jpg)            | [ver](capturas/home-a-light-390.jpg)            | [ver](capturas/home-b-light-390.jpg)            |
| Mapa                                    | desktop   | claro  | [ver](capturas/mapa-default-light-1280.jpg)           | [ver](capturas/mapa-a-light-1280.jpg)           | [ver](capturas/mapa-b-light-1280.jpg)           |
| Mapa                                    | telemóvel | claro  | [ver](capturas/mapa-default-light-390.jpg)            | [ver](capturas/mapa-a-light-390.jpg)            | [ver](capturas/mapa-b-light-390.jpg)            |
| Negócios                                | desktop   | claro  | [ver](capturas/negocios-default-light-1280.jpg)       | [ver](capturas/negocios-a-light-1280.jpg)       | [ver](capturas/negocios-b-light-1280.jpg)       |
| Negócios                                | desktop   | escuro | [ver](capturas/negocios-default-dark-1280.jpg)        | [ver](capturas/negocios-a-dark-1280.jpg)        | [ver](capturas/negocios-b-dark-1280.jpg)        |
| Negócios                                | telemóvel | claro  | [ver](capturas/negocios-default-light-390.jpg)        | [ver](capturas/negocios-a-light-390.jpg)        | [ver](capturas/negocios-b-light-390.jpg)        |
| Roteiros                                | desktop   | claro  | [ver](capturas/roteiros-default-light-1280.jpg)       | [ver](capturas/roteiros-a-light-1280.jpg)       | [ver](capturas/roteiros-b-light-1280.jpg)       |
| Roteiros                                | telemóvel | claro  | [ver](capturas/roteiros-default-light-390.jpg)        | [ver](capturas/roteiros-a-light-390.jpg)        | [ver](capturas/roteiros-b-light-390.jpg)        |
| Entrar                                  | desktop   | claro  | [ver](capturas/login-default-light-1280.jpg)          | [ver](capturas/login-a-light-1280.jpg)          | [ver](capturas/login-b-light-1280.jpg)          |
| Entrar                                  | telemóvel | claro  | [ver](capturas/login-default-light-390.jpg)           | [ver](capturas/login-a-light-390.jpg)           | [ver](capturas/login-b-light-390.jpg)           |
| Painel do negócio (sem sessão → /login) | desktop   | claro  | [ver](capturas/painel-negocio-default-light-1280.jpg) | [ver](capturas/painel-negocio-a-light-1280.jpg) | [ver](capturas/painel-negocio-b-light-1280.jpg) |
| Painel do negócio (sem sessão → /login) | telemóvel | claro  | [ver](capturas/painel-negocio-default-light-390.jpg)  | [ver](capturas/painel-negocio-a-light-390.jpg)  | [ver](capturas/painel-negocio-b-light-390.jpg)  |

42 ficheiros, 2.4 MB.

## Resultado da QA

Corrida local a 24/11/2026 (`wrangler dev`, Edge), sem contas de teste:

- **19 páginas de convidado** (as da QA em `scripts/qa/lib.ts`) × **3 aparências** (atual, A, B) × **2 temas** = 114 casos: **114/114 PASS**. Em cada caso:
  - 0 violações de contraste do axe-core (`color-contrast`);
  - 0 erros de hidratação;
  - 0 erros de página;
  - 0 avisos de CSP;
  - o `<html data-variant>` certo.
- Os scripts de `scripts/qa/` não correram tal como estão: leem o `.env.test.local` (contas de teste), que não se usou. As verificações acima são as mesmas para as páginas sem sessão.
  **[POR FAZER]** As páginas com sessão (painéis), com as contas de teste.
- Corrigido durante a QA: a barra de ações da página inicial (`HomeCta`) é escura de propósito
  (classe `.dark` própria) e ficava com os tokens escuros da aparência atual. Os ficheiros das
  variantes passaram a aplicar os seus tokens escuros também a `.dark` aninhados.
