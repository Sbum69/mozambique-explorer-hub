# 8E.4 — Relatório de implementação e validação
Data: 19-10-2026. Estado: implementação entregue; QA integral pendente. Não publicado, visibilidade inalterada, 8E.5 não iniciado.

## 1. Auditoria
Tabela pré-implementação em `docs/8E4-audit.md`. Gestão de perfil/atividades/agenda e workflow de reservas já funcionavam: preservados. Admin continha KPIs, percentagens, pendentes, ranking, eventos e uptime fictícios; removidos. `/dashboard` é a área turística, fora deste escopo.

## 2. Funcionalidades
- Resumo real de reservas por todos os cinco estados e total, confirmadas futuras; filtros persistem na URL.
- Resumo de atividades do negócio selecionado e horários, reutilizando a leitura de gestão. Reservas agregam todos os negócios do dono: sem duplicar reservas.
- Atalhos abrem criar atividade, gestão, seletor de disponibilidade, perfil, filtros de reservas e notificações existentes no cabeçalho.
- Reservas recentes: cinco mais recentes por created_at, com ligação aos detalhes; não é histórico de eventos. Histórico completo continua abaixo, sem limite de leitura silencioso.
- Admin: contagens reais exatas de perfis, negócios, atividades e reservas; total de negócios pendentes e cinco negócios recentes; resumo reutilizado no modal. Aprovação existente preservada.
- Corrigido contraste do texto no botão outline, inclusivamente em tema escuro.

## 3. Ficheiros
Modificados: `src/routes/business-dashboard.tsx`, `src/components/BusinessManagement.tsx`, `src/routes/admin.tsx`, `src/lib/business-management.functions.ts`, `src/lib/bookings.ts` (exports de mapeamento), `src/router.tsx`, `src/routes/__root.tsx`, `src/components/ui/button.tsx`, `AGENTS.md`, `roadmap.md`, `EKAYA_FIXES.md`.
Novos: `src/lib/dashboard.functions.ts`, `src/lib/business-dashboard.ts`, `src/lib/business-dashboard.test.ts`, `src/lib/read-all.ts`, `src/lib/read-all.test.ts`, documentação em docs.

## 4. Base de dados
Nenhuma migration, alteração de policy, GRANT, schema, trigger ou dados. Funções de leitura autenticadas aplicam role e owner_id derivado da sessão; Admin é verificado através de has_role com o cliente RLS. Nunca recebem ID de dono/negócio fornecido pelo browser. Agenda, decisões e notificações mantêm os mecanismos 8E.2/8E.3.

## 5. Métricas e fontes
- Reservas: bookings dos IDs de negócios próprios; cada ID lido uma vez; estados separados; todas as páginas de 500 carregadas, sem limite total arbitrário.
- Futuras: somente confirmed, data/hora posterior ao instante atual, timezone de Moçambique UTC+02. Não significa janela de próximos sete dias.
- Atividades: experiences do negócio selecionado; active true/false; total é soma destas categorias, não soma de reservas.
- Horários abertos: active + accepts_new_bookings + atividade ativa + negócio approved. São janelas semanais elegíveis, não garantia de capacidade numa data concreta.
- Fechados: accepts_new_bookings=false, incluindo janela também inativa. Outros indisponíveis: flag aberta mas janela/atividade inativa ou negócio não aprovado. Categorias exclusivas.
- Admin: counts exatos de tabelas existentes, sem emails, nomes de clientes ou contactos no resumo; perfis não são “turistas ativos”. Receita, conversão, impacto e crescimento omitidos por ausência de fonte confiável.
- Recentes: created_at de reservas/negócios, não updated_at interpretado como evento.

## 6. Testes solicitados
PASS significa apenas o escopo executado abaixo; não há PASS integral para testes de múltiplas contas não executados.

