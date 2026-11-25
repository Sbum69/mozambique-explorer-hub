# Briefing para o advogado — EKAYA Explore

Documento para entregar a um advogado. Só tem **factos lidos no código e na documentação do
repositório** e **perguntas**: não contém opinião jurídica. Estado a 25/11/2026.

Fontes principais:

- Termos de Utilização e Política de Privacidade, versão 2026-11-23 (`src/lib/legal/terms.ts`,
  `src/lib/legal/privacy.ts`);
- `docs/legal/SUBCONTRATANTES.md` e `docs/legal/ENCARREGADO-PROTECAO-DADOS.md`;
- `docs/monetizacao/ESTUDO.md`;
- as migrações da base de dados (`drizzle/migrations/`).

## 1. O que é o EKAYA

- Aplicação web de **turismo comunitário em Moçambique**, em português e inglês, para turistas,
  negócios locais, comunidade e administração.
- Turistas: veem destinos, atividades de negócios locais, roteiros e um mapa; fazem **pedidos de
  reserva**; ganham **pontos** com atividades e jogos e trocam-nos por **recompensas** oferecidas
  pelos negócios; publicam na comunidade.
- Negócios: têm perfil e atividades, recebem e decidem pedidos de reserva, criam recompensas e
  podem pedir **destaques** pagos.
- Entidade: "EKAYA", **em constituição**, NUIT por atribuir, responsável Sheldon Jasse, Moçambique
  (`src/lib/app-info.ts`, `LEGAL_ENTITY`). Contacto: `apoio@exploreekaya.com`.
- Destina-se a maiores de 18 anos (Política, secção 9).

## 2. Modelo de negócio

- **Como o CEO o descreve:** listagem gratuita durante um período e, depois, uma taxa simbólica.
- **O que os textos em vigor dizem** (Termos §5 e página Preços e reembolsos):
  - hoje o EKAYA é **grátis** para turistas e o perfil básico é grátis para negócios;
  - o EKAYA **poderá** cobrar aos negócios:
    - uma **comissão sobre reservas pagas na aplicação** (não existe pagamento na app hoje);
    - **destaques patrocinados**, pagos por **M-Pesa fora da app**, com referência e comprovativo;
    - um **plano opcional**.
  - **Parceiro Fundador**: os primeiros negócios têm comissão reduzida durante alguns meses e
    destaques grátis. Os valores estão na base de dados (Admin → Comissão e preços), não no código.
  - "Nada é cobrado sem aviso prévio e sem o negócio aceitar."
- **Reservas:** o turista faz um pedido; o negócio confirma ou rejeita. **O pagamento não é feito
  na aplicação: combina-se diretamente com o negócio.** O EKAYA não recebe dinheiro das reservas.
- **Recibo dos destaques:** a app emite um "documento não fiscal"; não substitui fatura.

## 3. Dados pessoais tratados

Inventário completo na Política, secções 2 a 6. Tabelas da base de dados com dados pessoais (schema
em `src/integrations/supabase/types.ts`):

| Tabela                                                                    | Dados                                                                                   | Finalidade                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `auth.users` (Supabase Auth)                                              | email, palavra-passe cifrada, metadados do registo                                      | conta e login                                   |
| `profiles`, `profile_provinces`, `user_roles`                             | nome a mostrar, foto, telefone (opcional), preferências, papel, marca de conta interna  | conta e personalização                          |
| `bookings`                                                                | nome, telefone, email, notas, data, horário, pessoas                                    | enviar o pedido ao negócio                      |
| `businesses`                                                              | dados e contactos que o dono publica; dono (conta)                                      | perfil público do negócio                       |
| `business_leads`                                                          | nome e contacto de quem pede adesão; código diário derivado do IP (sem o IP)            | contacto comercial e limite de abuso            |
| `community_posts`, `community_post_reactions`, `community_reports`        | publicações, fotos, reações, denúncias                                                  | comunidade e moderação                          |
| `route_progress`, `route_stop_progress`, `game_steps`, `game_completions` | progresso, fotos de prova, respostas                                                    | roteiros, jogos e pontos                        |
| `points_ledger`, `reward_redemptions`                                     | pontos (só se acrescentam linhas), resgates e códigos de voucher                        | pontos e recompensas                            |
| `favorites`, `destination_visits`, `news_likes`, `event_participations`   | escolhas do utilizador                                                                  | funcionalidades da conta                        |
| `notifications`                                                           | avisos ao utilizador                                                                    | informar sobre reservas e conta                 |
| `legal_acceptances`                                                       | versão e data de aceitação dos Termos e da Política                                     | prova de aceitação                              |
| `sponsored_placements`                                                    | referência, datas, valor, comprovativo M-Pesa                                           | destaques pagos                                 |
| `admin_audit`                                                             | ações dos administradores                                                               | segurança e prova de decisões                   |
| `assistant_unanswered`, `app_errors`                                      | perguntas sem resposta (emails e números escondidos) e erros técnicos, sem conta nem IP | melhorar o assistente; corrigir erros (30 dias) |

