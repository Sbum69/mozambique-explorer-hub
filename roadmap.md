# Estado atual do projeto EKAYA (atualizado a 04/11/2026)

Resumo: o código de lançamento está fechado. Comissão (M1), destaques pagos por M-Pesa (M6),
página Para negócios com pedidos (M9), assistente de ajuda por FAQ (fase 1; fase 2 preparada e
desligada), estado do lançamento e registo de erros no admin. A app **não** está publicada.
Migrações aplicadas: 0000–0053. Por aprovar (Lote B): 0054–0057. Identidade visual "Capulana e
Índico", PT-PT/PT-MZ + EN, tema claro/escuro.

## Concluído (31/10–04/11)
- [x] LEGAL-1 — Termos e Privacidade (rascunho), aceitação com versão (0049), contacto e versão nas Definições
- [x] SEG-2 — 2FA (TOTP) obrigatório para administradores, `aal2` nas rotas e no `has_role` (0050); CSP obrigatória
- [x] CONTEÚDO-1 — Pronto para publicar, importação por ficheiro, convites para donos, fotos (0051, 0052)
- [x] M1 — Motor de comissão versionado, Parceiro Fundador, cartão "Comissão e taxas" (0053)
- [x] M6 — Destaques e campanhas com pagamento manual M-Pesa, etiqueta Patrocinado, recibo não fiscal (0054, por aprovar)
- [x] M9 — `/para-negocios`, pedidos com anti-spam, criar negócio a partir do pedido, sitemap e robots, `docs/sales/` (0055, por aprovar)
- [x] Assistente fase 1 — FAQ (39 entradas) editável com versões, motor PT/EN, preços e horários ao vivo, perguntas sem resposta 30 dias; 92 casos: FAQ 90/92 (0056, por aprovar)
- [x] Lançamento — `docs/LAUNCH.md`, SQL do dia D ensaiado (não aplicado), `prelaunch.ts`, estado do lançamento e erros no admin (0057, por aprovar)
- [x] Polimento — guarda PT-PT no Vitest, Escape e foco no editor da comunidade, foco de volta no assistente, 2 avisos de lint resolvidos (17 → 15)

## Lançamento (por fazer — ver `docs/LAUNCH.md`)
- [ ] Aprovar e aplicar o Lote B (0054–0057) e correr os testes de BD e o `prelaunch.ts`
- [ ] ≥ 5 negócios aprovados e ≥ 5 atividades ativas (hoje: 1 e 0)
- [ ] 2FA em todos os administradores (hoje: 1 sem 2FA)
- [ ] Domínio, email (SPF, DKIM, DMARC, SMTP) e Redirect URLs; contacto `apoio@<domínio>`
- [ ] Revisão jurídica de Termos, Privacidade e acordo de parceiro; NUIT
- [ ] Instruções de pagamento M-Pesa reais no admin
- [ ] Dia D: SQL das contas de teste (aprovado), Storage, apagar `.env.test.local`, publicar
- [ ] Confirmar os números de emergência (119, 117, 198) com fontes oficiais
- [ ] Juntar os branches à `main` pela ordem indicada e confirmar o CI verde

