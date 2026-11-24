# EKAYA Explore — diagnóstico e plano de trabalho da equipa

**Equipa:** Kelvin Loforte, Tiago Antunes e Sheldon Jasse  
**Levantamento do repositório:** 9 de novembro de 2026  
**Objetivo:** organizar o desenvolvimento conjunto, explicitar o que já existe, apontar o que falta e
definir uma ordem segura para preparar, lançar e fazer crescer o EKAYA.

> Este documento é uma análise estática do repositório e da documentação versionada. Não confirma
> o estado atual do projeto Supabase/Lovable, das contas, dos fornecedores, das redes sociais, das
> definições do GitHub ou de um eventual site publicado. Onde esses estados são importantes, estão
> assinalados para confirmação pelos responsáveis.

## 1. Resumo executivo

O EKAYA já é uma aplicação com várias áreas funcionais e uma base de engenharia considerável: React
19 e TanStack Start, Supabase, regras de acesso por papel, migrações de base de dados, testes
unitários e de base de dados, CI no GitHub, Dependabot, documentação de segurança, QA de browser,
materiais comerciais e estudos de monetização.

O problema principal não parece ser falta de código ou de ideias. É a necessidade de **alinhar o
estado real do produto, da base de dados e do lançamento**, reduzir divergências entre documentos,
acordar a forma de trabalho dos três membros e executar um piloto com oferta, apoio e medição
suficientes. A documentação não deve ser interpretada como prova de que uma tarefa foi aplicada no
ambiente real.

### Prioridades propostas

1. **Confirmar o estado de lançamento e da base de dados.** O `roadmap.md` contém tarefas de
   lançamento abertas; outros documentos têm datas e estados diferentes.
2. **Acordar papéis e proteger o fluxo de alterações.** Toda a alteração deve passar por branch, PR,
   revisão e CI; as escritas na base de dados continuam sujeitas à aprovação definida pelo projeto.
3. **Atualizar a documentação de segurança e ambiente.** Há documentos que descrevem estados já
   ultrapassados, e `.env` está versionado.
4. **Fazer uma revisão independente de segurança antes de aumentar tráfego ou processar pagamentos.**
   Contratar um/a pentester com autorização e âmbito escritos — não procurar alguém para atacar o
   site em produção.
5. **Começar com um piloto delimitado e bem servido.** Confirmar oferta real, qualidade do conteúdo,
   apoio e conversão antes de investir em “começar em grande”.
6. **Melhorar o frontend com investigação e testes com pessoas.** O repositório já descreve uma
   direção visual própria; o próximo passo é validar se ela funciona para turistas e negócios, não
   simplesmente substituir a interface por outra geração automática.

## 2. Como foi analisado

Foram consultados a estrutura de código, os manifestos e configuração, as rotas, as bibliotecas de
domínio, os testes, os workflows de CI, as migrações, os guias de segurança e QA, o roadmap, os
materiais de lançamento, vendas, conteúdo e monetização.

No momento do levantamento:

- O branch local é `main` e o worktree estava limpo.
- Há muitos branches remotos, incluindo branches históricos de funcionalidades e lançamento. A
  presença de um branch remoto **não prova** que o trabalho esteja integrado, abandonado ou pronto
  para apagar.
- O inventário encontrou 41 ficheiros de rota, 40 ficheiros de teste Vitest, 64 ficheiros SQL de
  migração em `drizzle/migrations/` e 23 ficheiros SQL de teste em `supabase/tests/`.
- O GitHub Actions executa verificação de tipos, Vitest, lint, build e verificação da árvore de
  rotas. A auditoria de dependências é executada em modo de aviso e não bloqueia o CI.
- Não foram executados testes, não foi feita uma auditoria de segurança independente e não foi
  consultado o ambiente remoto da aplicação ou da base de dados.

## 3. Mapa atual do produto e arquitetura

### Funcionalidades identificadas

As rotas e os módulos cobrem:

- Descoberta de destinos, atividades comerciais, experiências comunitárias, negócios, roteiros e
  mapas.
- Autenticação, onboarding, preferências, favoritos, visitas, reservas e painéis de utilizador e
  negócio.
- Comunidade, denúncias, notificações, notícias/avisos e conteúdo de cultura e informação útil.
- Jogos, pontos, conquistas, recompensas e estatísticas agregadas de impacto.
- Administração de utilizadores, negócios, catálogo, conteúdo, reservas e funcionalidades comerciais.
- Páginas e fluxos recentes para negócios, preços/reembolsos, termos, privacidade, convites e recibos.

O visitante sem sessão tem acesso de leitura; as funcionalidades pessoais exigem conta. O conteúdo
comercial e as experiências comunitárias têm regras diferentes: atividades comunitárias gratuitas
não devem ser tratadas como reservas comerciais.

### Organização técnica

