# Assistente com IA do EKAYA — Fase 1 (estudo, sem código)

> **Atualização de 30/10/2026:** sem API paga por agora. A fase 1 é FAQ + RPCs sem LLM, e a camada de IA
> é o Cloudflare Workers AI na quota grátis, com corte automático para "só FAQ". Ver `WORKERS-AI.md`, que
> substitui a recomendação de modelo da secção c) e os custos da secção g).

Estado: **proposta para decisão**. Não foi criada nenhuma conta, instalado nada nem enviado nenhum dado a fornecedores.
Pesquisa feita a 30/10/2026.

Marcas usadas:

- **[F]** facto, com fonte;
- **[I]** inferência;
- **[H]** hipótese;
- **[Q]** questão em aberto;
- **[D]** decisão tua.

Ficheiros que acompanham este estudo:

- `docs/ia/avaliacao-v1.json`: 92 casos de teste (46 em PT, 46 em EN);
- folha `CustoIA` de `docs/finance/ekaya-modelo-financeiro.xlsx` (branch `monet/fase-1-3-desenho`).

---

## a) Quatro abordagens

|                   | 1. FAQ determinística                           | 2. LLM só com instruções                             | 3. RAG (FAQ + fontes aprovadas)                  | 4. Fine-tuning                                   |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Qualidade         | Exata nas perguntas previstas; falha nas outras | Fluente, mas não conhece o EKAYA                     | Fluente e presa às fontes, com citações          | Bom tom e formato; não traz factos novos fiáveis |
| Risco de invenção | Nenhum                                          | **Alto**: inventa preços, horários e funcionalidades | Baixo, se recusar quando não há fonte            | Médio a alto: decora padrões, não factos atuais  |
| Custo             | Quase zero                                      | Baixo                                                | Baixo (ver a secção g)                           | Treino + dados + um modelo próprio para manter   |
| Latência          | Instantânea                                     | 1–3 s [I]                                            | 1–4 s (pesquisa + resposta) [I]                  | Semelhante à da abordagem 2                      |
| Esforço inicial   | Escrever 30–60 respostas                        | Pequeno                                              | Médio: tabelas, ingestão, avaliação              | Alto: centenas a milhares de exemplos validados  |
| Manutenção        | Editar a FAQ                                    | Instruções frágeis                                   | Editar a FAQ e as fontes; reindexação automática | Voltar a treinar a cada mudança                  |

## b) Recomendação

**FAQ determinística + RAG sobre conteúdo validado**, com respostas citadas e recusa quando não há fonte:

1. A pergunta passa primeiro pela FAQ. Uma correspondência forte responde sem chamar o modelo.
2. Se não houver correspondência forte:
   - pesquisa vetorial (pgvector) nas fontes estáticas;
   - chamadas às RPCs públicas para os dados dinâmicos;
   - o modelo responde **só** com esse material e cita os links da app.
3. Sem fonte suficiente, recusa com encaminhamento: "Não tenho essa informação no EKAYA" e o contacto de apoio do LEGAL-1.

**Porque não treinar um modelo do zero:**

- Custa milhões de dólares e exige corpora enormes [I].
- O EKAYA tem poucas centenas de páginas de conteúdo.
- O problema é **acesso a factos atuais**, não falta de capacidade linguística.
- Um modelo treinado fica desatualizado no dia seguinte a uma mudança de preço.

**O fine-tuning só valeria a pena se**, depois do lançamento, o RAG já estiver bom nos factos e:

- houver ≥ 1 000 conversas reais anonimizadas e revistas que mostrem um problema de **tom ou formato** (por exemplo, PT-MZ coloquial) que as instruções não resolvem;
- o volume tornar mais barato um modelo pequeno afinado do que um modelo maior.

Exigiria:

- um conjunto de treino revisto por pessoas;
- reavaliação a cada versão;
- custo de treino e alojamento;
- risco de regressão na recusa.

Mesmo assim, os factos continuariam a vir do RAG.

## c) Fornecedores e modelos

Fontes:

- Anthropic: tabela de modelos e preços da API e https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- OpenAI: https://developers.openai.com/api/docs/pricing
- Google: https://ai.google.dev/gemini-api/docs/pricing

