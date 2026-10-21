# Auditoria integral read-only do EKAYA

## Âmbito
Inspeção e relatório apenas. Sem edições de código, schema, dados, documentação do projeto, configuração, publicação ou deploy. Sem testes que escrevam dados (nada de reservas, roteiros, provas ou pontos de QA). O que não for verificável fica marcado "não verificado".

## Método
1. Inventário estático: `src/routes`, componentes, contextos, hooks, `src/lib`, migrações `drizzle/migrations`, `AGENTS.md`, `roadmap.md`, `EKAYA_FIXES.md`, `docs/*`, histórico de conversa (pesquisa de falhas registadas).
2. Base de dados (só SELECT): tabelas, enums, constraints, triggers, funções RPC, policies RLS, grants, buckets; contagens e consistência (órfãos, estados inválidos, dados QA residuais, ledger); linter de segurança.
3. Qualidade: testes Vitest existentes, typecheck, lint (apenas leitura de resultados), pesquisa de Stub/TODO/mocks/hardcodes/links para rotas inexistentes, head/SEO por rota.
4. Browser (Playwright, sem escrita): visitante em todas as rotas, PT/EN, claro/escuro, 1280 e 390; sessão autenticada injetada apenas para navegação e leitura, sem submeter formulários. Papéis sem conta disponível ficam "não verificado".
5. Fecho: comparação de contagens/fingerprints antes e depois para provar ausência de escritas.

## Entregável
Relatório em português europeu num ficheiro descarregável (`/mnt/documents/ekaya-auditoria-integral.md`, fora do projeto), com:
- A. Resumo executivo e prontidão 0–100 (método e incerteza)
- B. Tabela Implementado / Parcial / Em falta / Não verificado
- C. Mapa dos fluxos ida e volta (reservas, negócios, roteiros, comunidade, admin, idioma/tema/mobile, guest → login → retorno) com resultado por etapa
- D. Falhas concretas com ficheiro/função/tabela/policy, gravidade e evidência
- E. Blocos 8E.1–8E.5, 9B–15 e IA, com dependências (8E.5 adiado e 9B fechado respeitados; distinção UI vs end-to-end)
- F. Plano P0/P1/P2 com custo relativo (muito baixa/baixa/média/alta), solução e critério de aceitação; segurança/dados antes de features
- G. Testes manuais essenciais (sucesso e falha)
- H. Limitações e itens que exigem teste real

## Notas
- Falhas históricas a confirmar incluem: desvio de limpeza do ledger no QA de itinerários, XP/favoritos locais, vouchers, links de dashboard empresarial, recuperação de password, retorno à ação original, notificações em falta, offline inexistente, pagamentos inexistentes, KPIs fictícios (9B).
- Nenhuma correção será aplicada; o relatório apenas propõe.