| Área                  | Estado observado no repositório                                                           |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Interface             | React 19, TypeScript estrito, Tailwind CSS 4, Radix/shadcn e componentes de domínio       |
| Navegação e servidor  | TanStack Start e TanStack Router; rotas baseadas em ficheiros                             |
| Dados                 | Supabase: Postgres, Auth, Storage, RLS e funções/RPCs                                     |
| Estado remoto         | TanStack Query, com `QueryClient` criado por router                                       |
| Mapas                 | Leaflet/React Leaflet e mosaicos externos                                                 |
| Testes                | Vitest, testes SQL auto-revertíveis e scripts de QA de browser                            |
| Qualidade contínua    | ESLint, TypeScript, build e GitHub Actions                                                |
| Operações             | Configuração Cloudflare em `wrangler.jsonc`; os documentos de lançamento também descrevem |
| publicação na Lovable |

O repositório contém mais de uma camada de histórico SQL. A orientação do projeto define
`drizzle/migrations/` como destino para migrações novas e proíbe alterações a
`supabase/migrations/`. Qualquer alteração de schema, RLS ou dados tem um processo de aprovação
mais restrito do que uma alteração normal de frontend.

### Proteções e regras de negócio importantes

O trabalho futuro deve preservar as regras registadas em [AGENTS.md](../AGENTS.md) e
[CLAUDE.md](../CLAUDE.md), incluindo:

- RLS e operações privilegiadas apenas no servidor; a service-role key nunca vai para o browser.
- Reservas e disponibilidade protegidas contra transições inválidas e concorrência.
- Decisões de aprovação de negócio através da RPC de administração.
- Pontos num ledger append-only; o cliente não atribui pontos.
- Roteiros públicos sujeitos a estado e aprovação; provas privadas e planos protegidos.
- Fotos comunitárias em Storage privado e servidas por URLs assinados.
- Dados turísticos, coordenadas, horários, preços, fotos e estatísticas não são inventados.
- Textos novos visíveis na aplicação têm de respeitar o suporte linguístico configurado.

## 4. O que já existe para a equipa usar

### Processo técnico e QA

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): checks de tipos, testes unitários, lint,
  build, árvore de rotas e auditoria de dependências em modo de aviso.
- [`.github/dependabot.yml`](../.github/dependabot.yml): atualizações semanais de dependências e
  GitHub Actions, sem merge automático.
- [docs/QA.md](./QA.md) e [`scripts/qa/README.md`](../scripts/qa/README.md): QA de browser, acessibilidade,
  idiomas, jornadas, largura de ecrã, CSP e prelaunch.
- `supabase/tests/`: testes de base de dados organizados por área; muitos são desenhados para
  reverter as alterações de teste.
- [docs/security/REVISAO.md](./security/REVISAO.md): checklist de segurança e regra de revisão de PR.
- [docs/SECURITY.md](./SECURITY.md) e [`SECURITY.md`](../SECURITY.md): auditoria documentada e canal
  privado para reportar vulnerabilidades.

### Produto, operação e negócio

- [docs/LAUNCH.md](./LAUNCH.md): procedimento detalhado de domínio, email, Auth, pré-lançamento,
  mapas e piloto.
- [docs/sales/](./sales/README.md): pitch, mensagens, guião de visita e rascunho do contrato.
- [docs/content/GUIA-CONTEUDO.md](./content/GUIA-CONTEUDO.md): recolha, verificação, importação e
  publicação de dados de negócios e atividades.
- [docs/monetizacao/ESTUDO.md](./monetizacao/ESTUDO.md): desenho de monetização, decisões de produto,
  plano técnico e questões jurídicas/contabilísticas.
- [docs/security/INCIDENTES.md](./security/INCIDENTES.md): plano de resposta a incidentes.
- [docs/DESIGN.md](./DESIGN.md): direção visual “Capulana e Índico”, componentes, tipografia,
  contraste, movimento e ordem de aplicação.

**Conclusão:** não é necessário começar do zero em PDS, segurança, marketing ou monetização. É
necessário reconciliar o que está documentado com o que foi realmente integrado, aprovado,
configurado e testado.

## 5. Lacunas e decisões em falta

As prioridades abaixo são recomendações de trabalho, não uma afirmação de que o estado remoto
continua igual ao descrito pelos documentos.

### P0 — Confirmar antes de convidar utilizadores ou publicar

1. **Estado real de lançamento.** O [roadmap](../roadmap.md) diz que a aplicação ainda não está
   publicada e lista itens por fazer. Confirmar no painel do projeto, no domínio e no branch de
   produção antes de anunciar uma data.
2. **Migrações e dados.** O roadmap está datado de 04/11, enquanto documentos de lançamento e
   segurança mencionam alterações posteriores. Confirmar no ambiente real a última migração
   aplicada, os testes de BD recentes e se os branches de lançamento foram integrados. Não aplicar
   SQL sem a aprovação explícita já exigida pelo projeto.
