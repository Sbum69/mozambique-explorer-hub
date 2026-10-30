# Estado atual do projeto EKAYA (atualizado a 30/10/2026)

Resumo: a parte funcional está completa, com tema claro/escuro e PT/EN em toda a app (incluindo o
conteúdo da base de dados), testes de unidade, de BD e de browser guardados no repositório, CI no
GitHub, desempenho em telemóvel melhorado e auditoria de segurança feita. A app **não** está
publicada. Migrações aplicadas e registadas: 0000–0048 (49 registos). Identidade visual própria
("Capulana e Índico", `docs/DESIGN.md`), fotografias livres com crédito e contas de teste fora das
métricas.

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

## Pendente depois do lançamento
- [ ] Painel com sessão a pintar em ≤ 2,5 s (DevTools): hoje ~6–7 s por ser renderizado no browser à espera da sessão (a main nem pinta). Exige sessão em cookies e SSR das páginas privadas.
- [ ] Lighthouse mobile < 75 neste PC: mapa 68 (confirmar com A/B; era 81 no PERF-3), roteiros 63–68, jogos 55, painel 58. Medir no preview/site publicado (o preview da Lovable pede sessão: 401).
- [ ] Todas as 8 experiências estão inativas: `/experiences` fica vazia e não há reservas possíveis
- [ ] Textos dos Termos e da Privacidade (páginas "em preparação"), contacto e número de versão
- [ ] Limpeza periódica de ficheiros de provas de contas apagadas (storage)
- [ ] Negócios de exemplo suspensos (8): reativar quando um dono real os reclamar
- [ ] Jogos: desempenho mobile ≥ 70 (está em ~62, com grande variação). Exige mostrar o esqueleto da página vindo do servidor e redirecionar para o login no browser (decisão de produto adiada).
- [ ] `zod` 3 → 4 (aviso alto de memória nos validadores; a correção só existe no zod 4)
- [ ] CSP: passar de report-only a obrigatória depois de verificar o preview da Lovable e o site publicado
- [ ] Editor de publicações da comunidade não fecha com Escape (acessibilidade)
- [ ] Histórias da home (`src/data/itineraries.ts`): validar as lendas antes de as voltar a mostrar (`SHOW_STORY_STOPS`)
- [ ] Eventos geridos pelo admin (tabela `events`, RLS, modal) para reativar o separador Eventos
- [ ] Bloco 10 — confirmar se há partes além do 10B (ver plano oficial)
- [ ] QA integral multissessão e em dispositivos físicos (admin, turista, segundo dono; itinerários)
- [ ] Atualizar ferramentas de desenvolvimento com avisos (`undici`, `ws`, `sharp`, `esbuild`) quando o wrangler subir

## Antes do lançamento
- [ ] Apagar ou desativar as 3 contas de teste e o negócio "EKAYA Teste — não reservar" (a conta admin de teste tem poderes reais; já estão fora das métricas)
- [ ] Decidir as 2 contas internas que ficaram (Kelvin e o 2.º admin)
- [ ] Apagar a cópia de segurança local `backups/` quando já não for precisa (tem dados pessoais)
- [ ] Ligar 2FA para os administradores
- [ ] Confirmar os números de emergência (119, 117, 198) com fontes oficiais
- [ ] Configurar o envio de emails (domínio, modelos em `docs/email-templates.md`) e os Redirect URLs do domínio final
- [ ] Juntar os branches pendentes à `main` pela ordem indicada e confirmar o CI verde
- [ ] Correr `docs/QA.md` no projeto final (incluindo os testes de BD)

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
