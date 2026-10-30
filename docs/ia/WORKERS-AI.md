# Assistente — decisão 11 revista: sem API paga, Cloudflare Workers AI na camada grátis

Data: 30/10/2026. Esta decisão substitui a decisão 11 de `ESTUDO-ASSISTENTE.md`.

Marcas usadas:

- **[F]** facto, com fonte oficial;
- **[I]** inferência;
- **[H]** hipótese;
- **[Q]** questão em aberto.

## Decisão (30/10/2026)

1. **Fase 1 do assistente: FAQ determinística + dados das RPCs, sem LLM.** Não há custos nem fornecedor de IA.
2. **Camada de IA, opcional, por cima da fase 1:** Cloudflare Workers AI, só na camada grátis.
3. **O adaptador do fornecedor é trocável.** A mudança para o Claude Haiku mais tarde não obriga a reescrever.
4. **Se a quota grátis acabar, o assistente passa sozinho a "só FAQ". Nunca gera custos.**
5. **A camada grátis do Gemini não se usa**, porque o Google usa as conversas desse nível para melhorar produtos [F: https://ai.google.dev/gemini-api/docs/pricing].

## Cloudflare Workers AI — o que dizem as fontes oficiais

| Tema                        | Facto                                                                                                                                                                                                                                                                                          | Fonte |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Quota grátis                | "a total of 10,000 Neurons per day at no charge"                                                                                                                                                                                                                                               | [F1]  |
| O que acontece quando acaba | **Workers Free**: "N/A - Upgrade to Workers Paid"; os pedidos seguintes falham com erro. **Workers Paid**: cobra $0,011 por 1 000 Neurons acima da quota                                                                                                                                       | [F1]  |
| Uso para treino             | "Cloudflare does not use Customer Content processed by Workers AI to train AI models."                                                                                                                                                                                                         | [F2]  |
| Retenção                    | "Cloudflare does not retain inputs or outputs after they are no longer needed" para processar o pedido. Guarda metadados operacionais (hora, tokens, latência), sem conteúdo. O conteúdo só fica guardado se ligarmos registos ou cache no AI Gateway, ou se o escrevermos nos nossos registos | [F2]  |
| Limite de pedidos           | Geração de texto: 300 pedidos/minuto. Embeddings: 3 000 pedidos/minuto                                                                                                                                                                                                                         | [F3]  |
| Desenvolvimento local       | Os modelos correm sempre na conta Cloudflare, mesmo com `wrangler dev`. Não há simulação local, por isso os testes também gastam quota                                                                                                                                                         | [F4]  |

Fontes:

- [F1] https://developers.cloudflare.com/workers-ai/platform/pricing/
- [F2] https://developers.cloudflare.com/workers-ai/platform/data-usage/
- [F3] https://developers.cloudflare.com/workers-ai/platform/limits/
- [F4] https://developers.cloudflare.com/workers/development-testing/bindings-per-env/

**Consequência para "nunca gera custos":**

- A conta Cloudflare do EKAYA tem de ficar no plano **Workers Free**. Nesse plano, passar a quota dá erro em vez de cobrança [F1].
- A app tem um contador diário próprio, que corta em **9 000 Neurons** [H], antes do limite oficial.
- Qualquer erro de quota ou de fornecedor passa a resposta para "só FAQ".

São três barreiras independentes.

**A app publicada está alojada pela Lovable [I]:** o Workers AI precisa de uma conta Cloudflare **do EKAYA**. Chama-se pela API REST, a partir de uma server function, com o `account_id` e um token só com a permissão "Workers AI". Criar essa conta e o token cabe ao responsável [Q].

## Modelos candidatos (sem plano pago)

Custo de um turno típico: 3 000 tokens de entrada (pergunta + fragmentos + instruções) e 300 de saída [H].
Neurons por milhão de tokens tirados de [F1].

| Modelo                                         | Neurons/M (entrada / saída) | Neurons por turno  | Turnos por dia na quota | Notas                                                                                                                                     |
| ---------------------------------------------- | --------------------------- | ------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@cf/qwen/qwen3-30b-a3b-fp8`                   | 4 625 / 30 475              | ~23                | ~430                    | Multilingue, contexto de 32 768 [F]. É um modelo de raciocínio: os tokens de raciocínio contam como saída e podem multiplicar o custo [I] |
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast`      | 4 119 / 34 868              | ~23                | ~430                    | O mais barato com qualidade razoável [I]                                                                                                  |
| `@cf/openai/gpt-oss-20b`                       | 18 182 / 27 273             | ~63                | ~160                    |                                                                                                                                           |
| `@cf/google/gemma-4-26b-a4b-it`                | 9 091 / 27 273              | ~36                | ~270                    | Modelo aberto da Google, alojado pela Cloudflare: os termos de dados são os da Cloudflare [F2], não os da camada grátis do Gemini         |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 31 876 / 50 488             | ~111               | ~90                     |                                                                                                                                           |
| `@cf/google/gemma-3-12b-it`                    | 31 371 / 50 560             | ~109               | ~90                     |                                                                                                                                           |
| Embeddings `@cf/baai/bge-m3`                   | 1 075 (entrada)             | ~0,05 por pergunta | —                       | Multilingue [F]. Indexar ~500 fragmentos gasta ~215 Neurons, uma vez                                                                      |

**Capacidade [I]:** com ~23 Neurons por turno, 3 turnos por conversa e 30% resolvido pela FAQ, a quota grátis chega para **~200 conversas com IA por dia** (~6 000 por mês). É acima do cenário médio do estudo (3 000 por mês).

**Qualidade em PT [Q]:** as páginas oficiais dizem "multilingual support" sem listar línguas. Não há referência pública para PT-PT nem PT-MZ, por isso **a escolha fica para os 92 casos de avaliação**.

## Correr os 92 casos — BLOCKED

Estado: **BLOCKED**. Falta:

- uma conta Cloudflare do EKAYA no plano Workers Free;
- o `CLOUDFLARE_ACCOUNT_ID` e um token só com "Workers AI", em `.env.test.local`.

Os dois ficam a cargo do responsável. Como o Workers AI não corre localmente [F4], não há forma de avaliar sem a conta.

Plano, quando houver conta:

| Dia | Modelo                                                  | Neurons estimados (92 casos × ~1 turno)  |
| --- | ------------------------------------------------------- | ---------------------------------------- |
| 1   | `qwen3-30b-a3b-fp8`                                     | ~2 100 (pode ser mais, com o raciocínio) |
| 1   | `llama-3.1-8b-instruct-fp8-fast`                        | ~2 100                                   |
| 1   | `gemma-4-26b-a4b-it`                                    | ~3 300                                   |
| 2   | `gpt-oss-20b`                                           | ~5 800                                   |
| 2   | (reserva) `mistral-small-3.1-24b-instruct` ou repetição | ≤ 4 000                                  |

- O script pára ao chegar a 9 000 Neurons no dia.
- Grava as respostas em `qa-output/` (ignorado pelo Git).
- Aplica os critérios de aprovação de `avaliacao-v1.json`. O critério principal é 0 invenções nos casos críticos.

## Arquitetura (para a implementação, depois de aprovada)

```
pergunta ─► FAQ determinística ──(correspondência forte)──► resposta da FAQ + links
                │
                └─(sem correspondência)─► dados das RPCs públicas (disponibilidade, preços, datas)
                                            │
                                            ├─ IA desligada ou sem quota ─► resposta só com FAQ/RPC, ou "não sei" + contacto
                                            └─ IA ligada e com quota ─► AssistantProvider.generate(...)
```

- **Interface `AssistantProvider`**, em `src/lib/assistant/providers/`:
  - `generate({ system, messages, sources }) → { text, usage, citations }`;
  - `embed(texts) → vectors`.
- **Implementações:**
  - `none`: só FAQ, o valor por omissão;
  - `cloudflare` (Workers AI pela API REST);
  - mais tarde, `anthropic` (Claude Haiku).
- O fornecedor escolhe-se numa configuração de servidor (`ASSISTANT_PROVIDER`). Trocar não toca na interface nem na lógica.
- **Embeddings:** guardados no pgvector com o nome do modelo de embeddings. Trocar de modelo obriga a reindexar, num job que já está previsto.
- **Contador de quota:** uma tabela diária só do servidor, com `day`, `provider`, `units_used` e `requests`.
  - Antes de cada chamada, compara `units_used + estimativa` com o limite (9 000 Neurons).
  - Depois, regista o uso real.
  - Para o Claude Haiku, a mesma tabela conta em USD, com o teto diário do estudo.
- **Corte automático para "só FAQ"** quando acontece um destes casos:
  - o limite diário é atingido;
  - o fornecedor devolve um erro de quota ou de autenticação;
  - há 3 falhas seguidas.
- A interface mostra "Respostas automáticas indisponíveis hoje — mostro a ajuda guardada", em PT/EN.