3. **Oferta para o piloto.** O roadmap indica como mínimo cinco negócios aprovados e cinco
   atividades ativas, mas o valor documentado na altura era um negócio e zero atividades. Confirmar
   novamente no painel. Validar também conteúdo, horários, preços, localização, fotos e autorização
   de uso.
4. **Administradores.** O roadmap aponta que faltava ativar 2FA para pelo menos um administrador.
   Confirmar todas as contas privilegiadas, o estado de `aal2` e quem mantém acessos.
5. **Operação e conformidade.** Confirmar domínio, emails, redirects do Auth, endereço de apoio,
   backups e teste de restauro. Os documentos também deixam para validação profissional temas de
   entidade/NUIT, IVA, faturação, contratos, reembolsos, pagamentos e proteção de dados.
6. **Pagamento.** Os materiais de vendas dizem que atualmente não há checkout/pagamento online de
   reservas. Os destaques têm uma proposta de pagamento manual por M-Pesa. Não anunciar pagamento
   integrado nem cobrar comissões de reservas até o fluxo e o enquadramento estarem confirmados.
7. **QA de pessoas e dispositivos.** O roadmap assinala QA multissessão e em dispositivos físicos
   por concluir. Testar com contas autorizadas de turista, negócio e admin e com telemóveis reais,
   sem alterar dados reais fora do procedimento aprovado.

### P1 — Qualidade de engenharia e manutenção

1. **Documentação divergente.** O [roadmap](../roadmap.md), [docs/SECURITY.md](./SECURITY.md),
   [docs/security/REVISAO.md](./security/REVISAO.md) e [docs/LAUNCH.md](./LAUNCH.md) não têm todos a
   mesma data ou estado. Por exemplo, alguns trechos de segurança ainda descrevem Zod 3 ou 2FA como
   pendente, enquanto `package.json` e documentos mais recentes descrevem Zod 4 e 2FA implementado.
   Manter um estado canónico e atualizar os documentos antigos.
2. **Ambiente versionado.** `.env` consta entre os ficheiros rastreados pelo Git e contém nomes de
   variáveis Supabase. Os nomes encontrados são de URL/identificadores/chaves publicáveis, mas um
   `.env` rastreado cria risco de futuras adições de segredos. Confirmar os valores sem os copiar
   para issues, relatórios ou mensagens; migrar para `.env.example` com placeholders e retirar o
   `.env` do controlo de versões através de PR. Se alguma chave secreta tiver sido publicada,
   rodá-la.
3. **Configuração GitHub.** O repositório tem CI e Dependabot, mas os ficheiros rastreados não
   incluem `CODEOWNERS`, templates de issue/PR ou `CONTRIBUTING.md`. A proteção de branch é uma
   configuração externa e não pode ser verificada pelo checkout local. Confirmar e exigir checks,
   revisão e bloqueio de force-push na `main`.
4. **Ramos remotos acumulados.** Rever cada branch remoto com o respetivo autor/PR antes de o
   integrar ou apagar. Não usar apenas “parece antigo” como critério de eliminação.
5. **Revisão de dependências/licenças.** O CI deixa a auditoria de dependências em modo aviso. O
   roadmap menciona dependências de ferramentas por atualizar, e documentos de lançamento assinalam
   uma questão de licença comercial do `react-leaflet`. Fazer revisão com versões e licenças atuais
   antes de escalar ou explorar comercialmente.
6. **Plano PWA/offline.** Existe `public/site.webmanifest`, mas define `display: "browser"` e não foi
   encontrado service worker nem cache offline no código analisado. A aplicação não deve ser
   apresentada como funcional offline sem implementar e testar esse comportamento.
7. **Medição de produção.** Há Lighthouse, prelaunch e estatísticas agregadas, mas é preciso
   decidir quais indicadores são acompanhados após o piloto, por quem e com que cadência. Evitar
   KPIs públicos sem fonte verificável.
8. **Licença do projeto.** Não foi encontrada licença de repositório na lista de ficheiros
   rastreados. Decidir com o responsável se o código é proprietário ou open source e documentar a
   decisão; não presumir licença aberta.

### P2 — Produto, frontend e crescimento

1. **Frontend e identidade.** Há uma direção visual no `docs/DESIGN.md`, mas o próprio documento
   chama-a proposta por aprovar; o roadmap, por outro lado, marca a aplicação visual como concluída.
   A avaliação estática não permite confirmar se o site parece “artificial” em uso real. Fazer
   sessões de teste e revisão visual antes de uma reformulação abrangente.
2. **Desempenho.** O roadmap registava notas móveis abaixo do objetivo em itinerários, jogos e painel,
   mais um bundle inicial elevado. Repetir Lighthouse num ambiente comparável antes de priorizar
   otimizações; os resultados antigos são uma linha de base, não o estado atual.
