# Estado atual do projeto EKAYA (atualizado a 26/10/2026)

Resumo: a parte funcional está praticamente completa e o tema claro/escuro e o PT/EN cobrem a app
inteira. Faltam os testes da comunidade (bloco 11), confirmar o resto do bloco 10, os emails de
autenticação fiáveis, o desempenho em telemóvel e o QA final com várias contas e dispositivos.
A app **não** está publicada. Migrações aplicadas e registadas: 0034–0042.

## Concluído (22–26/10)
- [x] 2B — Correções de frontend (sem alterações à base de dados) + CLAUDE.md + auditoria
- [x] Migração do backend (`backend-migration`) juntada à `main`
- [x] SEG-1 — Registo de negócio só para contas autenticadas
- [x] SEG-1B — Um negócio por conta (migração 0034, índice único em `businesses.owner_id`)
- [x] SEG-2 — Integridade das reservas (migração 0035)
- [x] 8E.5 — Fluxo comercial integrado: `no_show`, expiração automática de pendentes, capacidade na edição admin (0036, 0037)
- [x] 9B — Estatísticas e impacto verificável (/impact com RPC agregada, sem KPIs fictícios)
- [x] 10B — Recompensas de negócio, jogos em PT/EN e provas com localização (migração 0038)
- [x] ADM-1 — Painel de administração: suspensão, papéis, dono, reservas e atividades (migração 0039)
- [x] ADM-2A — Admin em PT/EN, diálogo de confirmação próprio, tokens de tema nos modais (+ correção de layout e botões Aprovar/Rejeitar)
- [x] TESTE-1 — 3 contas de teste (turista, negócio, admin) e capturas do admin antes/depois
- [x] DADOS-1 — Meteorologia (Open-Meteo), notícias (Google News) e câmbio (0040, pg_net + pg_cron) reais; eventos e estradas escondidos até haver dados reais
- [x] FAV-1 — Favoritos na base de dados e preferências numa só transação (migração 0041)
- [x] ADM-2B — Tema claro/escuro com a marca em toda a app, contraste AA (143 → 0 violações axe), PT/EN completo, sem confirm() nativos
- [x] ADM-2C — Avisos do admin a um utilizador, aos donos ou a todos, com registo do remetente (migração 0042)

## Em curso
- [ ] FINAL-1 — Arrumação, emails de autenticação fiáveis e desempenho em telemóvel

## Em falta
- [ ] Bloco 10 — confirmar se há partes além do 10B (ver plano oficial)
- [ ] Bloco 11 — Comunidade: implementada (publicações, reações, denúncias, moderação, experiências comunitárias); **faltam os testes** (Vitest das regras e testes de BD auto-revertíveis da RLS e da moderação)
- [ ] Eventos geridos pelo admin (tabela `events`, RLS, modal, ligação a `event_participations`) para reativar o separador Eventos
- [ ] Tradução EN do conteúdo editorial estático (`src/data/itineraries.ts`: histórias e descrições)
- [ ] QA integral multissessão: admin, turista, segundo dono, decisões e fechos de horário
- [ ] QA de itinerários em multissessão e dispositivos físicos
- [ ] Estabilização final de todos os fluxos de ponta a ponta

## Antes do lançamento
- [ ] Apagar ou desativar as 3 contas de teste e o negócio "EKAYA Teste — não reservar" (a conta admin de teste tem poderes reais)
- [ ] Confirmar os números de emergência (119, 117, 198) com fontes oficiais
- [ ] Configurar o envio de emails (SMTP/domínio) e os Redirect URLs do domínio final
- [ ] Confirmar que todas as migrações aplicadas na base de dados de produção estão na `main`

---

# Histórico de blocos

## 8E.3 — Gestão de Reservas, Workflow de Estados e Fecho de Horário
- [x] FASE 1 Auditoria do sistema de reservas
- [x] FASE 2 Gestão de reservas no painel da empresa
- [x] FASE 3 Workflow de estados com motivo e RPC atómica
- [x] FASE 4 Fecho/reabertura de horário a novas reservas
- [x] FASE 5 Capacidade, concorrência e integridade
- [x] FASE 6 Segurança e permissões
- [x] FASE 7 Notificações (dono e turista, com motivo)
- [x] FASE 8 Testes 1–28 (resultados no relatório final)
- [x] FASE 9 Limpeza de dados QA e verificação de contagens
- [x] FASE 10 Relatório final

## 8E.4 — Painel real de negócios
- [x] Auditar painéis, métricas, ações e segurança sem escritas na base de dados
- [x] Implementar métricas reais e atalhos reutilizando a gestão existente
- [x] Validar testes disponíveis e interface empresarial PT/EN/temas desktop/mobile
- [x] Comparar cinco tabelas e entregar relatório com limitações
- [x] Revalidar 8E.4 e corrigir lacunas de paginação, identidade e contraste; atualizar evidência e relatório
- [ ] QA integral Admin/turista/segundo dono e decisões/fechos — bloqueada por sessões QA autorizadas e dados isolados populados

## Itinerários e planeamento
- [x] Auditar catálogo, edição, progresso, mapas, pontos e políticas reais
- [x] Corrigir lacunas comprovadas de gravação, provas, conclusão e mapas
- [x] Executar 46 testes e fluxo autenticado; documentar limites e desvio QA, com quatro fingerprints restaurados
- [x] Entregar relatório em docs/itinerary-audit-report.md
- [ ] QA multissessão/Admin/segundo utilizador e dispositivos físicos — depende de sessões autorizadas e dispositivos disponíveis
