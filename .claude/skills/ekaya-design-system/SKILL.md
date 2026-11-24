---
name: ekaya-design-system
description: Sistema de design do EKAYA ("Capulana e Índico" + logótipo "Coração do Índico"). Usar ANTES de criar ou alterar qualquer ecrã, componente, texto visível, animação, fotografia ou navegação na app EKAYA (src/routes, src/components), e para rever o aspeto de um PR. Cobre marca, cores, tipografia, espaço, fotografia, componentes, navegação ("voltar"), responsivo, motion, acessibilidade, anti-padrões e regras de React/Tailwind e de desempenho.
---

# EKAYA — sistema de design

Moçambique visto pelo Índico e pela capulana, **sem folclore e sem aspeto de template**. Turismo
comunitário com dados reais: a interface mostra o que existe na BD e nada mais.

Fontes de verdade, por ordem: o que o utilizador pedir → este ficheiro → `docs/DESIGN.md` →
`src/styles.css` (tokens) → `src/lib/brand.ts` (logótipo). Em conflito, ganha o de cima.

## 1. Marca

- **Nome:** sempre **EKAYA**, em maiúsculas, em títulos, emails, manifest e textos. Nunca "Ekaya
  Explore" nem "Mozambique Explorer Hub". Os nomes alternativos `Explore EKAYA` e `exploreekaya`
  existem só nos dados estruturados.
- **Logótipo "Coração do Índico":** use `<BrandLogo />` (SVG inline, desenhado em `src/lib/brand.ts`).
  - letras verde profundo `#0E4B3B` em fundo claro e areia `#F4EEE2` em fundo escuro, com o
    coração com contorno branco no escuro;
  - sobre fotografia, `onDark`;
  - em menos de 375/390 px, `mark` (só o A com o coração).
  - Nunca redesenhar, esticar, mudar as cores do coração (verde `#009739`, amarelo `#FCD116`,
    vermelho `#D21034`) ou usar a bandeira ou o emblema de Moçambique.
- As cores do logótipo (verde profundo, areia, as três do coração) são **só da marca**: logótipo,
  ícones, imagem de partilha, emails. Não entram na paleta da interface.

## 2. Cor (tokens — nunca hex na interface)

| Token                 | Claro     | Escuro    | Uso                                                   |
| --------------------- | --------- | --------- | ----------------------------------------------------- |
| `background`          | `#F5F7F6` | `#0D1615` | página (neutro frio, puxado ao verde-água; não creme) |
| `card`                | `#FFFFFF` | `#15201F` | superfícies                                           |
| `foreground`          | `#15211F` | `#E7EEEC` | texto                                                 |
| `muted-foreground`    | `#4E5D59` | `#9DB0AB` | texto secundário (≥ 4,5:1)                            |
| `border`              | `#D3DCD9` | `#2A3836` | contornos de cartões                                  |
| `input`               | `#7F908B` | `#5E716C` | contornos de controlos (≥ 3:1)                        |
| `primary`             | `#0A6670` | `#4FB9C2` | **a única cor de ação**: botões, links, foco          |
| `secondary`/`success` | `#2C6A43` | `#6CC08A` | mangal — confirmado, positivo                         |
| `warning`             | `#E2A12B` | `#F0B44A` | ocre da capulana — destaques, texto escuro por cima   |
| `destructive`         | `#B3372B` | `#F07A6C` | erro, cancelar, apagar                                |

- **Decisão (11/2026):** a cor de ação continua o azul-petróleo, porque o verde do logótipo ficaria
  perto do verde de "confirmado". O verde profundo é cor de marca, não de ação.