3. **Conteúdo pendente de validação.** O roadmap alerta para histórias/lendas da página inicial a
   validar e números de emergência a confirmar com fontes oficiais. Não reativar nem publicar esses
   dados sem confirmação.
4. **Marketing e redes sociais.** Existem materiais de venda B2B e partilha social no produto, mas
   não foi encontrado um plano de canais, calendário editorial, responsáveis por contas, política de
   resposta ou medição de campanhas. Confirmar também se as contas sociais já existem fora do Git.
5. **Monetização.** Existem decisões e implementação para comissão configurável, destaques e pedidos
   “Para negócios”; checkout de reservas depende de fornecedor e de validação legal e financeira.
   Validar preço e procura com negócios reais antes de investir em pagamentos ou subscrições.
6. **Assistente de IA.** A fase de FAQ está documentada; a fase com LLM tem estado de desligada no
   roadmap e critérios de avaliação pendentes. Não ativar apenas por estar tecnicamente preparada.

## 6. Modelo de trabalho para três pessoas

### Papéis

Não há evidência suficiente no repositório para atribuir a Kelvin ou Tiago uma especialidade
técnica. Os papéis abaixo devem ser acordados numa reunião e podem rodar; não são uma avaliação de
competências.

| Pessoa         | Papel proposto                                                                                         | Nota                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sheldon Jasse  | Responsável de produto e release; revisor final para alterações de segurança/produção                  | A documentação existente nomeia Sheldon como responsável por incidentes e revisão. Confirmar se continua a ser a decisão da equipa. |
| Kelvin Loforte | Membro de desenvolvimento; assumir a liderança de uma tarefa por ciclo, conforme experiência/interesse | Área e autoridade a combinar com a equipa.                                                                                          |
| Tiago Antunes  | Membro de desenvolvimento; assumir a liderança de uma tarefa por ciclo, conforme experiência/interesse | Área e autoridade a combinar com a equipa.                                                                                          |

Para cada tarefa, designar **uma pessoa responsável** pela implementação, **uma pessoa revisora** e
um **responsável de produto/dados** para validar o comportamento. Em equipa de três, o autor não
aprova sozinho o próprio PR. Em alterações de segurança, dados pessoais, dinheiro ou schema, a
revisão inclui Sheldon ou o responsável explicitamente designado.

### Cadência leve

- **Planeamento semanal, 30–45 min:** escolher até 3–5 entregas pequenas, atribuir responsável,
  revisor, critérios de aceitação e riscos/dependências.
- **Check-in assíncrono diário ou 2–3 vezes por semana:** feito, próximo passo, bloqueio; sem
  reuniões longas para reportar atividade.
- **Revisão semanal, 30 min:** demonstrar o que funciona, rever bugs e métricas, atualizar tarefas e
  decidir o próximo foco.
- **Release semanal, domingo (hora de Moçambique):** rever o PR de `dev` para `main`. Só integrar se
  todos os checks estiverem verdes, a validação da semana estiver concluída e alguém que não seja o
  autor aprovar. Se houver bloqueios, adiar o release; não integrar só para cumprir o calendário.
- **Revisão mensal:** segurança, dependências, backups/restauro, qualidade de conteúdo, operação e
  decisões comerciais.

Usar GitHub Issues/Projects ou outro único quadro acordado. Cada tarefa tem estado, responsável,
prioridade, critérios de aceitação e ligação ao PR. Não manter a mesma tarefa em várias folhas
independentes.

### Definition of Ready

Uma tarefa só começa quando:

- Há um problema/utilizador claramente descrito e um resultado observável.
- O escopo e o que fica fora estão claros.
- A pessoa responsável e revisora estão designadas.
- Dependências, dados necessários, riscos e tratamento PT/EN são conhecidos.
- Alterações de UI têm estados de loading, vazio e erro considerados.
- Alterações de base de dados dizem se exigem aprovação de SQL, testes SQL e rollout.

### Definition of Done

Uma tarefa está concluída quando:

- Os critérios de aceitação são satisfeitos e o fluxo funciona em português e inglês.
- Foram considerados loading, vazio, erro, validação, acessibilidade, móvel e tema claro/escuro,
  conforme aplicável.
- Os testes adequados foram executados; não se declara PASS para verificações não executadas.
- `tsc`, lint, Vitest e build passam no CI; alterações de UI relevantes recebem QA de browser.
- Alterações de RLS/RPC/schema incluem revisão de segurança e testes de base de dados, com aprovação
  explícita quando exigida.
- A documentação/roadmap relevante foi atualizada; limitações e rollout estão descritos.
- O PR foi aprovado e integrado por alguém autorizado; a tarefa e o branch são fechados após
  confirmação.

## 7. Branches, commits e pull requests

### Branch principal

