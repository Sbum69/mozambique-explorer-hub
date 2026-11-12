# Proposta de redesign "African Contemporary Travel Technology"

**Por aprovar. Nada disto está implementado.** As regras estão na skill
`.claude/skills/ekaya-design-system`. Os mockups das três páginas-chave estão em
`docs/design/mockups/` (`home.html`, `destino.html` e `recomendacoes.html`), feitos com as fotos do
site e conteúdo da BD.

## Princípios estudados

Não se copia nenhum destes sites; fica só a lição de cada um.

| Referência          | O que se aproveita                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Black Tomato        | A viagem descrita como uma frase da pessoa ("Vou a… durante… e gosto de…"), não um formulário |
| Visit Norway        | O lugar é o herói: fotografia real a toda a largura e o nome do sítio em grande               |
| Airbnb              | Uma ação clara por ecrã, e a mesma linguagem do pedido ao resultado                           |
| National Geographic | Factos com fonte, legendas e créditos visíveis; o texto informa, não vende                    |
| Linear              | Hierarquia por tipografia e espaço, sem caixas à volta de tudo                                |
| Stripe              | Movimento com propósito e um único momento orquestrado                                        |

O que torna isto **EKAYA**, e não "um site de viagens":

- fotografia real de Moçambique, com crédito;
- a capulana só como faixa fina;
- o coração do logótipo só como detalhe da marca;
- números só da BD;
- PT-PT primeiro.

## Decisão: paleta

**Manter o azul-petróleo `#0A6670` como cor de ação.** O verde profundo do logótipo `#0E4B3B` passa a
cor de marca: logótipo, ícones, imagem de partilha e rodapé escuro.

Porquê:

1. A app já usa o verde-mangal `#2C6A43` para "confirmado". Um botão verde-escuro e um estado verde
   ficariam parecidos, mesmo com ícone e texto.
2. O azul-petróleo é o "Índico" da identidade aprovada e passa AA nos dois temas
   (`scripts/qa/contrast.ts`, 0 violações). Mudar `--primary` mexe em cerca de 40 páginas e obriga a
   repetir a auditoria de contraste.
3. Com o rodapé verde-profundo, a marca aparece em todas as páginas sem competir com a cor de ação.

## Página a página

| Página                                                | Estrutura e hierarquia                                                                                                                                                             | Tipografia                                      | Fotografia                                          | Telemóvel                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Home**                                              | História em scroll (motion aprovado) → frase "Vou a…" → faixa de destinos (BD) → como funciona (3 passos, sequência real) → para negócios → rodapé de marca                        | Título 48–76 px Bricolage; texto Atkinson 16–18 | Costa (Vilankulo) a abrir para a Ilha e a Gorongosa | História estática se `reduced-motion` ou aparelho fraco; frase em blocos empilhados |
| **Descobrir/destinos**                                | Hoje só há mapa. Proposta: lista de destinos com foto, província e nº de roteiros reais, e o mapa ao lado (desktop) ou num separador (telemóvel)                                   | Nome do destino em display 24 px                | Foto do destino ou da província (identificada)      | Lista primeiro, mapa num botão                                                      |
| **Detalhe do destino** (página nova `/destino/$slug`) | Nome em grande sobre a foto → descrição (BD) → factos **com fonte** → roteiros que passam ali → atividades (ou estado vazio honesto) → anterior/seguinte (links internos para SEO) | Nome 48–112 px                                  | Uma foto, com crédito                               | Voltar fixo no topo; roteiros em lista compacta                                     |
| **Experiências**                                      | Filtros numa linha (província, interesse, preço) → lista em 2 colunas, sem notas inventadas                                                                                        | Título do cartão 18–20 px                       | Foto do negócio ou `BusinessMark`                   | Filtros numa folha inferior                                                         |
| **Recomendações**                                     | Frase da viagem editável no topo (a mesma da home) → roteiros e atividades com "porque bate" (motivos reais) → guardar na conta                                                    | Frase em display 28–44 px                       | Miniaturas                                          | Frase em linhas curtas; motivos como tags                                           |
| **Mapa**                                              | Mapa a toda a altura + painel do destino selecionado (só factos da BD)                                                                                                             | —                                               | Miniatura no painel                                 | Painel como folha inferior                                                          |
| **Painel do turista**                                 | "A tua viagem" (preferências como frase) → próximas reservas → roteiros em curso → pontos                                                                                          | Saudação 28 px                                  | Nenhuma decorativa                                  | Uma coluna; ação principal no topo                                                  |
| **Painel do negócio**                                 | Pedidos por decidir primeiro → disponibilidade → atividades → números reais (reservas)                                                                                             | Números tabulares                               | Foto do negócio                                     | Pedidos como lista com ações grandes                                                |
| **Login / registo**                                   | Formulário à esquerda, foto real à direita (desktop); só formulário no telemóvel                                                                                                   | Título 28 px                                    | Uma foto, com crédito                               | Sem foto (poupa dados)                                                              |
| **Onboarding**                                        | A mesma frase "Vou a… durante… e gosto de…", passo único em vez de 3                                                                                                               | Display na frase                                | Miniaturas dos destinos                             | Ecrã inteiro, botão fixo no fundo                                                   |