- **Localização:** só com permissão do dispositivo, para o mapa e para provas de local. As
  coordenadas do turista **não são guardadas** (0038); a prova confirma só se estava perto.
- **Direitos:**
  - exportar dados e apagar conta em Definições → Privacidade;
  - ao apagar a conta, se houver reservas ou outros registos, a conta é **anonimizada** em vez de
    apagada (0046, 0048).
- **Contas internas** (de teste e da equipa) estão marcadas e fora das estatísticas (0047).

## 4. Subcontratantes e serviços externos

Fonte: `docs/legal/SUBCONTRATANTES.md` e Política §4.

| Serviço                     | Papel                                                                       | Dados                                                  | Notas do repositório                                              |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Lovable (Lovable Cloud)     | alojamento da app e da base de dados                                        | todos os dados da app e registos de acesso             | DPA só nos planos Business/Enterprise **[DECIDIR]**               |
| Supabase                    | base de dados, autenticação, ficheiros (por trás da Lovable Cloud)          | idem                                                   | —                                                                 |
| Cloudflare                  | rede e execução da app (alojamento); DNS e encaminhamento do email `apoio@` | registos de acesso; emails recebidos em `apoio@`       | —                                                                 |
| Email de autenticação       | emails de confirmação e recuperação (Lovable/Supabase)                      | email do utilizador                                    | fornecedor SMTP próprio ainda não escolhido (`docs/LAUNCH.md` §2) |
| OpenStreetMap               | mosaicos do mapa, pedidos feitos pelo browser                               | IP e área do mapa vista                                | sem garantias de serviço                                          |
| Esri / ArcGIS (opcional)    | mosaicos e satélite, só com chave configurada                               | IP e área do mapa                                      | EUA                                                               |
| MET Norway (api.met.no)     | meteorologia, **pedida pelo servidor**                                      | só coordenadas dos destinos, nenhum dado de utilizador | substituiu a Open-Meteo, retirada a 07/11/2026                    |
| Google Maps / OpenStreetMap | "Abrir no Google Maps" de um roteiro: link que o turista abre               | o que o turista enviar a esse site                     | a app não calcula rotas (o OSRM foi retirado)                     |

- Não usados: Google Fonts, bancos de imagens, ferramentas de análise, publicidade, pagamentos na
  app, IA generativa.

## 5. Outros pontos que o advogado deve conhecer

- **Pontos e recompensas:**
  - ganham-se pontos com reservas concluídas, provas em roteiros, jogos e quizzes;
  - os negócios criam recompensas (qualquer produto ou serviço), que o turista troca por pontos e
    recebe com um voucher que o negócio valida uma vez;
  - **sem dinheiro**: não se compram pontos;
  - hoje as recompensas não exigem aprovação prévia do admin (`docs/RECOMPENSAS.md`, no branch
    `feat/suporte-recompensas`).
- **Moderação:**
  - publicações da comunidade com denúncias;
  - experiências comunitárias e roteiros submetidos são revistos pelo admin antes de ficarem
    públicos;
  - o admin pode suspender negócios e desativar recompensas;
  - as ações de admin ficam no `admin_audit`.
- **Cookies e armazenamento local** (Política §10):
  - cookie `ekaya.lang` (idioma, 1 ano);
  - `localStorage`: a sessão da Supabase (`sb-…-auth-token`), `ekaya.lang`, `ekaya.theme`,
    `ekaya.recovery` e `ekaya.storage-notice`;
  - `sessionStorage`: `ekaya.guest-mode` e `ekaya.visitor-choice`;
  - migração única de `ekaya_favorites`, favoritos antigos que passam para a conta.
  - Sem cookies de análise ou publicidade, e por isso a Política não pede consentimento. Há um
    aviso de armazenamento no primeiro acesso.
  - **Diferença encontrada:** `ekaya.visitor-choice` (`src/lib/visitor-choice.ts`, apagado ao
    fechar o separador) **não consta** da tabela da Política §10.