- `main` é a linha estável de release; `dev` é a linha de integração e deve ser criada a partir da
  `main` atual. O trabalho normal entra primeiro em `dev`; `main` só recebe releases aprovados de
  `dev`.
- Ninguém desenvolve diretamente em `main` ou `dev`. Criar um branch por tarefa a partir de `dev`
  atualizado e abrir o PR para `dev`. Não abrir PR de trabalho diretamente para `main`.
- Não partilhar um branch de trabalho entre pessoas nem fazer force-push num branch que outra pessoa
  esteja a usar.
- Criar `dev` uma vez, apontando para o commit atual de `main`, e publicar o branch no remoto. Nas
  definições do GitHub, proteger ambos os branches: exigir PR, pelo menos uma aprovação de alguém
  que não seja o autor, checks de CI obrigatórios e conversas resolvidas; bloquear force-push e
  eliminação. Confirmar estas regras nas definições do repositório, pois não são verificáveis apenas
  pelos ficheiros locais.
- Se `dev` ainda não existir, criá-lo a partir da `main` atualizada e publicá-lo:

  ```sh
  git switch main
  git pull --ff-only origin main
  git switch -c dev
  git push -u origin dev
  ```

- Definir como convenção que PRs de trabalho têm base `dev`; o único PR normal com base `main` é o
  release semanal cujo branch de origem é `dev`. A proteção de branch, por si só, não garante que o
  branch de origem de um PR para `main` seja `dev`, por isso o revisor/maintainer deve confirmar a
  origem antes de aprovar.

### Nomes de branches

Usar nomes curtos e previsíveis:

```text
feat/<issue>-<descricao>
fix/<issue>-<descricao>
docs/<issue>-<descricao>
test/<issue>-<descricao>
chore/<issue>-<descricao>
security/<issue>-<descricao>
```

Exemplos: `feat/142-business-onboarding`, `fix/158-map-empty-state`,
`docs/171-team-workflow`. Não criar branches vagos como `new`, `changes` ou `final`.

### Fluxo de uma alteração

```sh
git switch dev
git pull --ff-only origin dev
git switch -c feat/142-business-onboarding
# alterar, testar e rever localmente
git add <ficheiros-da-tarefa>
git commit -m "feat(business): add owner onboarding"
git push -u origin feat/142-business-onboarding
```

1. Abrir PR do branch de trabalho para `dev`, ligado à Issue. Confirmar a branch base antes de
   pedir revisão.
2. Explicar motivo, mudança, evidência de testes, impacto nos dados/configuração, riscos e plano de
   reversão.
3. Pedir pelo menos uma aprovação a alguém que não seja o autor; o autor trata do feedback e mantém
   o PR atualizado.
4. Aguardar CI verde e resolver as conversas. Não desativar checks nem aprovar o próprio PR.
5. Após aprovação, um maintainer integra em `dev` pelo método acordado (squash merge é adequado
   para PRs de trabalho). Não fazer deploy ou alterações remotas por causa de um PR sem a autorização
   requerida.
6. Apagar o branch de trabalho depois da integração, verificar o resultado em `dev` e fechar a
   Issue quando os critérios de conclusão estiverem satisfeitos.

O [guia de revisão existente](./security/REVISAO.md) diz que Sheldon faz a revisão final antes do
merge e que agentes não fazem merge. Se Sheldon continuar como maintainer, deve fazer a revisão
final conforme esse guia; a aprovação obrigatória continua a ser de alguém que não seja o autor.
A decisão humana de merge e a restrição de um agente não devem ser confundidas.

### Release semanal: `dev` para `main`

1. No domingo, no fuso `Africa/Maputo`, confirmar que as alterações em `dev` estão concluídas,
   testadas e prontas para release. A cadência é semanal, mas não sobrepõe um bloqueio de qualidade.
2. Abrir um PR de `dev` para `main` com resumo das alterações, resultados de CI/QA, migrações ou
   configuração envolvidas, riscos conhecidos e plano de reversão.
3. Confirmar que todos os checks obrigatórios passaram, as conversas estão resolvidas e pelo menos
   uma pessoa diferente do autor aprovou o PR.
4. Um maintainer autorizado integra o PR. Usar **merge commit** neste PR de release para preservar
   a relação entre `dev` e `main`; não usar squash nem rebase no release.
5. Confirmar o resultado em `main` e executar/publicar o deploy apenas segundo o processo de release
   autorizado. Fechar o PR e registar o release.

Não criar um branch de release permanente nem integrar PRs de funcionalidades diretamente em
`main`. Se a validação falhar ou a aprovação não chegar no domingo, manter `main` como está e fazer o
release quando os bloqueios forem resolvidos.

### Commits e tamanho do trabalho

- Uma alteração lógica por commit; preferir mensagens no estilo Conventional Commits (`feat:`,
  `fix:`, `docs:`, `test:`, `chore:`).
