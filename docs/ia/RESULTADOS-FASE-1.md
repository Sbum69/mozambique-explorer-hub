# Assistente — fase 1 (sem modelo de linguagem): resultados

Data: 04/11/2026. Casos: [`avaliacao-v1.json`](avaliacao-v1.json) (92). FAQ: [`faq-v1.json`](faq-v1.json)
(39 entradas, 4 marcadas `[VALIDAR]`), carregada na base de dados pela migração 0056.

## 1. Motor de FAQ (o que corre na aplicação)

`bun scripts/qa/assistant-eval.ts` — palavras-chave, sinónimos e tolerância a erros; preços e
horários lidos do catálogo público e de `get_experience_availability`, com a data da leitura.

| Resultado | Valor            |
| --------- | ---------------- |
| PASS      | **90 / 92**      |
| FAIL      | 2 (pt-20, en-20) |

Os 2 FAIL pedem "a data dos dados" de uma experiência que a pergunta não nomeia ("a descrição diz
'aberto todos os dias' mas o horário só mostra sábados"). O assistente responde que não encontrou a
experiência e sugere confirmar com o negócio — não inventa dados. Decisão: fica assim.

## 2. Qwen3 (fase 2, desligada) com a mesma FAQ como fontes

`bun scripts/qa/ai-eval.ts --model=@cf/qwen/qwen3-30b-a3b-fp8 --faq=docs/ia/faq-v1.json` — só
perguntas sintéticas, quota grátis do Workers AI.

| Resultado       | Valor                                     |
| --------------- | ----------------------------------------- |
| Respondidas     | 92 / 92 (0 erros)                         |
| Sem sinalização | 73 / 92                                   |
| Sinalizadas     | 19 (heurísticas; leitura humana abaixo)   |
| Idioma certo    | 85 / 92                                   |
| Com citação     | 87 / 92                                   |
| Neurons usados  | 1 362 (limite diário de segurança: 9 000) |

Leitura das 19: 7 usam português do Brasil ("você", "contato", "me diga") — apanhadas pela
verificação `ptPtViolations` que a fase 2 faz no servidor antes de mostrar a resposta; 6 sem a
citação pedida; 4 respostas que não parecem PT pela heurística (falsos positivos curtos, texto em
PT correto); 2 com o slug da FAQ como texto do link. **Nenhuma** inventou preços, horários,
contactos nem disse que executou ações.

Conclusão: a fase 1 (FAQ) é mais segura e chega para o lançamento. A fase 2 fica preparada e
desligada (`ASSISTANT_LLM_ENABLED = false`); se for ligada, precisa da correção PT-PT no prompt,
da verificação no servidor e das citações transformadas em links (`linkifyCitations`).