- **Assistente de ajuda:** responde só a partir das perguntas frequentes (FAQ), sem IA generativa
  (`ASSISTANT_LLM_ENABLED = false`). Se um dia usar IA, a Política diz que o fornecedor será indicado
  antes.
- **Aceitação dos textos:** no registo e, quando muda a versão, num ecrã que bloqueia a app até
  aceitar (`LegalAcceptanceGate`). Fica registada a versão e a data.
- **Licença do react-leaflet:** a biblioteca do mapa usa a "Hippocratic License", que não é uma
  licença de código aberto reconhecida pela OSI e tem cláusulas éticas
  (`docs/legal/SUBCONTRATANTES.md`).

## 6. Perguntas ao advogado

### Proteção de dados (RGPD e lei moçambicana)

1. Que lei de proteção de dados se aplica hoje em Moçambique? (`docs/monetizacao/ESTUDO.md` não
   encontrou a aprovação da proposta de lei até agosto de 2026.)
2. Com utilizadores da UE, o RGPD aplica-se ao EKAYA? É preciso representante na UE (art. 27.º)?
3. Que autoridade de controlo é competente (a CNPD portuguesa ou outra) e em que casos notificar
   (`docs/security/INCIDENTES.md` prevê 72 horas)?
4. As bases legais da Política §3 estão certas para cada finalidade?
5. Os prazos de conservação da Política §6 servem (sobretudo comprovativos e auditoria)?
6. É preciso um DPO formal (`docs/legal/ENCARREGADO-PROTECAO-DADOS.md`)?
7. A idade mínima de 18 anos com autorização dos pais está bem formulada?
8. Armazenamento estritamente necessário sem pedido de consentimento: está correto? É preciso
   acrescentar `ekaya.visitor-choice` à tabela da Política §10 (com nova versão do texto)?

### Licença de atividade, RNAVT e intermediação

9. O EKAYA é intermediação turística ou agência de viagens à luz da lei do turismo de Moçambique?
   Precisa de licença ou registo?
10. O RNAVT (registo português de agências de viagens) aplica-se, ou existe um equivalente em
    Moçambique?
11. Quem responde perante o turista pela execução da atividade, o negócio ou o EKAYA? Os Termos
    dizem que é o negócio: chega?

### Seguro

12. O EKAYA precisa de seguro de responsabilidade civil? E os negócios parceiros devem ter seguro
    das atividades, como condição de adesão?

### Banco de Moçambique e pagamentos

13. Receber destaques por M-Pesa numa conta do EKAYA, fora da app, exige alguma autorização?
14. Se no futuro houver pagamento de reservas na app com divisão (split) para o negócio, o EKAYA
    passa a prestar um serviço de pagamento (Lei 15/2026)?

### Prémios e recompensas

15. Os pontos trocados por produtos ou serviços dos negócios são um concurso, sorteio ou promoção
    regulada? É preciso regulamento ou autorização?
16. Quem é responsável se o negócio não entregar a recompensa? Deve haver uma cláusula nos Termos e
    no acordo de parceiro?
17. Os pontos têm valor patrimonial? Podem expirar? O que acontece aos pontos ao apagar a conta?

### Termos do parceiro (negócios)

18. Rever o rascunho `docs/sales/contrato-parceiro.md`:
    - comissão, Parceiro Fundador e destaques;
    - conteúdos e fotografias;
    - reservas e responsabilidade;
    - dados pessoais (quem é responsável pelos dados das reservas que o negócio recebe);
    - saída;
    - lei e foro.
19. Reembolso dos destaques: o prazo de 14 dias está marcado "a confirmar com o jurista"
    (`src/lib/pricing-texts.ts`).

### Subcontratantes e DPAs

20. Sem DPA da Lovable no plano atual: os Termos da Lovable chegam, ou é preciso o plano com DPA?
21. As transferências para fora de Moçambique e da UE (Supabase, Cloudflare, Esri) estão cobertas
    pelas cláusulas contratuais-tipo dos DPA?

### Entidade legal e NUIT

22. Que forma jurídica escolher e o que muda nos Termos e na Política enquanto a empresa está "em
    constituição"?
23. Os destaques podem ser cobrados antes do NUIT? Que faturação é obrigatória (com o contabilista)?

### Licenças de software

24. A Hippocratic License do react-leaflet permite o uso comercial do EKAYA?