- Não incluir segredos, credenciais, dados pessoais, backups ou outputs de QA.
- Dividir tarefas grandes em PRs pequenos que possam ser revistos e revertidos.
- Evitar que dois PRs alterem simultaneamente a mesma migração, fluxo de reservas ou componente
  partilhado sem combinar a ordem.
- Seguir a convenção do projeto de migrações numeradas e journal/snapshot. Não renumerar migrações
  já integradas.

## 8. Revisão técnica e padrões de desenvolvimento (PDS)

O EKAYA já tem uma base de PDS implementada: branches/PRs, CI, lint, TypeScript estrito, Vitest,
tests SQL, QA browser, Dependabot, checklist de segurança, processo de revisão e guias de domínio.
Isto é mais sólido do que iniciar um fluxo informal; o passo seguinte é tornar os requisitos
obrigatórios e conhecidos pelos três membros.

### Checklist normal de PR

- [ ] Issue, objetivo, critérios de aceitação e responsável/revisor ligados.
- [ ] PR pequeno, com descrição, capturas para UI e instruções de teste.
- [ ] `bunx tsc --noEmit`
- [ ] `bunx vitest run`
- [ ] `bun run lint`
- [ ] `bun run build`
- [ ] QA de browser adequada; verificar PT/EN, temas, móvel e acessibilidade quando aplicável.
- [ ] Sem segredos, dados pessoais, alterações geradas ou dependências não justificadas.
- [ ] Atualizar documentação, ficheiros de créditos/licenças e roadmap, quando necessário.

### Checklist adicional para dados e segurança

- [ ] Validar entrada no servidor; validação só no formulário não é suficiente.
- [ ] Preservar RLS e usar os padrões existentes de auth/server functions/RPC.
- [ ] Alterações SQL têm revisão, plano de rollback, testes e aprovação antes de aplicação.
- [ ] Nunca usar produção para testes destrutivos; usar dados/contas autorizadas e de teste.
- [ ] Service role, tokens e secrets apenas no secret store do servidor.
- [ ] Novas origens browser são revistas na CSP e no QA.
- [ ] Reservas, pontos, preços, pagamentos e aprovações mantêm invariantes e trilho de auditoria.
- [ ] Não introduzir dependências sem avaliar necessidade, manutenção e licença.

Não criar um segundo framework de processo pesado. Um quadro Kanban com limites de trabalho em
curso, critérios de pronto/concluído e os gates atuais é suficiente para a equipa neste estágio.

## 9. Segurança independente e pentest ético

O repositório já tem [política de reporte](../SECURITY.md), uma auditoria interna em
[docs/SECURITY.md](./SECURITY.md), checklist em [docs/security/REVISAO.md](./security/REVISAO.md) e
plano de incidentes. Estes documentos demonstram trabalho prévio, mas **não substituem um pentest
independente nem certificam a aplicação como segura**.

### Perfil a contratar

Procurar um/a profissional ou empresa de segurança aplicacional com experiência comprovável em:

- OWASP ASVS e testes de aplicações web/API;
- Supabase/Postgres RLS, Storage policies e funções privilegiadas;
- autenticação, recuperação de conta, MFA, sessão e redirecionamentos;
- autorização horizontal/vertical, uploads, rate limits e abuso de endpoints;
- revisão de código TypeScript/React e configuração Cloudflare/Lovable.

Pedir referências, metodologia, exemplo de relatório sanitizado, condições de confidencialidade e
proposta de reteste. Certificações podem ajudar a avaliar, mas não substituem experiência demonstrada.
Não contratar alguém só com base na promessa de “hackear”.

### Regras do teste

1. Acordo escrito do responsável legal, âmbito, datas, domínios/IPs, contas e limites.
2. Preferir staging isolado e dados sintéticos; nunca testar sistemas de terceiros ou production sem
   autorização específica.
3. Proibir exfiltração de dados reais, persistência, indisponibilidade, engenharia social e
   destruição/alteração de dados.
4. Definir contacto de emergência, janela de teste e procedimento de interrupção.
5. Receber relatório com severidade, impacto, evidência mínima, reprodução segura, recomendações e
   reteste; não publicar vulnerabilidades antes de corrigir e acordar divulgação.
6. Criar uma Issue privada por finding, atribuir responsável e prazo de acordo com severidade,
   corrigir e verificar com testes; notificar conforme orientação jurídica.

### Âmbito recomendado

Autenticação e MFA; autorização de contas turista/negócio/admin; RLS/RPC e `SECURITY DEFINER`;
Storage privado e links assinados; reservas e concorrência; fluxos de aprovação; uploads; CSP e
headers; redirecionamentos e callback de Auth; abuso/rate-limits; exposição de dados e logs; e
dependências/runtime. O relatório deve dizer o que foi testado e o que ficou fora.

## 10. Refinar o frontend sem perder a identidade