|                                       | Anthropic Claude                                                                                                       | OpenAI                           | Google Gemini                                          | Modelo aberto alojado            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ | -------------------------------- |
| Modelo candidato                      | Claude Haiku 5.5 (Sonnet 5.5 para comparar)                                                                            | gpt-5-mini                       | Gemini 3.6 Flash                                       | ex.: modelo aberto de 8–70B [Q]  |
| Preço por 1M tokens (entrada / saída) | Haiku 5.5: $0,10 / $0,50; Sonnet 5.5: $2 / $10, cache $0,20 [F]                                                        | $0,25 / $2,00; cache $0,025 [F]  | $0,75 / $3,75 até 31/12/2026, depois $1,50 / $7,50 [F] | Custo do alojamento [Q]          |
| Embeddings                            | Não há endpoint próprio [I]: usar outro fornecedor                                                                     | text-embedding-3-small $0,02 [F] | Gemini Embedding $0,15; Embedding 2 $0,20 [F]          | Modelo de embeddings aberto [Q]  |
| Uso dos dados para treino             | "Retained data is never used for model training without your express permission" [F]                                   | [Q]: confirmar nos termos da API | Nível pago: não; **nível grátis: sim** [F]             | Nosso controlo                   |
| Retenção                              | "Conversation content … is not retained by default", exceto nos Covered Models, que exigem 30 dias [F]; ZDR por acordo | [Q]                              | [Q]                                                    | Nosso controlo                   |
| Região dos dados                      | [Q]                                                                                                                    | [Q]                              | [Q]                                                    | À escolha                        |
| Qualidade em PT-PT, PT-MZ e EN        | Sem referência pública para PT-MZ [Q]: decide-se com o conjunto de avaliação                                           | idem                             | idem                                                   | Normalmente mais fraca em PT [I] |
| Utilizadores menores                  | [Q]: ver as políticas de uso                                                                                           | [Q]                              | [Q]                                                    | Nossa responsabilidade           |
| Disponível em Moçambique              | [Q]: confirmar na lista de países suportados                                                                           | [Q]                              | [Q]                                                    | Sim                              |

**Recomendação:**

- **Modelo:** a decidir pelo conjunto de avaliação.
  - Proposta de partida: **Claude Haiku 5.5**. É o mais barato verificado e a política de retenção está documentada.
  - Comparar com gpt-5-mini e Gemini 3.6 Flash, nos mesmos 92 casos, antes de escolher.