- Classes: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`…
  **Nunca** `bg-white`, `text-gray-*`, `bg-slate-*` nem hex soltos. A exceção são véus pretos sobre
  fotos (`bg-black/40…`) e texto branco sobre esses véus.
- Estados nunca só pela cor: texto + ícone.

## 3. Tipografia

- **Bricolage Grotesque 700** (`font-display`, só títulos) + **Atkinson Hyperlegible** (texto,
  botões, números). Self-hosted em `public/fonts`, carregadas depois da primeira pintura
  (`src/lib/brand-fonts.ts`), por isso fora do CSS crítico.
- Escala (rem): 0,8125 · 0,875 · 1 · 1,125 · 1,375 · 1,75 · 2,25 · 3.
- Títulos à esquerda, `text-wrap: balance`. Texto até ~65 caracteres por linha.
- Não fazer: acentuar uma palavra do título com outra cor ou itálico; rótulos em MAIÚSCULAS
  espaçadas por cima de cada secção; monoespaçada para "dados" decorativos.

## 4. Forma, espaço, superfícies

- Raio **10 px** em cartões e diálogos, **6 px** em controlos e badges, `full` só em chips e
  avatares.
- **Contorno, não sombra.** Uma única elevação (`shadow-[var(--shadow-overlay)]`) para menus,
  diálogos e o cabeçalho fixo.
- Escala de 4 px (4, 8, 12, 16, 24, 32, 48, 64), grupos com `gap`.
- Sem cartão dentro de cartão. O cabeçalho de um cartão é texto, não um ícone num quadrado colorido.
- Padrão de capulana (`capulana-band`): só faixa fina no cabeçalho, na barra lateral e nos
  divisores. Nunca por trás de texto.

## 5. Fotografia

- **Só fotos reais de Moçambique, do sítio certo**, com licença livre.
- Cada foto tem entrada em `src/lib/photo-credits.ts` (autor, licença, origem), aparece em
  `/creditos` e mostra o crédito com `<PhotoCredit />`.
- Sem foto fiel → sem foto, ou a da província identificada como tal. Negócios sem foto usam
  `<BusinessMark />`.
- Formatos: AVIF/WebP com `srcset`. Só a imagem do topo tem prioridade; o resto `loading="lazy"`.
- Texto sobre foto: véu escuro (`bg-black/45`→`/70`) para AA, nunca gradiente colorido.

## 6. Componentes (reutilizar, não recriar)

- **shadcn/ui** em `src/components/ui`. Não alterar o design destes ficheiros.
- `BackButton`: o único "voltar" (ver §7).
- `BrandLogo`, `PhotoCredit`, `BusinessMark`, `InterestIcon` (ícones de interesses e categorias),
  `LazyChoiceSelect`, `useConfirm`/`ConfirmDialog` (nunca `confirm()`/`alert()`).
- Badges: fundo suave do tom + texto escuro + ícone. Ocre = destaque, verde = confirmado, vermelho =
  cancelado.
- Formulários: rótulo por cima, ajuda por baixo, erro em vermelho com ícone e texto.
- Ícones: **só Lucide**, traço 1,75, 16/20/24 px. **Sem emojis na interface.**

## 7. Navegação

- **Voltar:** `<BackButton fallback="…" />`.
  - Com histórico na app, volta para trás. Sem histórico, vai para a página-mãe lógica:
    detalhe → lista; secção → `"auto"` (painel com sessão, home sem sessão).
  - Alvo ≥ 44 px, visível no telemóvel. `showLabel` mostra "Voltar" a partir de `sm`.
  - Nenhuma página secundária sem saída.
- Barra lateral (`AppSidebar`) para as secções. Ações principais visíveis sem abrir menus.
- Páginas privadas: o visitante vai para `/login?redirect=<página>`. Nunca mostrar a um visitante
  um botão para uma página privada.

## 8. Responsivo

- Testar a 320, 390, 768, 1280 e 1440 px (`scripts/qa/widths.ts`). Sem scroll horizontal.
- Conteúdo e ações primeiro. No telemóvel, um CTA principal por ecrã.
- Toque ≥ 44 px. Nada fixo que tape o conteúdo (o assistente e o aviso de armazenamento já ocupam
  os cantos).

## 9. Movimento

- Só `transform` e `opacity`. **Nunca** animar `filter: blur`, `width/height` ou `top/left`.
- Um momento orquestrado por página no máximo (por exemplo a história em scroll da home). Nada de
  fade-and-slide em cada secção nem hovers que façam saltar cartões.
- Motion de resposta (abrir, expandir, confirmar) curto (150–250 ms).
- `prefers-reduced-motion` e telemóveis fracos (`navigator.hardwareConcurrency <= 4` ou
  `deviceMemory <= 2`) recebem a versão estática.
- Sem bibliotecas novas de animação. O `framer-motion` já existe; a home nova usa um único
  `requestAnimationFrame` só durante o scroll.

## 10. Acessibilidade (mínimo AA)

- Texto 4,5:1, ícones e contornos 3:1, **nos dois temas** (`scripts/qa/contrast.ts` = 0 violações).
- Foco visível (`ring`). Todos os controlos com nome acessível. `aria-label` em botões só com ícone.
- Ordem dos títulos sem saltos. Um `<h1>` por página, real e no HTML do servidor nas páginas
  públicas.
- Imagens com `alt` útil, ou `alt=""` se forem decorativas.

## 11. Textos e dados

- **Tudo em PT-PT e EN.** Textos novos vão para dicionários (`LanguageContext`, `page-texts.ts`,
  `admin-texts.ts`), cobertos pelos testes de paridade.
- **Nunca dados inventados:** sem números de visitantes, notas, avaliações, rankings, testemunhos ou
  "mais popular" sem fonte na BD ou citação oficial. Sem dado → estado vazio honesto.
- Sem preferências reais → "Descobrir", nunca "para ti".
- Escrever do lado de quem usa. Botões dizem o que acontece ("Guardar alterações"). Erros dizem o
  que falhou e como resolver, sem pedir desculpa.

## 12. Anti-padrões (recusar em revisão)

- Aspeto de template de IA:
  - fundo creme com serifa e acento terracota;
  - preto com um único verde-ácido;
  - kit SaaS de cartões iguais arredondados com a mesma sombra;
  - eyebrow em maiúsculas por cima de cada título;
  - "A · B · C" como meta;
  - "→" em todos os botões;
  - números 01/02/03 sem sequência real.
- Emojis, gradientes de cor (roxo/azul/rosa), `rounded-2xl/3xl` em tudo, sombras em todos os
  cartões.
- Cartões repetidos sem hierarquia. Ícone decorativo em cada secção. Tudo centrado.
- Promessas que a app não cumpre (offline, "descarrega", números).

## 13. React, Tailwind e desempenho

- Reutilizar hooks (`src/hooks`), módulos (`src/lib`) e RPCs. Não criar sistemas paralelos nem
  tabelas.
- Tailwind com tokens. Classes condicionais com `cn()`. Sem CSS inline salvo valores dinâmicos de
  animação (CSS variables).
- **Orçamento:**
  - Lighthouse mobile não desce mais de 2 pontos por página;
  - bundle inicial ≤ +2 KB gz;
  - JS só da home ≤ +15 KB gz.
- Componentes pesados com `lazy()` e carregados só na rota que os usa. Nada pesado no root.
- Texto do `head` das rotas em literais ou módulos leves, nunca dicionários grandes no chunk
  crítico.
- Dados de negócio só no Supabase. `localStorage`/`sessionStorage` só para preferências de UI.
- Antes de PR: `bunx tsc --noEmit`, `bun run lint`, `bunx vitest run`, `bun run build` e os scripts
  de `scripts/qa` relevantes (larguras, contraste, idioma, hidratação, Lighthouse).

## Autocrítica antes de entregar

1. Há algum número, nota ou promessa sem fonte? Tira-o.
2. Abre a página a 390 px nos dois temas: há saída ("voltar") e um CTA claro?
3. Aplica a regra de Chanel: tira um enfeite.
4. Isto podia ser de qualquer site de viagens? Se sim, falta Moçambique: fotografia real, nomes
   reais, a capulana com contenção.
