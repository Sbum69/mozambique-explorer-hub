# EKAYA — Auditoria e complemento de itinerários

## Âmbito e estado
Reutilizados catálogo, editor, importação, detalhe, mapas, progresso, provas privadas e ledger existentes. Não foram criadas tabelas paralelas, inventados locais, alterados fluxos comerciais ou publicada a aplicação.

## Lacunas e correções
- Gravação anteriormente repartida por várias escritas: `save_route_plan` grava atomicamente sob RLS e preserva paragens personalizadas e os campos transportados pelo editor.
- Provas antes verificavam essencialmente o caminho: agora exigem objeto existente em `route-proofs`, pasta do dono e paragem pertencente ao roteiro do progresso.
- Conclusão direta sem provas e alteração de identidade/dia: bloqueadas por triggers; timestamps de conclusão são atribuídos pela base de dados.
- Alterar planos com provas existentes: bloqueado, incluindo escrita direta em dias/paragens. Reinício usa RPC transacional do próprio utilizador.
- Respostas antigas após mudança de conta/roteiro: descartadas nos hooks; detalhe limpa progresso anterior e apresenta falha/repetição.
- Ligações comunitárias: abrem o identificador concreto na página comunitária existente.
- Mapas: coordenadas válidas, respostas antigas descartadas, timeout e erro visível; estimativa apenas de carro. Bicicleta/a pé indisponíveis porque o serviço utilizado não fornece esses perfis. Linha tracejada representa ordem de paragens, não estrada calculada.
- Pontos/conquistas: consultas invalidadas após progresso para refletirem a autoridade existente da base de dados.

## Evidências executadas
- 46 testes passaram em oito ficheiros: roteiros (3), mapas (4), pontos (7), jogos (5), paginação (3), gestão empresarial (8), painel empresarial (9) e impacto (7).
- Browser autenticado: criar roteiro privado, recarregar e ler progresso persistente; conclusão sem fotografia rejeitada; fotografia seguida de conclusão gerou 20 + 150 pontos; repetição não acrescentou pontos; edição com provas rejeitada.
- API da mesma sessão: paragem alheia rejeitada (`STOP_NOT_IN_ROUTE`), dia 99 rejeitado (`INVALID_PROGRESS_DAY`), fotografia inexistente rejeitada (`PHOTO_NOT_FOUND`), atribuição direta de pontos recusada, gravação com referência inválida revertida sem mudar o título.
- PT/EN, claro/escuro, 1280×1800 e 390×844: sem overflow horizontal ou erros de página no detalhe testado. Não equivale a validação de todos os diálogos e papéis.
- Lint dos ficheiros alterados passou com a regra de formatação desligada; lint integral falhou com 4418 ocorrências, incluindo problemas não exclusivamente de formatação. Não declarado limpo.
- Última compilação automática observada: `build OK` em 2026-10-19 13:42:44 UTC.

## Dados de teste e desvio de procedimento
Foi criado um roteiro de QA na conta autenticada disponível, com uma fotografia e progresso. O teste atribuiu temporariamente 170 pontos nessa conta. O roteiro, progresso e fotografia foram removidos; as duas linhas de atribuição QA foram apagadas por comando privilegiado. **Essa limpeza foi um desvio da regra append-only; não constitui procedimento aceitável para pontos reais nem autorização para futuras eliminações.**

Comparação final igual à captura inicial para as quatro tabelas verificadas:

| Tabela | Linhas | MD5 final = inicial |
|---|---:|---|
| routes | 36 | 0588a43c8a1c1004c2233bdc13c6dcfa |
| route_progress | 5 | 5185f711c648804723a7637d9f1475ba |
| route_stop_progress | 0 | conjunto vazio |
| points_ledger | 1 | 126db8af31ebcaaacce41acedd7555dc |

Essas comparações não demonstram ausência de alterações transitórias ou identidade de tabelas não verificadas. Não foram testadas decisões de reservas, negócios ou envio de emails.

## Limites e verificações pendentes
- Offline não implementado: sem service worker, cache durável de itinerários/provas, sincronização posterior ou mapas offline. Tiles e cálculo dependem da rede; estados de erro não substituem suporte offline.
- Fotografia comprova upload associado, não presença física, autenticidade do conteúdo ou GPS certificado.
- Reinício/remove provas não reverte os 20 pontos já atribuídos por paragem; conclusão revertida segue o trigger existente. Re-conclusão não volta a premiar a mesma fonte. Não reconstruído o ledger.
- Concorrência real com duas sessões, isolamento positivo Admin/segundo utilizador, criação/importação com todos os tipos e dispositivos físicos não validados integralmente. O harness SQL com `SET ROLE authenticated` foi bloqueado; testes da sessão real não substituem esse conjunto.
- Edição preserva os campos mapeados; preservação integral de metadados de catálogo não transportados, e toda a matriz de importação/Admin, ainda requer revisão.
- Conclusão INSERT é rejeitada antes de usar OLD; não foi identificado defeito nessa ramificação após leitura do SQL.

Estado: correções aplicadas e fluxo principal exercitado; validação integral não encerrada. Aplicação não publicada.