# Scripts de QA no browser

Verificações automáticas com o Playwright e o **Edge do sistema**. Só leem e navegam: nunca
submetem formulários (a janela de confirmação é sempre cancelada).

## Preparar (uma vez)

```powershell
cd scripts/qa
bun install          # instala playwright, axe-core e lighthouse só nesta pasta
cd ../..
```

As ferramentas ficam em `scripts/qa/node_modules` (ignorado pelo Git); o `package.json` da raiz
não muda. Não é preciso descarregar browsers: usa-se o Edge instalado.

Contas de teste: `.env.test.local` na raiz (`TEST_TOURIST_EMAIL`/`_PASSWORD`,
`TEST_BUSINESS_…`, `TEST_ADMIN_…`). As credenciais nunca são escritas no ecrã nem em ficheiros.

## Arrancar o build de produção

```powershell
bun run build
bunx wrangler@4.45.0 dev --port 4173 --ip 0.0.0.0 --local
```

Os scripts usam `http://127.0.0.1:4173`; para outro endereço: `$env:QA_BASE = "http://…"`.
Desliga outros servidores (por exemplo `bun run dev`) antes do Lighthouse.

## Scripts

| Comando                            | O que verifica                                                                                                                 | PASS                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `bun scripts/qa/hydration.ts`      | erros de hidratação nas páginas com SSR (visitante/turista × PT/EN)                                                            | nenhum erro                                      |
| `bun scripts/qa/widths.ts`         | nada cortado nem mais largo que o ecrã, 320–1440 px (telemóvel emulado < 768)                                                  | sem scroll horizontal nem elementos fora do ecrã |
| `bun scripts/qa/interactions.ts`   | menu, notificações, tema, seletores, diálogos e editor abrem, cabem no ecrã e fecham                                           | todos PASS                                       |
| `bun scripts/qa/contrast.ts`       | contraste AA (axe) em claro e escuro                                                                                           | 0 violações                                      |
| `bun scripts/qa/lang.ts`           | idioma pelo cookie no servidor, migração do localStorage, texto PT nas páginas em EN                                           | todos PASS                                       |
| `bun scripts/qa/lighthouse.ts`     | Lighthouse mobile, mediana de 3                                                                                                | comparar com a tabela do último bloco            |
| `bun scripts/qa/shots.ts`          | capturas claro/escuro, 1280 e 390 px                                                                                           | revisão visual                                   |
| `bun scripts/qa/login-redirect.ts` | botão da home → login (→ 2FA) → painel do papel (turista, negócio, admin)                                                      | 12/12 PASS                                       |
| `bun scripts/qa/guide.ts`          | guia do painel: abre na 1.ª entrada, "Não voltar a mostrar" grava, noutro browser não abre (grava 1 valor na conta de turista) | todos PASS                                       |
| `bun scripts/qa/brand-assets.ts`   | volta a gerar logótipos, ícones, manifest e imagem de partilha em `public/`                                                    | `brand.test.ts` PASS, `git diff` só o esperado   |

Opções comuns: `--pages=home,map` (nomes em `lib.ts`), `--widths=320,390` (widths),
`--runs=5` e `--devtools` (lighthouse), `--lang=en` e `--full` (shots).

Saídas: `qa-output/<script>/` (ignorado pelo Git). Os scripts terminam com código 1 se houver FAIL.
