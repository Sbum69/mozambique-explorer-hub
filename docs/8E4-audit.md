# 8E.4 — Auditoria pré-implementação

| Requisito | Implementação atual | Evidência | Lacuna | Mudança proposta |
|---|---|---|---|---|
| Reservas por estado | Filtros e contadores reais, transições e motivos existentes | business-dashboard.tsx; bookings.ts; migration 0026 | Leitura limitada; falta resumo e próximas | Leitura autenticada paginada, contagem separada e futuras em Africa/Maputo |
| Atividades ativas/inativas | Gestão real por proprietário | BusinessManagement.tsx; getBusinessManagement | Sem resumo | Reutilizar o mesmo resultado, sem pedidos extra |
| Horários abertos/fechados | accepts_new_bookings e active; fecho preserva reservas | BusinessManagement.tsx; availability_integrity_guard | Sem métricas | Distinguir flag de fecho de disponibilidade efetiva |
| Ações rápidas | Perfil, criar, editar e disponibilidade funcionam | BusinessManagement.tsx | Sem atalhos; nenhuma interface precisa ser recriada | Abrir os diálogos existentes e seleção de atividade |
| Atividade recente | Painel empresarial não tem feed fictício | business-dashboard.tsx | BD não guarda um diário completo | Reservas recentes pela data real de criação |
| Propriedade | RLS owners SELECT + funções owner_id; business role no acesso à página | pg_policies; auth.ts; management.functions | Leitura de reservas ainda client-side | Função autenticada, owner_id derivado da sessão e filtro por IDs próprios |
| Admin — métricas | 8.432 turistas; 342 negócios; $2.1M; 68%; crescimentos simulados | admin.tsx:151–156 | Não correspondem à BD | Contagens exatas autorizadas; omitir receita/conversão |
| Admin — pendentes | Três empresas fictícias, botões sem handlers | admin.tsx:158–162,280–305 | Duplica visualmente aprovação real | Lista real e atalho ao modal de aprovação existente |
| Admin — locais/atividade | Visitas, receitas e quatro eventos inventados | admin.tsx:164–170,188–193 | Sem fonte confiável | Remover rankings e substituir por negócios recentes |
| Admin — relatórios/saúde | Valores repetidos, exportação sem comportamento, uptime 99.9% | admin.tsx:368–386,800–840 | Não medidos | Resumo real partilhado; retirar alegações de saúde/impacto |
| Histórico | total_mzn é snapshot; títulos vêm do join da atividade | bookings.ts:36–120; bookings_guard_update | Não existe snapshot histórico do título | Preservar preço e título atual disponível; documentar limitação sem inventar retroativos |
| Dados e publicação | 2 reservas, 13 negócios, 8 atividades, 48 horários, 6 notificações | Auditoria por consultas somente leitura | Fingerprint inicial parcial | Capturar todas as tabelas públicas relevantes antes/depois; nenhuma escrita QA necessária |

Nenhuma migração necessária: todas as fontes já existem. Preservar Auth/roles/RLS, aprovação e RPC de decisão/fecho. Não alterar dashboard turístico, publicar ou iniciar 8E.5.