| # | Resultado | Evidência / escopo |
|---|---|---|
| 1 | PASS parcial | Browser autenticado do proprietário: 1 negócio, 0 atividades, 0 reservas; consulta BD confirma 1/0/0. Zero real, não dados demo. QA populada e Admin pendentes. |
| 2 | PASS unitário | Vitest: fixture com um registo de cada estado produz contagens individuais 1 e total 5. Não há reservas reais em todos os estados para E2E. |
| 3 | PASS unitário | Rejeitadas/canceladas produzem confirmed=0, upcoming=0. |
| 4 | PASS unitário | Atividade ativa e inativa contadas separadamente (total 2, 1/1). |
| 5 | PASS unitário | Fechada não conta aberta; inatividade e negócio pending também excluídos. |
| 6 | PASS parcial | Browser: status=pending/all, criar abre diálogo existente, perfil abre diálogo existente, notificações abrem. Gestão via âncora existente inspecionada. Disponibilidade com atividade populada não executada: dono disponível não tem atividades. |
| 7 | PASS parcial | Browser mostra vazio real; implementação só deriva created_at. Sem inserções/eventos fabricados. Feed populado não executado. |
| 8 | PASS parcial | SDK com sessão do dono: consulta de reservas de negócios alheios devolve 0; Admin RPC negado. Troca de sessão entre dois donos não executada. |
| 9 | BLOCKED | Sessão disponível é empresarial; requer conta QA turista autorizada para teste do acesso e função. Guard de role existe, mas inspeção não conta como teste. |
| 10 | BLOCKED | Não há sessão QA Admin autorizada disponível. Testado acesso negado ao Admin pelo dono; workflows positivos Admin não executados. |
| 11 | BLOCKED parcial | Fingerprints provam reservas existentes intactas e total_mzn preservado; dono disponível sem reservas. Títulos são join atual, não snapshot histórico; não alegar títulos históricos imutáveis. |
| 12 | BLOCKED | Não modificar reservas/horários reais para testes. Requer dados QA controlados e conta autorizada para decisões/rejeição/cancelamento/fecho. Triggers/RPC preservados, não constitui regressão E2E executada. |
| 13 | PASS empresarial / BLOCKED Admin | Playwright 1280×1800 e 390×844, PT/EN × claro/escuro: oito combinações, sem overflow nem pageerror; capturas inspecionadas; diálogo criar mobile verificado. Tema via classe dark, não dispositivo físico. Admin e todos os modais preexistentes não validados. |
| 14 | PASS | 8 testes business-management + 9 de métricas + 2 de paginação: 19/19 em três ficheiros. |
| 15 | PASS limitado às cinco tabelas | Contagens e hash ordenado dos registos completos idênticos nas cinco tabelas abaixo. Zero registos QA criados, zero limpeza. Não é comparação integral de toda a BD/storage/auth. |

Scripts e capturas usados: `/tmp/browser/8e4/check_dashboard.py`, `check_matrix.py`. Evidência temporária de execução, não fixtures para produção.

## 7. Build
Última entrada observada em `/tmp/observability/build-errors.log`: `2026-10-19T00:23:01Z build OK`. Foram encontrados e resolvidos erro transitório de exports e ausência de QueryClientProvider. Browser empresarial final: sem pageerror. Não foi executado build manual.

## 8. Integridade
Comparação por `md5(string_agg(to_jsonb(row)::text,'|' order by id))`, fórmula idêntica nas duas capturas antes/depois dos testes. Captura foi feita após alterações de código, antes da matriz de testes; não alegar comparação de toda a sessão anterior.

| Tabela | Antes/depois | Hash antes/depois |
|---|---:|---|
| bookings | 2 / 2 | f3491bb2e2785ce63994102c8e97ff56 |
| businesses | 13 / 13 | 719a9f7f3ea4b63ca53e81d34eb93818 |
| experiences | 8 / 8 | 249fc9c65268bc95fd1e97d3d9b3dc24 |
| experience_availability | 48 / 48 | a26574d2d4dcc68d477276ee71541d83 |
| notifications | 6 / 6 | 9443f320318eca974f70953ffaeea556 |

Nenhum email enviado, nenhuma notificação marcada como lida, nenhum save/decision/closure executado para teste.

## 9. Limitações e riscos
- 8E.4 não fechado integralmente: faltam testes positivos Admin/turista/segundo dono e painel com reservas/atividades populadas. Sessão disponível só do proprietário sem estes registos; não escolher outra conta nem alterar papéis para contornar.
- Histórico de preço é snapshot; título vem da atividade atual e pode mudar se o dono a editar. Não criar títulos retroativos inventados.
- Sem journal completo: não mostrar eventos de alterações/decisões como se houvesse diário.
- Leituras paginadas eliminam cap silencioso; alterações concorrentes entre páginas ainda não são snapshot transacional. Para volumes grandes, considerar resumo agregado/paginação visível em bloco autorizado futuro.
- Admin externo existente continua com modais antigos parcialmente só PT e classes de cor fixas. Não foram redesenhados nem declarados integralmente validados. Resumo e atalhos novos são bilingues e tokenizados.
- Verificação de email E2E e avaliação do alerta CSRF preexistente continuam pendências de lançamento anteriores.

## 10. Antes do lançamento
Concluir QA autorizada com Admin, turista e dono com dados QA populados, validação de estados/fechos sem tocar dados reais; revalidar snapshots de títulos/limitação acordada; completar traduções/tema de modais legados dentro de escopo autorizado; validar callback de email em URL pública e segurança pendente. Não publicar automaticamente nem iniciar 8E.5.