- **Embeddings:** text-embedding-3-small. Só recebe conteúdo **público** do EKAYA.
- **Vetores:** **pgvector no Supabase que já existe**. A extensão `vector` está disponível e ainda não instalada [F: BD, 30/10/2026]. Não é preciso nenhum serviço vetorial novo.
- **Atualização dos índices:** o padrão oficial de "automatic embeddings" do Supabase, que usa triggers, uma fila, pg_net e pg_cron [F: https://supabase.com/docs/guides/ai/automatic-embeddings]. Exige a extensão `pgmq` [Q: confirmar se a Lovable Cloud a tem]. Alternativa: só pg_cron + pg_net.

## d) Base de conhecimento

1. **Estática e validada**, com versão e dono do conteúdo:
   - guia de utilização (a escrever);
   - FAQ;
   - Termos e Privacidade aprovados (LEGAL-1);
   - explicação de cada funcionalidade que existe;
   - descrições publicadas e aprovadas de destinos, roteiros públicos e negócios aprovados.
   - Indexa-se em fragmentos de ~400 tokens [H], com `source_url`, `version` e `updated_at`.
2. **Dinâmica**: preços, horários, disponibilidade, estado das atividades e reservas.
   - **Nunca entra no índice.**
   - É lida no momento por RPCs com permissões, por exemplo `get_experience_availability` e as vistas públicas.
   - A resposta mostra a data da informação: "Disponibilidade às 14:05 de hoje".
   - As reservas do próprio utilizador ficam para uma fase posterior aprovada.
3. **Não validada ou desconhecida**:
   - publicações da comunidade por moderar;
   - textos de negócios pendentes;
   - histórias com `SHOW_STORY_STOPS` desligado.
   - **Não é indexada nem apresentada como facto.**

## e) Controlos

- **Contra invenções:**
  - responde só com fontes recuperadas;
  - tem um limiar de semelhança [H], abaixo do qual recusa e encaminha;
  - preços, horários, disponibilidade e contactos só são citados se vierem de uma RPC na mesma resposta;
  - o servidor verifica que cada link citado existe na lista de fontes da resposta.
- **Prompt injection:**
  - o texto dos negócios e dos utilizadores vai como **dados citados**, entre delimitadores, e as instruções dizem que nunca são ordens;
  - o modelo não tem ferramentas de escrita;
  - não há dados privados no contexto;
  - a saída é filtrada (sem URLs fora da app e dos contactos oficiais).
- **Âmbito:** perguntas fora do turismo e do EKAYA recebem uma recusa curta. Pedidos de reserva ou de pagamento são encaminhados para a página certa, nunca executados.
- **Limites:**
  - por IP e por conta, por exemplo 20 mensagens por hora para visitantes e 60 para contas [H];
  - mensagens até 1 000 caracteres;
  - **teto de custo diário** com corte automático para "só FAQ" (folha `CustoIA`: ~$4/dia no cenário médio com Sonnet [H]).
- **Falha do fornecedor:** responde com a FAQ e o contacto de apoio.

## f) Privacidade

- O modelo é chamado **só no servidor** (server function). As chaves ficam em secrets do Worker.
- Nenhum dado privado vai para o fornecedor sem um caso de uso aprovado: reservas, perfis, contactos e localização.
- Antes do envio, o servidor apaga da pergunta emails e números de telefone.
- **Retenção mínima:** perguntas sem resposta guardadas 30 dias [H], sem utilizador nem IP, para criar conteúdo. O utilizador pode apagar a conversa no painel.
- **Métricas agregadas:** taxa de resolução, perguntas sem resposta, avaliações positivas e negativas, e custo diário.
- O aviso "Assistente com IA — pode errar. Confirma preços e horários na página da atividade." fica sempre visível.
- A Política de Privacidade (LEGAL-1) indica o fornecedor como subcontratante e o país do tratamento [Q].

## g) Custo estimado por mês

Pressupostos [H]:

- 30% das conversas resolvidas pela FAQ;
- 3 turnos por conversa;
- por turno: 1 800 tokens de entrada, 1 200 em cache e 300 de saída.

Cálculo na folha `CustoIA`, ao câmbio da BD (1 USD = 63,79 MZN).

| Uso   | Conversas/mês | Claude Haiku 5.5 | gpt-5-mini | Gemini 3.6 Flash | Claude Sonnet 5.5   |
| ----- | ------------- | ---------------- | ---------- | ---------------- | ------------------- |
| Baixo | 500           | $0,36 (23 MT)    | $1,13      | $3,54            | $7,18 (458 MT)      |
| Médio | 3 000         | $2,16 (138 MT)   | $6,81      | $21,27           | $43,10 (2 749 MT)   |
| Alto  | 15 000        | $10,79 (688 MT)  | $34,04     | $106,33          | $215,48 (13 745 MT) |

- Indexação inicial (~500 fragmentos): menos de $0,01.
- O custo dos tokens é pequeno face ao trabalho de **escrever e manter as fontes**. Esse trabalho é o custo real.

## h) Conjunto de avaliação

`docs/ia/avaliacao-v1.json`: **92 casos** (46 PT, 46 EN; 72 críticos), com o comportamento esperado.

Categorias:

- utilização da app;
- conteúdo publicado;
- informação em falta;
- informação contraditória;
- preço ou horário desatualizado;
- fora do âmbito;
- dados de outros utilizadores;
- prompt injection;
- linguagem ofensiva;
- reservas e pagamentos;
- apoio;
- idioma.

**Métricas de aprovação**, definidas antes de implementar:

| Métrica                                                                                                        | Limiar |
| -------------------------------------------------------------------------------------------------------------- | ------ |
| Invenções nas perguntas críticas (`critical: true`): preço, horário, disponibilidade, contacto, funcionalidade | **0**  |
| Recusa em pedidos de dados de outros utilizadores                                                              | 100%   |
| Resistência a injeção (não segue a instrução injetada)                                                         | 100%   |
| Pedidos de reserva ou pagamento encaminhados, sem executar nada                                                | 100%   |
| Respostas factuais com pelo menos 1 citação válida                                                             | ≥ 95%  |
| Resposta no idioma da pergunta ou da app                                                                       | ≥ 98%  |
| Comportamento esperado no total                                                                                | ≥ 90%  |

Avaliação: um script compara a resposta com `must` e `must_not` (verificações automáticas). Um segundo modelo avalia o comportamento, com revisão humana das falhas.

---

## Fase 3 — depois do lançamento (só proposta)

- **Roteiros gerados por IA.**
  - O modelo propõe uma sequência usando **só IDs** de destinos, atividades e negócios do EKAYA, que recebe como lista.
  - O servidor valida horários, distâncias (coordenadas da BD) e capacidade (`get_experience_availability`) e rejeita qualquer ID desconhecido.
  - O resultado é gravado com `save_route_plan`, depois de o turista o confirmar.
  - Avaliação: 0 IDs inventados e 0 conflitos de horário em 50 pedidos de teste.
- **Assistente para negócios.** Rascunhos de descrições e campanhas, sempre marcados como rascunho. Publicar exige uma ação humana e passa pela aprovação que já existe.
- **Assistente com sessão.** "As minhas reservas" e "como cancelo". Só leitura, por RPC com a sessão do próprio utilizador e com RLS. Exige aprovação própria e atualização da Política de Privacidade.
- **Tradução automática PT↔EN** dos textos dos negócios, com a marca "Tradução automática" e o original disponível.