“Parece feito por IA” é uma hipótese de experiência visual, não um diagnóstico objetivo. A direção
“Capulana e Índico”, as fontes locais, fotografias com crédito, regras de contraste e os limites a
gradientes/animações já estão documentados. Antes de reescrever páginas:

1. Escolher 5–8 percursos prioritários: home, pesquisa, mapa, atividade, reserva, comunidade,
   página para negócios e painel.
2. Fazer sessões curtas com turistas e negócios locais; pedir às pessoas para completar tarefas sem
   ajuda e observar onde hesitam.
3. Guardar capturas comparáveis em móvel e desktop, PT e EN, temas claro e escuro.
4. Registar problemas por evidência: compreensão, confiança, densidade, consistência,
   acessibilidade, desempenho ou falta de conteúdo.
5. Rever primeiro sistema visual e hierarquia (espaço, tipografia, fotografia, navegação e estados),
   não decorar mais os cartões. Preservar a marca e fotografias legítimas.
6. Fazer protótipos de uma secção de cada vez e comparar com pessoas; priorizar conversão e clareza
   antes de animações.
7. Validar WCAG/axe, teclado, contraste, `prefers-reduced-motion`, 320–1440 px, PT/EN e Lighthouse.
8. Medir a mudança e manter ou reverter conforme os resultados.

Não acrescentar fotografia turística sem licença/crédito, texto genérico que invente factos,
gradientes ou animação decorativa. Cumprir [docs/DESIGN.md](./DESIGN.md) ou aprovar formalmente uma
atualização desse guia antes de o contradizer.

## 11. Marketing, redes sociais e crescimento

### O que já existe

Há uma página “Para negócios”, fluxo de pedidos, materiais de pitch/WhatsApp/visita e um guia de
conteúdo para registar negócios. O produto suporta links/partilha, mas isso não equivale a uma
estratégia de redes sociais ou aquisição.

### Plano de arranque

1. **Escolher um piloto operacional.** Os documentos apontam Maputo e Inhambane (incluindo Tofo e
   Vilankulo). Confirmar que estas regiões ainda são a escolha certa e concentrar-se nelas até haver
   oferta real e apoio para responder.
2. **Preparar a oferta antes de promover procura.** Completar perfis e atividades aprovados, fotos
   autorizadas, preços, disponibilidade e contactos. Fazer onboarding presencial/WhatsApp a alguns
   negócios e acompanhar se conseguem gerir o painel.
3. **Definir identidade social.** Confirmar nome/handles, descrição, URL oficial, email de acesso,
   recuperação, MFA e pelo menos dois administradores autorizados das contas sociais.
4. **Criar calendário realista.** Por exemplo, 2–3 publicações semanais e stories quando há conteúdo
   verificado: negócio local, roteiro validado, dica útil e testemunho apenas com consentimento.
   Adaptar formatos a Facebook, Instagram, TikTok ou WhatsApp Business depois de confirmar onde
   estão os públicos, em vez de abrir todos os canais sem capacidade de manter.
5. **Estabelecer política editorial.** Consentimento para imagem e testemunho; créditos/licenças;
   revisão de factos; PT e EN quando fizer sentido; responder com transparência a preços,
   disponibilidade e patrocínio; nunca prometer reservas pagas online se não existirem.
6. **Criar links/campanhas identificáveis** e acompanhar visitas, pedidos de negócio, atividades
   visualizadas, reservas iniciadas/concluídas e custo por aquisição quando medidos legalmente.
   Usar agregados e consentimento adequados; não expor PII em dashboards ou campanhas.
7. **Rever mensalmente** o que gera conversas qualificadas e visitas/reservas reais. Parar canais que
   não produzem resultado e concentrar recursos nos que funcionam.

“Começar em grande” deve significar **experiência consistente e oferta credível**, não uma campanha
de tráfego maior do que a capacidade do catálogo e do apoio. A expansão geográfica deve acontecer
quando a zona piloto consegue manter dados certos, responder aos clientes e resolver problemas.

## 12. Monetização responsável

O [estudo de monetização](./monetizacao/ESTUDO.md) regista uma proposta de perfil básico grátis,
comissão, destaques pagos, plano Parceiro e programa Fundador; também regista que checkout de
reservas depende de integração, pagamentos, reembolsos e decisões legais/contabilísticas.

Princípios para continuar:

- Distinguir receita implementada, receita operável manualmente e receita apenas desenhada.
- Validar disposição para pagar com negócios reais, antes de investir em mais infraestrutura.
- Tornar comissão, preço, taxa, duração, reembolso e natureza patrocinada visíveis antes da compra.
- Não vender posição patrocinada sem rótulo claro; preservar relevância orgânica e limites.
- Não custodiar dinheiro de terceiros nem ativar checkout sem fornecedor, contrato, reconciliação,
  fluxo de reembolso e parecer jurídico adequados.
