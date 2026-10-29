# Identidade visual do EKAYA Explore — "Capulana e Índico"

Proposta DESIGN-1 (por aprovar). Página de amostra com paleta, tipografia, componentes e maquetes da
home e do painel a 390 e 1280 px: ver o link no relatório do bloco.

## 1. Porque mudar (AUDIT)

Contagens no código atual (`src/routes`, `src/components`, sem `components/ui`):

| O que dá o aspeto genérico                                   | Ocorrências | Onde mais pesa                                    |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------- |
| Emojis como ícones (categorias, interesses, títulos)         | 102 linhas  | `lib/routes.ts`, `useful-info`, `games`, `home`   |
| Gradientes escritos à mão roxo/azul/rosa/ciano/esmeralda     | 117         | hero de "Informações úteis", admin, barra lateral |
| `bg-gradient-*` em geral                                     | 103         | cabeçalhos, ícones de módulo, botões              |
| Sombra igual em todos os cartões (`--shadow-soft/elegant`)   | 98          | todos os cartões                                  |
| `rounded-2xl` / `rounded-3xl` em tudo                        | 50          | cartões, ícones, botões                           |
| Títulos e blocos centrados (`text-center`)                   | 79          | heros, estados vazios                             |
| Animações de entrada (`motion.*`)                            | 87          | quase todas as listas                             |
| Fonte do sistema (sem identidade tipográfica)                | —           | tudo                                              |
| Cartões dentro de cartões; ícone decorativo em cada secção   | —           | painel, home, "Informações úteis"                 |

## 2. Direção

Moçambique visto pelo Índico e pela capulana, sem folclore:

- **Cor**: o azul-petróleo do Índico é a cor de ação; o ocre e o vermelho das capulanas aparecem só
  como acentos (destaques, badges, uma faixa de padrão); o verde do mangal marca estados positivos.
  Neutros frios, levemente puxados para o verde-água (não creme).
- **Padrão**: uma faixa fina de triângulos e losangos inspirada na barra da capulana — só no
  cabeçalho, na barra lateral e como divisor de secção. Nunca como fundo de texto.
- **Fotografia**: fotos reais com crédito visível (FOTOS-1); sem fotos genéricas.

## 3. Tokens

### Cor (claro / escuro)

| Token            | Claro     | Escuro    | Uso                                                       |
| ---------------- | --------- | --------- | --------------------------------------------------------- |
| `--background`   | `#F5F7F6` | `#0D1615` | fundo da página                                           |
| `--card`         | `#FFFFFF` | `#15201F` | superfícies                                               |
| `--foreground`   | `#15211F` | `#E7EEEC` | texto                                                     |
| `--muted-fg`     | `#4E5D59` | `#9DB0AB` | texto secundário (≥ 4,5:1 em `--card`)                    |
| `--border`       | `#D3DCD9` | `#2A3836` | contornos (contornos de controlos usam `--border-strong`) |
| `--border-strong`| `#7F908B` | `#5E716C` | contornos de inputs e estados (≥ 3:1)                     |
| `--primary`      | `#0A6670` | `#4FB9C2` | Índico — botões, links, foco                              |
| `--primary-fg`   | `#FFFFFF` | `#062326` | texto sobre `--primary`                                   |
| `--ochre`        | `#E2A12B` | `#F0B44A` | capulana — destaques, badges (texto escuro por cima)      |
| `--mangrove`     | `#2C6A43` | `#6CC08A` | sucesso, confirmado                                       |
| `--capulana-red` | `#B3372B` | `#F07A6C` | erro, cancelar, apagar                                    |

Os estados nunca são só cor: cada badge tem texto e ícone.

### Tipografia

| Papel    | Família               | Uso                                       |
| -------- | --------------------- | ----------------------------------------- |
| Display  | Bricolage Grotesque   | títulos (600–700), nunca em texto corrido |
| Texto    | Atkinson Hyperlegible | texto, formulários, botões, números       |

Escala (rem): 0,8125 · 0,875 · 1 · 1,125 · 1,375 · 1,75 · 2,25 · 3 (hero). Títulos alinhados à
esquerda com `text-wrap: balance`; texto até ~65 caracteres por linha. Fontes servidas pelo próprio
site (woff2 em `public/fonts`, licença OFL), com `font-display: swap` — sem pedidos ao Google em
produção e sem dependências novas.

### Forma, sombra e espaço

- **Raio**: 6 px em controlos e badges; 10 px em cartões e diálogos; `full` só em chips e avatares.
- **Sombra**: nenhuma por omissão; os cartões separam-se por contorno. Uma única elevação para
  menus, diálogos e o cabeçalho fixo.
- **Espaço**: escala de 4 px (4, 8, 12, 16, 24, 32, 48, 64); grupos com `gap`, nunca margens soltas.
- **Gradientes**: só como véu sobre fotografias (para o texto se ler); nunca em botões, ícones ou
  fundos.
- **Movimento**: só onde informa (abrir, fechar, mudar de estado); respeita `prefers-reduced-motion`.

## 4. Regras de componentes

- Ícones: só Lucide, traço 1,75, tamanho 16/20/24. Sem emojis na interface (o conteúdo dos
  utilizadores mantém os seus). As categorias e interesses passam de emoji para ícone Lucide.
- Botões: primário (Índico, cheio), secundário (contorno), fantasma (texto); destrutivo em vermelho
  capulana. Um primário por zona.
- Cartões: contorno de 1 px, sem sombra, sem cartão dentro de cartão; o cabeçalho do cartão é texto,
  não um ícone num quadrado colorido.
- Badges: fundo suave do tom + texto escuro + ícone; ocre para "destaque", verde para "confirmado",
  vermelho para "cancelado", neutro para o resto.
- Formulários: rótulo por cima, ajuda por baixo, erro em vermelho com ícone e texto.
- Cabeçalho: fundo `--card`, faixa de capulana de 4 px no fundo; barra lateral com a mesma faixa no
  topo e secções com títulos em maiúsculas pequenas.

## 5. Ordem de aplicação (depois de aprovado)

Barra lateral e cabeçalho → home → painel → destinos, mapa, roteiros → experiências → comunidade →
jogos → negócio → admin → login, registo, definições. Em cada passo: axe com 0 violações nos dois
temas, PT/EN, larguras 320–1440 px sem cortes.