## O que muda e o que se mantém

**Mantém-se:**

- a arquitetura e os componentes shadcn;
- os tokens de cor da interface e as fontes;
- o logótipo, o `BackButton` e a lógica das recomendações;
- os dados (sem tabelas novas) e o PT/EN.

**Muda:**

- a home ganha a história em scroll e a frase da viagem;
- nasce a página de destino;
- as recomendações passam a uma frase editável com motivos;
- o rodapé passa a verde-profundo de marca;
- o onboarding fica com um só passo;
- menos cartões iguais: hierarquia por tipografia;
- saem as animações de entrada por secção (`motion.div` em listas).

## Motion da home: como portar o protótipo aprovado

O protótipo (`docs/motion/EKAYA_Prototipo_Motion.html`) já respeita quase todas as regras: só anima
`transform` e `opacity` e não usa `filter`. A referência "Mostar" serve só de coreografia; não se
usam as suas imagens, textos nem a fonte "Ogg".

| Regra                                           | No porte                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Só `transform` e `opacity`                      | Igual ao protótipo; as variáveis CSS são escritas no `style` do próprio elemento, não no `:root` (assim só esse elemento recalcula)                                                                                                              |
| Um único `requestAnimationFrame`, só com scroll | Igual (`tick()` só agenda quando há scroll ou pointer); **sai o medidor de FPS**, que corre sempre                                                                                                                                               |
| Sem bibliotecas novas                           | Nada de GSAP, Framer ou Lenis: o código tem cerca de 2 KB                                                                                                                                                                                        |
| Fotos do site                                   | `hero-vilankulo-*.avif/webp` (costa), `dest-ilha.webp`, `dest-gorongosa.webp`, com `srcset`; só a primeira cena com `fetchpriority="high"`; as outras com `loading="lazy"` e pedidas quando a história está a 1 ecrã de distância                |
| Só na home                                      | Componente `HomeStory` com `lazy()` importado só por `HomePage`; o SSR mostra a primeira cena estática (é o LCP) e o JS do motion carrega depois da hidratação                                                                                   |
| Telemóveis fracos / `reduced-motion`            | Sem motion se `prefers-reduced-motion`, `hardwareConcurrency <= 4`, `deviceMemory <= 2` ou `saveData`: fica a versão estática (3 blocos com foto e texto)                                                                                        |
| Carrossel da BD                                 | Os destinos vêm de `useDestinations()`; a contagem de roteiros vem de `routes`; sem número inventado                                                                                                                                             |
| Factos com fonte no código                      | UNESCO 1991 e a Fortaleza de 1558 (UNESCO, sítio 599); Parque Nacional da Gorongosa 1960 e Monte Gorongosa 1 863 m (fonte a citar: Parque Nacional da Gorongosa / ANAC). Ficam num objeto `STORY_FACTS` com `source` e URL, e aparecem como nota |
| Fotos remotas do protótipo (Wikimedia)          | Não se usam no site; cada foto nova precisa de entrada em `photo-credits.ts` e de aprovação                                                                                                                                                      |

Medição do protótipo e estimativa do impacto na home: ver a secção "Medições" do relatório da Fase 1
e 2.

## Risco para o desempenho

- **LCP:** a primeira cena tem de ser a mesma foto do herói atual (já pré-carregada), para não piorar.
- **JS:** cerca de 2 KB gz para o motor de scroll, mais o carrossel. Fica longe do orçamento de
  +15 KB gz só na home.
- **CLS:** a história tem altura fixa (`300vh` com `position: sticky`), por isso nada salta.
- **INP:** o handler de scroll é passivo e só agenda `rAF`. Os cliques do carrossel são `transform`.
- **Imagens:** 2 fotos extra (Ilha e Gorongosa, cerca de 60–120 KB cada em AVIF), pedidas só ao
  aproximar.

## Esforço estimado (Fase 3, um PR por bloco)

| Bloco                                             | Esforço  |
| ------------------------------------------------- | -------- |
| Home com motion + frase + faixa de destinos       | 2–3 dias |
| Destinos (lista + página `/destino/$slug`)        | 2 dias   |
| Recomendações (frase editável, motivos)           | 1–2 dias |
| Painéis (turista e negócio)                       | 2–3 dias |
| Restantes (experiências, mapa, login, onboarding) | 2–3 dias |

Cada bloco leva capturas antes e depois (desktop e telemóvel), Lighthouse, testes e uma autocrítica
com a skill.