## Concluído (22–30/10)
- [x] 2B — Correções de frontend (sem alterações à base de dados) + CLAUDE.md + auditoria
- [x] Migração do backend (`backend-migration`) juntada à `main`
- [x] SEG-1 — Registo de negócio só para contas autenticadas
- [x] SEG-1B — Um negócio por conta (migração 0034, índice único em `businesses.owner_id`)
- [x] SEG-2 — Integridade das reservas (migração 0035)
- [x] 8E.5 — Fluxo comercial integrado: `no_show`, expiração automática de pendentes, capacidade na edição admin (0036, 0037)
- [x] 9B — Estatísticas e impacto verificável (/impact com RPC agregada, sem KPIs fictícios)
- [x] 10B — Recompensas de negócio, jogos em PT/EN e provas com localização (migração 0038)
- [x] ADM-1 — Painel de administração: suspensão, papéis, dono, reservas e atividades (migração 0039)
- [x] ADM-2A/2B/2C — Admin PT/EN, tema claro/escuro, contraste AA, avisos do admin (0042)
- [x] TESTE-1 — 3 contas de teste (turista, negócio, admin)
- [x] DADOS-1 — Meteorologia, notícias e câmbio reais (0040)
- [x] FAV-1 — Favoritos na base de dados e preferências numa só transação (0041)
- [x] FINAL-1 — Arrumação, recuperação de palavra-passe, desempenho em telemóvel (1.ª fase)
- [x] PERF-2 — SSR nas páginas públicas, carregamento sob pedido, idioma no servidor, barra de topo sem cortes no telemóvel
- [x] LIMPEZA-1 — Lint com 0 erros no repositório todo, fins de linha LF, CI no GitHub Actions
- [x] TESTES-1 — Bloco 11 testado: Vitest da comunidade e notificações (165 → 290 testes no total), 11 ficheiros de testes de BD em `supabase/tests/`, scripts de browser em `scripts/qa/`, `docs/QA.md`
- [x] I18N-2 — Conteúdo em EN: roteiros de catálogo (0043), localizações das experiências comunitárias (0044, `location_en`), dados estáticos, diálogo dos jogos; histórias legadas escondidas e dados inventados removidos
- [x] PERF-3 — Mapa 63 → 81 (LCP 7,1 → 3,8 s; lista no servidor, Leaflet sob pedido, lista acima do mapa no telemóvel, miniaturas); home 74 → 78
- [x] UX-1 — Convidado só lê (rotas privadas com regresso, diálogo único), barra lateral limpa, filtros a partir das preferências com "Repor", menu do utilizador e /settings (perfil, foto, conta, preferências, aparência, notificações, exportar dados, apagar conta); migrações 0046 e 0048
- [x] DADOS-2 — Cópia local, limpeza de contas (13 apagadas, 1 anonimizada, 5 internas), 8 negócios sem dono suspensos, métricas sem contas internas (0047)
- [x] FOTOS-1 — 15 fotos do Wikimedia Commons com licença livre e crédito visível (províncias, destinos, home, Cultura e História), /creditos, marcador neutro para negócios
- [x] PERF-4 — A/B com a main no mesmo PC: home e roteiros iguais ou melhores; fontes depois da primeira pintura, esqueleto do painel, menu do utilizador sob pedido; CLS do painel 0,32 → 0,002
- [x] DESIGN-1 — Tokens, fontes próprias, sem emojis nem gradientes de cor em todas as páginas, raios/contornos/movimento com regras; axe 0 violações (28 páginas × 2 temas)
- [x] QA-2 — Vitest 305, 13 ficheiros de testes de BD, hidratação, larguras, idioma, interações, convidado, percursos das 3 contas, Lighthouse
- [x] SEG-FINAL — Auditoria (RLS, grants, funções, storage, segredos, XSS, redireções); migração 0045 (grants do visitante, fotos aprovadas visíveis, links `//`, só imagens nos buckets); `seroval` crítico corrigido; cabeçalhos de segurança; `docs/SECURITY.md`

## Depois do lançamento

**Prioridade 1 — desempenho** (Lighthouse mobile, mediana de 3, medido a 05/11/2026 no `prelaunch.ts`):
- [ ] Roteiros (`/itineraries`): **57** (TBT 1,05 s). Objetivo ≥ 70: reduzir o trabalho no primeiro carregamento da lista.
- [ ] Jogos (`/games`): **59** (LCP 5,2 s, TBT 1,18 s). Objetivo ≥ 70: esqueleto vindo do servidor e redireção para o login no browser (decisão de produto adiada).
- [ ] Painel (`/dashboard`): **59** (LCP 6,0 s). Objetivo ≤ 2,5 s a pintar com sessão: sessão em cookies e SSR das páginas privadas.
- [ ] Bundle inicial **~250 KB gz**: separar os dicionários de texto não reduziu (o empacotador volta a juntá-los); rever a divisão em blocos (`manualChunks`) e o que o root importa.

**Prioridade 2 — segurança (auditoria de 05/11/2026)**
- [ ] `zod` 3 → 4 (aviso alto: memória com coleções enormes; hoje o servidor só valida `{ lang }`).
- [ ] CSP com nonces (ou hashes) nos scripts inline, para retirar `script-src 'unsafe-inline'`.
- [ ] Atualizar as ferramentas de desenvolvimento com avisos (`undici`, `ws`, `esbuild`, `minimatch`, `sharp`) quando o wrangler e o plugin da Lovable subirem.
- [ ] `admin_set_user_role` não escreve no `admin_audit`: registar as mudanças de papel na própria RPC.

**Outros**
- [ ] Limpeza periódica de ficheiros de provas de contas apagadas (storage)
- [ ] Negócios de exemplo suspensos (8): reativar quando um dono real os reclamar
- [ ] Histórias da home (`src/data/itineraries.ts`): validar as lendas antes de as voltar a mostrar (`SHOW_STORY_STOPS`)
- [ ] Eventos geridos pelo admin (tabela `events`, RLS, modal) para reativar o separador Eventos
- [ ] Bloco 10 — confirmar se há partes além do 10B (ver plano oficial)
- [ ] QA integral multissessão e em dispositivos físicos (admin, turista, segundo dono; itinerários)
- [ ] Assistente fase 2 (Qwen3): **desligado no lançamento** (`ASSISTANT_LLM_ENABLED = false`). Antes de ligar: corrigir os 5 casos críticos sinalizados (pt-10, pt-18, pt-23, pt-39, pt-40) e o português do Brasil ("você", "contato", "me diga" em 7 de 92): PT-PT/PT-MZ no prompt + `ptPtViolations` no servidor a rejeitar e repetir a resposta; voltar a correr os 92 casos sem sinalizações críticas

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
