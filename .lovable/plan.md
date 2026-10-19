# Bloco 9B — Estatísticas e impacto verificável

## O que encontrei (verificado agora)

- `/impact` (`src/routes/impact.tsx`) mostra só números inventados: "$2.1M" de receita, "342 artesãos", "15 comunidades", "89% satisfação", subidas como "+18%" e "vs mês anterior", e percentagens por província (Maputo 34%, Inhambane 28%…). A página tem ligações a partir da Home, do Painel e do menu lateral.
- `src/routes/useful-info.tsx:186` diz "85% beneficia comunidades", um número também inventado.
- O Admin já mostra totais reais (8E.4, `getAdminSummary`). Não lhe vou mexer, exceto para pôr uma ligação para as novas estatísticas.
- Valores reais na base de dados neste momento: 6 destinos, 8 atividades ativas, 9 negócios aprovados, 2 reservas (0 concluídas), 17 perfis, 34 roteiros públicos aprovados, 54 experiências comunitárias aprovadas, 0 publicações na comunidade, 0 roteiros concluídos, 0 provas de paragem, 0 visitas a destinos.
- Não há tabela de pagamentos. `total_mzn` é só o preço calculado na altura da reserva, não um valor recebido.
- Não há tabela de avaliações de satisfação. `experiences.rating`/`reviews` não vêm de avaliações verificadas.
- Não há histórico guardado dos totais. Só existem as datas `created_at` de cada registo.

## O que vou construir

1. **A página `/impact` passa a ter duas secções bem separadas**
   - **Métricas da plataforma** (o que existe no catálogo): destinos publicados, atividades ativas de negócios aprovados, negócios aprovados, experiências comunitárias aprovadas, roteiros públicos aprovados, contas registadas e reservas registadas (com a divisão por estado).
   - **Impacto verificado** (o que de facto aconteceu): reservas concluídas, número de pessoas nessas reservas, negócios com pelo menos uma reserva concluída, roteiros concluídos e paragens com prova fotográfica. Cada número vem acompanhado da regra que o comprova, por exemplo "estado = concluída e data já passada". Com zero, aparece uma mensagem honesta, por exemplo "Ainda não há reservas concluídas", e não um 0 enfeitado.
   - Pendentes, confirmadas futuras, rejeitadas e canceladas nunca contam como turismo realizado.
   - **Sem dinheiro:** não mostro receita. Explico que não existem pagamentos registados.
   - **Sem percentagens de satisfação nem crescimento:** retiro os "+X%" e o "vs mês anterior". Não existem dados que os sustentem.
   - **Distribuição por província:** uso contagens reais, por exemplo atividades e reservas concluídas por província. Com zero, mostro uma mensagem honesta em vez de barras.
   - **Atualização:** cada secção mostra "Dados de: <data/hora>" e de onde vêm os números ("Base de dados Ekaya, contagem em tempo real").
   - **Evolução no tempo:** opcional. Seria só "registos criados por mês" a partir de `created_at`, com nota de que não é um histórico de estados. Por defeito fica de fora (ver Dúvidas).
   - Mantenho os cartões "Áreas de impacto" (sem números) e o texto descritivo.
2. **Informações Úteis:** substituo "85% beneficia comunidades" por um texto sem números, em PT e EN.
3. **Admin:** só uma ligação para `/impact`. Não volto a construir os totais que já lá estão.

## Privacidade e permissões

- Cria-se uma função de leitura na base de dados que devolve apenas totais (nunca linhas, nomes, emails ou IDs de turistas). Pode ser chamada por visitantes e contas, e fica protegida contra alterações.
- Os grupos por província só aparecem com contagem ≥ 1. Opção: esconder grupos com 1 ou 2 reservas para não identificar ninguém (ver Dúvidas).
- As regras de acesso atuais (RLS) não mudam e não se abre leitura direta de `bookings` ou `profiles`.

## Detalhes técnicos

- Migration nova `0027_public_impact_stats_9b.sql`: função `public.platform_impact_stats()` `STABLE SECURITY DEFINER`, `search_path=public`, que devolve `jsonb` só com contagens e um `generated_at`. Regras:
  - atividades: `active` e `commercial_activity_public(business_id)`;
  - roteiros: `is_public` + `status='active'` + `review_status='approved'`;
  - concluídas: `status='completed'` e `date+time <= now()` (Moçambique);
  - comunidade: `status='approved'`;
  - provas: `route_stop_progress` com `photo_path`.
  - `GRANT EXECUTE` a anon e authenticated. Não muda tabelas nem dados.
- `src/lib/impact-stats.ts`: tipo, `queryOptions` (`['impact-stats']`), chamada RPC e uma função pura `deriveImpactView` que decide entre "vazio" e "verificado".
- `src/lib/impact-stats.test.ts`: um teste por regra. Pendente, cancelada ou rejeitada não contam como concluída; concluída com data futura não conta; sem pagamentos não há métrica de receita; zero dá estado vazio.
- `src/routes/impact.tsx`: tiro `KPIS`/`PROVINCES`/`useCounter` fictícios e leio com loader `ensureQueryData` + `useSuspenseQuery`. Incluo estados de carregamento, erro com "Tentar novamente" e vazio. Uso tokens de tema (claro/escuro) no lugar de cores fixas. Textos novos em `LanguageContext.tsx` (PT/EN). Mantenho o head() com título e descrição únicos.
- `src/routes/useful-info.tsx`: troco uma linha de texto.
- `src/routes/admin.tsx`: um botão de ligação.
- Documentação: `AGENTS.md` (uma regra: impacto público só vem da RPC agregada, sem números fixos), `EKAYA_FIXES.md` e `roadmap.md`.

## Validação

- Vitest: os testes novos e os 20 existentes passam. O build passa.
- SQL: cada número da RPC confere com um `count(*)` direto feito por mim. Contagens antes/depois iguais nas 5 tabelas, sem escrever dados.
- Visitante sem sessão: `/impact` carrega e a resposta não contém nenhum id, nome nem email.
- Pesquisa no código: deixam de existir `$2.1M`, `342`, `89%`, `+18%`, `vs mês anterior` e `85%`.
- Playwright: 1280px e 390×844 × PT/EN × claro/escuro, sem nada a sair do ecrã e sem erros. Confirmo os estados vazios com os dados atuais (0 concluídas).
- Fluxo comercial, reservas e Admin continuam a funcionar.

## Fora do âmbito

Pagamentos, avaliações, histórico de estados e os blocos 10–15. Não publico.

## Dúvidas (sem resposta, aplico o que está em negrito)

1. Mostrar "registos criados por mês"? **Não**, para evitar parecer uma série histórica.
2. Esconder contagens por província inferiores a 3? **Sim**, só na secção de impacto verificado.
3. "Contas registadas" inclui as contas QA/admin? **Mostro o total real, com nota de que inclui contas internas**. Não há marcação de contas de teste no schema.