- Consultar advogado/contabilista sobre entidade, NUIT, IVA, faturação, turismo, consumidor,
  publicidade, dados e pagamentos em Moçambique.
- Fazer um piloto comercial com poucos negócios, registar adesão, renovação, conversão e custos
  efetivos; não usar estimativas como resultados.

## 13. Plano de execução sugerido

As fases são gates de trabalho: avançar só quando as evidências forem registadas. Podem ser
ajustadas na primeira reunião da equipa.

| Fase                     | Entrega                                                                                                                                                                   | Responsável                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0. Alinhamento           | Acordar owner/reviewer, proteção de `main`, quadro único, ambiente, canais de comunicação e data-base do estado do produto                                                | Os três; Sheldon confirma decisões de release existentes         |
| 1. Reconciliação         | Conferir branch/PRs, migrações realmente aplicadas, release status, negócios/atividades, 2FA, domínio, email e pendências de roadmap; atualizar documentos contraditórios | Um responsável técnico + Sheldon para estado de negócio/operação |
| 2. Higiene e gates       | Proteger `.env`, confirmar branch rules, criar templates de Issue/PR e `CONTRIBUTING` se a equipa concordar; rever dependências/licenças                                  | Responsável técnico designado                                    |
| 3. Gate de lançamento    | Completar condições de [docs/LAUNCH.md](./LAUNCH.md), executar QA em ambiente autorizado, backup/restauro e ensaio de suporte                                             | Sheldon/release owner + equipa                                   |
| 4. Pentest e correções   | Selecionar pentester, aprovar scope, testar ambiente isolado, corrigir findings e fazer reteste                                                                           | Sheldon autoriza; técnico coordena correções                     |
| 5. Piloto de experiência | Testes de usabilidade, mobile, acessibilidade e correções de frontend com evidência                                                                                       | Um dev por PR; pessoa não autora valida                          |
| 6. Piloto comercial      | Onboarding de oferta, conteúdos e primeira campanha social; medir pedidos e uso real                                                                                      | Owner comercial/conteúdo a nomear                                |
| 7. Crescimento/receita   | Expandir zonas, canais ou monetização apenas com métricas e capacidade operacional suficientes                                                                            | Decisão conjunta baseada em resultados                           |

### Primeiras duas semanas de trabalho

1. Fazer reunião de alinhamento de até 90 minutos e decidir responsáveis e políticas.
2. Verificar no GitHub quais branches remotos têm PR aberto, foram integrados ou podem ser
   arquivados; não apagar nenhum sem confirmação.
3. Conferir no Supabase/Lovable a última migração aplicada e o painel de estado do lançamento.
4. Atualizar o roadmap e os documentos de segurança para um estado canónico, com data e fonte.
5. Confirmar backlog P0 e executar apenas os bloqueadores comprovados.
6. Agendar avaliação de segurança independente e primeiras sessões de teste de interface, sem
   executar teste intrusivo nem recolher dados de clientes sem autorização.

## 14. Decisões que a equipa deve tomar

- Quem é o maintainer e quem pode aprovar/integrar PRs?
- Quem é o responsável técnico por deploy, secrets, backups e recuperação?
- A aplicação será publicada pela Lovable, Cloudflare ou por outro processo? Qual documento é fonte
  de verdade para deploy e ambientes?
- Quais branches remotos ainda têm trabalho válido, e qual é a regra para os arquivar?
- Quem mantém o catálogo, contactos de negócio, créditos de foto e calendário social?
- Qual região, público e objetivo mensurável definem o piloto?
- Quais redes sociais serão realmente mantidas, com que cadência e quem responde a mensagens?
- Qual monetização vai ser testada primeiro e quais validações legais/financeiras a bloqueiam?
- Qual orçamento e âmbito são autorizados para o pentest independente?
- O projeto quer manter o código privado ou publicar uma licença explícita?
- O app deve mesmo funcionar offline? Se sim, quais páginas/dados podem ser guardados e como
  proteger dados pessoais em dispositivos partilhados?

## 15. Referências internas

- [README do projeto](../README.md)
- [Regras de domínio](../AGENTS.md)
- [Orientações para desenvolvimento](../CLAUDE.md)
- [Roadmap](../roadmap.md)
- [Guia de lançamento](./LAUNCH.md)
- [Guia de QA](./QA.md)
- [Auditoria de segurança](./SECURITY.md)
- [Revisão de código e checklist de segurança](./security/REVISAO.md)
- [Política de reporte de vulnerabilidades](../SECURITY.md)
- [Plano de resposta a incidentes](./security/INCIDENTES.md)
- [Direção visual](./DESIGN.md)
- [Estudo de monetização](./monetizacao/ESTUDO.md)
- [Materiais de vendas](./sales/README.md)
- [Guia de conteúdo](./content/GUIA-CONTEUDO.md)
