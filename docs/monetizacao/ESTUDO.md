# Monetização do EKAYA — Fases 1 a 3 (auditoria, desenho, plano)

Estado: **decisões 1–9 tomadas a 30/10/2026** (secção 4); o resto é proposta. Nenhum código, migração, dado ou configuração foi alterado.
Data da pesquisa: 30/10/2026.

Marcas usadas em todo o documento:

- **[F]** facto verificado, com fonte;
- **[I]** inferência minha;
- **[H]** hipótese a testar (valor configurável no admin);
- **[Q]** questão em aberto (perguntar ao fornecedor, ao contabilista ou ao advogado);
- **[D]** decisão tua.

Ficheiros que acompanham este estudo:

- `docs/finance/ekaya-modelo-financeiro.xlsx`: modelo com fórmulas, 3 cenários, ponto de equilíbrio, exemplos A/B/C e custo da IA;
- `docs/monetizacao/emails-fornecedores.md`: perguntas prontas a enviar.

---

## 1. Auditoria (só leitura)

Os 5 branches do pré-lançamento ainda **não estão na `main`** (`git rev-list origin/main..origin/design/design-1` = 34 commits).
A base de dados já tem as migrações deles aplicadas (0000–0048).

| Requisito                                           | Evidência                                                                                                                                                                                   | Ficheiro / origem                                                                     | Estado         | Implicação                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estados da reserva                                  | `booking_status`: pending, confirmed, rejected, cancelled, completed, no_show                                                                                                               | `drizzle/migrations/0036_booking_status_no_show.sql`, `types.ts`                      | confirmado     | O pagamento fica num estado próprio, ligado à reserva; não se acrescentam estados à reserva                                                        |
| Validação na criação                                | `bookings_validate_insert`: código gerado no servidor, estado forçado a `pending`, data não passada, atividade ativa, negócio certo, bloqueio por horário, capacidade                       | função na BD (lida a 30/10)                                                           | confirmado     | Reutilizar: o checkout cria a reserva por aqui                                                                                                     |
| Preço calculado no servidor                         | `commercial_booking_guard` (trigger `bookings_00_commercial_guard`): `total_mzn := price_mzn * people`; negócio aprovado; horário existe                                                    | função na BD; `src/lib/bookings.ts:206` envia `total_mzn`, mas o servidor reescreve-o | confirmado     | O snapshot do preço já existe; o do pagamento parte dele                                                                                           |
| Transições protegidas                               | `bookings_guard_update`: campos de identidade e preço bloqueados para não-admin; regras por papel; caminho `AUTO_EXPIRED` só sem sessão                                                     | `drizzle/migrations/0037_commercial_flow_8e5.sql:9`                                   | confirmado     | É preciso um caminho novo `PAYMENT_EXPIRED` (sem sessão, só reservas `pending` com pagamento vencido)                                              |
| Expiração                                           | pg_cron `ekaya-expire-stale-bookings`, todos os dias às 22:15 UTC; cancela `pending` cujo início já passou                                                                                  | `cron.job` na BD; `0037`                                                              | confirmado     | Diário não chega para um checkout: é preciso um job de minutos para libertar a capacidade                                                          |
| Capacidade presa                                    | A capacidade conta `pending` + `confirmed`                                                                                                                                                  | `bookings_validate_insert`                                                            | confirmado     | Uma reserva por pagar já prende lugares, por isso o prazo de pagamento tem de ser curto                                                            |
| Pontos                                              | `points_on_booking`: atribui em `completed`, reverte se sair de `completed`; `points_ledger_once`                                                                                           | função na BD                                                                          | confirmado     | Acrescentar a condição "pago" quando a reserva exige pagamento                                                                                     |
| RLS das reservas                                    | Turista: cria as suas `pending` e lê as suas. Dono: lê e **atualiza** as do seu negócio (o trigger limita). Admin: tudo                                                                     | `pg_policies` (lidas a 30/10)                                                         | confirmado     | Colunas de pagamento na tabela `bookings` ficariam ao alcance do UPDATE do dono: o pagamento vai para uma tabela própria, sem políticas de escrita |
| Moeda                                               | `price_mzn` e `total_mzn` são `numeric` em meticais                                                                                                                                         | `types.ts`                                                                            | parcial        | Valores novos em centavos inteiros (`bigint`)                                                                                                      |
| Câmbio                                              | `exchange_rates` atualizada por pg_cron (só para mostrar)                                                                                                                                   | BD                                                                                    | confirmado     | Reutilizar para mostrar USD/EUR; a cobrança é sempre em MZN                                                                                        |
| Pagamento, faturação, comissão, campanhas, checkout | Nenhuma tabela com `pay`, `invoice`, `commission`, `plan`, `sponsor`, `promo`, `audit` ou `subscr` além de `exchange_rates*`                                                                | `information_schema` (lido a 30/10)                                                   | não encontrado | Tudo é novo; migrações só aditivas                                                                                                                 |
| Auditoria do admin                                  | `decided_by`/`decided_at` em `businesses`; não há tabela de auditoria                                                                                                                       | BD                                                                                    | parcial        | `admin_audit` nova, só de acrescentar                                                                                                              |
| Papéis                                              | `app_role`: tourist, business_small, business_large, admin                                                                                                                                  | `types.ts`                                                                            | confirmado     | O plano Parceiro não deve depender de `business_small/large`; vai para uma tabela própria                                                          |
| Segredos no servidor                                | `supabase_vault` instalado; `supabaseAdmin` só no servidor                                                                                                                                  | BD; `client.server.ts`                                                                | confirmado     | As chaves do fornecedor ficam em secrets do Worker (ou no Vault)                                                                                   |
| Webhook público                                     | Server functions com `requireSupabaseAuth`; não há rota de servidor pública                                                                                                                 | `src/lib/*.functions.ts`                                                              | não encontrado | É precisa uma rota de servidor sem sessão, que verifica a assinatura e consulta o estado ao fornecedor                                             |
| CSP                                                 | Report-only; origens em `CSP_SOURCES`                                                                                                                                                       | `src/lib/security-headers.ts:3`                                                       | confirmado     | O domínio do fornecedor só entra quando ele existir                                                                                                |
| Termos                                              | `/terms` e `/privacy` estão "em preparação"                                                                                                                                                 | `src/routes/terms.tsx`, `privacy.tsx`                                                 | parcial        | As taxas e o conteúdo patrocinado têm de estar nos Termos (LEGAL-1) antes de cobrar                                                                |
| Dados reais                                         | 2 negócios aprovados (1 real, "Esencia Sutil", loja; 1 de teste). 0 de 8 experiências ativas (todas de negócios de exemplo suspensos, sem fotos). 48 horários. 2 reservas, ambas canceladas | BD (lida a 30/10)                                                                     | confirmado     | Não há dados para testar pagamentos: os testes criam os seus dados e revertem-se sozinhos                                                          |
| Extensões                                           | Instaladas: pg_cron, pg_net, pgcrypto, supabase_vault. `vector` está disponível mas não instalada                                                                                           | BD                                                                                    | confirmado     | Nada a instalar para pagamentos                                                                                                                    |

**Dados de teste necessários**, criados só dentro de blocos `DO $$ … RAISE EXCEPTION 'TEST_…_ROLLBACK' $$`:

- 2 negócios aprovados com donos diferentes (para testar o acesso cruzado);
- 1 experiência ativa por negócio, com horário e capacidade;
- 1 turista;
- uma versão da configuração de comissão;
- pagamentos simulados pelo provider `mock`.

No fim, uma leitura confirma que não ficou nada.

---

## 2. Desenho

### 2a. Fornecedores de pagamento em Moçambique

| Fornecedor                                | Métodos                                              | Taxas publicadas                                                                                                                            | Sandbox                                       | Webhooks                                                                                  | Reembolsos                                                                                            | Liquidação                                       | Requisitos                                               | Split / marketplace                                                                | Licença                                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EPay** (epay.co.mz; ANTOF HOLDING, LDA) | M-Pesa, e-Mola, IZI; sem cartões [F1]                | 7% por venda, "ponto de partida, negociável", taxa do banco incluída; levantamento M-Pesa/e-Mola 120 MT, banco grátis, mínimo 2 000 MT [F1] | Sim: chaves de teste separadas [F1]           | Assinados [F1]                                                                            | Comprador pede em 7 dias; vendedor tem 48 h; sem acordo, a EPay decide. Reservas: janela de 24 h [F1] | No mesmo dia, das 08h às 18h, todos os dias [F1] | Verificação de identidade; NUIT/alvará não referidos [Q] | Afiliados e coprodutores recebem "a sua parte"; o mecanismo não está publicado [Q] | Pagamentos processados pelo Millennium bim; licença própria não indicada [Q]                                                                                    |
| **pawaPay** (Quidexplus Mozambique)       | M-Pesa (cobrança); e-Mola só para pagar [F4]         | Não publicadas [Q]                                                                                                                          | [Q]                                           | Assinados (RFC 9421) + consulta de estado [F3]                                            | API de reembolsos [F3]                                                                                | [Q]                                              | [Q]                                                      | Tem pagamentos a terceiros (payouts), mas isso é o modelo de custódia (ver 2b) [I] | Licença de Prestador de Serviços de Pagamento do Banco de Moçambique, 8/10/2026 [F4]                                                                            |
| **M-Pesa API** (Vodacom, direto)          | Só M-Pesa                                            | Não publicadas no portal [Q]                                                                                                                | Sim [F2]                                      | Modo assíncrono para um URL HTTPS nas portas 11000–19000; assinatura não documentada [F2] | API de reversão [F2]                                                                                  | Conta M-Pesa de comerciante [I]                  | Integração revista pela Vodacom antes do "Go Live" [F2]  | Não: só C2B, reversão e consulta de estado estão documentados [F2]                 | Operadora de moeda eletrónica [I]                                                                                                                               |
| **PaySuite** (paysuite.co.mz)             | M-Pesa, e-Mola, mKesh, Ponto24, Visa/Mastercard [F5] | 3% da plataforma + 3% da operadora M-Pesa = 6% [F5]                                                                                         | **Não**: "todas as transações são reais" [F5] | Sim; assinatura não indicada [F5]                                                         | Não indicados [Q]                                                                                     | Por M-Pesa ou banco [F5]                         | Não indicados [Q]                                        | Não descrito [F5]                                                                  | Diz ter sido aprovada na "Sandbox regulatória" do BdM; não indica licença [F5]                                                                                  |
| **Paytek**                                | —                                                    | —                                                                                                                                           | —                                             | —                                                                                         | —                                                                                                     | —                                                | —                                                        | —                                                                                  | Não encontrada: o domínio `paytek.co.mz` não existe. Pode ser a "Payted", que tem um SDK em PHP para M-Pesa, e-Mola e Visa, mas sem site oficial confirmado [Q] |

Outros agregadores que anunciam API M-Pesa/e-Mola e não foram avaliados a fundo: Quick-e-Pay, Pagar (pagar.co.mz), QuantumPay [F6].

**Licenciamento:**

- O Banco de Moçambique distingue três categorias de prestadores [F7]:
  - instituições de moeda eletrónica;
  - instituições de transferência de fundos;
  - agregadores de pagamento.
- A Lei n.º 15/2026, de 2 de julho, substitui o regime de 2008 e alarga a supervisão [F8: imprensa; confirmar no Boletim da República].
- Não encontrei uma lista pública e atualizada de prestadores licenciados [Q]. Peço a cada fornecedor o número da licença e confirmo-o junto do BdM.

**Leitura:**

- **Primeira escolha: EPay** (sandbox, webhooks assinados, IZI para valores altos).
- **Segunda: pawaPay** (a licença confirmada é a mais forte; só cobra por M-Pesa).
- **M-Pesa direto** fica para mais tarde: menos intermediários, mas só M-Pesa e sem split.
- **PaySuite** fica fora até ter ambiente de testes.

Nenhum dos quatro publica um **split** automático por negócio [I]. É a primeira pergunta dos emails.

Fontes:

- [F1] https://epay.co.mz/
- [F2] https://developer.mpesa.vm.co.mz/ e https://developer.mpesa.vm.co.mz/documentation/
- [F3] https://docs.pawapay.io/v2/docs/signatures.md e https://docs.pawapay.io/v2/api-reference/payouts/payout-callback.md
- [F4] https://tech-ish.com/2026/10/08/pawapay-gets-a-bank-of-mozambique-licence-to-sign-up-merchants-directly/ e https://www.connectingafrica.com/regulation/fintech-pawapay-secures-psp-license-in-mozambique
- [F5] https://paysuite.co.mz/en/
- [F6] https://www.quickepay.co.mz/, https://pagar.co.mz/, https://mozquantumpay.com/
- [F7] https://www.bancomoc.mz/media/g13mwypr/licenciamento-de-empresas-prestadoras-de-servi%C3%A7os-de-pagamentos.pdf
- [F8] https://forbesafricalusofona.com/?p=174357

### 2b. Quem recebe o dinheiro

| Opção                                                      | Como funciona                                                                        | A favor                                                                           | Riscos                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Split pelo fornecedor**                               | O turista paga uma vez; o fornecedor separa a parte do negócio e a comissão do EKAYA | O EKAYA nunca guarda dinheiro de terceiros; o fluxo pedido funciona tal como está | Nenhum fornecedor confirma ter split por negócio [Q]; cada negócio precisa de uma conta no fornecedor                                                      |
| **2. O EKAYA cobra tudo e paga depois**                    | O dinheiro entra na conta do EKAYA, que paga aos negócios                            | Simples para o negócio                                                            | **Custódia de fundos de terceiros**: pode exigir licença do BdM (Lei 15/2026) [Q]; risco de liquidez e de fraude; **não implementar sem parecer jurídico** |
| **3. O negócio cobra e o EKAYA fatura a comissão por mês** | Cada negócio tem a sua conta (EPay ou M-Pesa); o EKAYA fatura as reservas concluídas | Sem custódia; funciona hoje                                                       | O EKAYA só sabe que houve pagamento se o fornecedor o avisar por negócio; risco de não cobrar a comissão; mais trabalho de faturação                       |

**Recomendação:**

- **Lançamento:** como hoje, **sem pagamento online**. A reserva é confirmada pelo negócio e paga no local. A receita vem dos destaques, das campanhas e do plano Parceiro, com pagamento manual (fatura e referência M-Pesa).
- **Alvo:** a **opção 1**, quando um fornecedor confirmar o split.
- **Recurso:** a **opção 3**, se nenhum o tiver. Neste caso, a comissão incide só sobre reservas feitas e concluídas no EKAYA, que são atribuíveis.
- A opção 2 só avança com um parecer escrito do advogado.

### 2c. Quem paga a comissão

Exemplo **ilustrativo** (folha `ExemplosComissao` do .xlsx): preço afixado de 2 500 MT, comissão de 10% e taxa do fornecedor de 6% sobre o valor pago. A taxa é repartida na proporção do que cada parte recebe.

|                          | A — acrescentada ao turista | B — descontada ao negócio | C — repartida (50/50) |
| ------------------------ | --------------------------- | ------------------------- | --------------------- |
| Turista paga             | 2 750,00 MT (+10%)          | 2 500,00 MT               | 2 625,00 MT (+5%)     |
| Taxa do fornecedor       | 165,00 MT                   | 150,00 MT                 | 157,50 MT             |
| EKAYA recebe (líquido)   | 235,00 MT                   | 235,00 MT                 | 235,00 MT             |
| Negócio recebe (líquido) | 2 350,00 MT (94,0%)         | 2 115,00 MT (84,6%)       | 2 232,50 MT (89,3%)   |
| Reconciliação            | 0,00                        | 0,00                      | 0,00                  |

**Análise comercial:**

- **Turista (perceção de preço).**
  - Na opção A, o preço no EKAYA fica **acima** do preço que o negócio pede no WhatsApp ou à porta [I]. Quem compara vê o EKAYA como intermediário caro e reserva por fora, e o EKAYA perde a reserva e a confiança.
  - Na opção B, o preço é **o mesmo** do local. Isto permite a mensagem "preço igual ao do negócio, sem taxas para o turista", fácil de comunicar e de verificar.
- **Negócio (adesão).**
  - Na opção B, o negócio sente a taxa. Atenua-se com:
    - o programa Parceiro Fundador (comissão 0% nos primeiros meses [H]);
    - comissão **só sobre reservas pagas no EKAYA**, nunca sobre clientes que já eram do negócio;
    - o líquido sempre visível antes de aceitar;
    - uma comissão muito abaixo das plataformas internacionais.
  - O GetYourGuide cobra **20–30%** ao fornecedor, consoante o país [F9]. É o modelo B.
- **Opção C:** reparte a perceção, mas é mais difícil de explicar aos dois lados e cria dois números diferentes [I].

**Recomendação:**

- Opção **B**, com comissão inicial de **8–10% [H]** e 0% para os Parceiros Fundadores durante **6 meses [H]**, tudo configurável no admin.
- O turista vê "Sem taxas adicionais". O negócio vê o bruto, a comissão, a taxa do fornecedor e o líquido.
- Regra a decidir [D]: o preço no EKAYA não pode ser mais alto do que o preço direto (paridade de preço).

[F9] https://www.getyourguide.supply/join/how-much-does-getyourguide-charge

### 2d. Pacote comercial para negócios (sem obrigar a reservas)

1. **Perfil básico grátis para sempre.**
   - Inclui: ficha do negócio, mapa, contactos, fotos, atividades e entrada no assistente.
   - Nenhum negócio é obrigado a aceitar reservas nem a pagar.
2. **Destaques patrocinados por semana.**
   - Âmbitos: home, província ou categoria.
   - Etiqueta "Patrocinado" / "Sponsored" sempre visível.
   - Limites: no máximo 2 por página e 1 a cada 6 resultados [H].
   - Aparecem num bloco "Em destaque" separado: **a ordem orgânica da pesquisa não muda**.
3. **Campanhas** (prato, produto, evento ou experiência).
   - Cartão com data de início e de fim, a mesma etiqueta e as mesmas regras de limite.
   - O admin aprova cada campanha.
4. **Plano Parceiro (opcional).**
   - Selo "Verificado" (depois de o admin verificar os documentos).
   - Estatísticas que o EKAYA mede de facto: visualizações da página, cliques para ligar, para o WhatsApp e para o mapa, e favoritos.
   - As estatísticas são contadores diários e anónimos, sem identificar ninguém.
   - Um destaque incluído por mês [H].
5. **Parceiro Fundador.**
   - Para os primeiros 20 negócios [H]: comissão 0% durante 6 meses [H] e um destaque grátis.
   - Duração e valores configuráveis.
6. **Patrocínios institucionais** (turismo, ONG, marcas).
   - Página ou secção identificada como "Com o apoio de …".
   - Nunca disfarçados de conteúdo.
7. **Indicação de negócio a negócio.**
   - Os dois negócios ganham uma semana de destaque quando o indicado fica aprovado e ativo 30 dias.
   - Anti-abuso: donos diferentes, NUIT e telefone diferentes, máximo 5 por ano [H].
8. **Códigos promocionais para turistas.**
   - Financiados pelo EKAYA: descontam na comissão, **nunca no líquido do negócio**.
   - Uma utilização por conta, valor mínimo, validade e limite total.
   - Podem ser trocados por pontos através das recompensas que já existem (`rewards` + `redeem_reward`).
9. **Sem comissão sobre visitas que o EKAYA não consegue atribuir** (quem viu no EKAYA e foi diretamente ao local).

**Piloto:**

- 5–10 negócios reais, 8 semanas, 1–2 províncias [D].
- Métricas e limiares [H]:
  - ≥ 70% com o perfil completo em 2 semanas;
  - contactos gerados por negócio e por semana (medidos);
  - ≥ 30% compram um destaque ou o plano até à semana 8;
  - ≥ 50% renovam;
  - satisfação ≥ 8/10 num inquérito curto.

### 2e. Plano financeiro (resumo do .xlsx, com as decisões de 30/10/2026)

Pressupostos editáveis. Câmbio da BD: 1 USD = 63,79 MZN (30/10/2026). Com as decisões de 30/10:

- comissão de 10%;
- Fundadores a 0% durante 6 meses, para os primeiros 20 negócios;
- destaque a 500 MT/semana ou 1 500 MT/mês;
- plano a 750 MT/mês.

| Mês típico, depois do período Fundador                           | Pessimista   | Base         | Otimista       | Base, comissão 8% | Base sem patrocínios |
| ---------------------------------------------------------------- | ------------ | ------------ | -------------- | ----------------- | -------------------- |
| Negócios ativos                                                  | 10           | 30           | 60             | 30                | 30                   |
| Receita total / mês                                              | 2 650 MT     | 35 333 MT    | 208 500 MT     | 31 583 MT         | 27 000 MT            |
| Custos fixos / mês                                               | 21 360 MT    | 38 210 MT    | 66 632 MT      | 38 210 MT         | 38 210 MT            |
| Resultado / mês                                                  | −18 710 MT   | −2 877 MT    | +141 868 MT    | −6 627 MT         | −11 210 MT           |
| Negócios ativos para o equilíbrio                                | 81           | 34           | 11             | 39                | 43                   |
| Total descontado ao negócio numa reserva média (comissão + taxa) | 255 MT (17%) | 400 MT (16%) | 508 MT (14,5%) | 350 MT (14%)      | 400 MT (16%)         |

**Leitura [I]:**

- Baixar a comissão de 10% para 8% custa ~3 750 MT/mês no cenário base e pede mais 5 negócios para chegar ao equilíbrio.
- Sem patrocínios, são precisos 43 negócios, em vez de 34.
- O ponto de equilíbrio depende sobretudo do **número de negócios ativos** e dos **destaques**.
- No 1.º ano, o programa Fundador reduz as comissões: no cenário base, 24% da receita de 12 meses vem de comissões e 48% de patrocínios.

### 2f. Conformidade (a tratar com contabilista e advogado; não decido por ti)

**Com o advogado:**

1. **Forma jurídica e NUIT do EKAYA.** A faturação das comissões e dos destaques exige-os.
2. **Licença de atividade.** O EKAYA é intermediação turística ou agência de viagens à luz da lei do turismo? Vende apenas publicidade [Q]?
3. **Banco de Moçambique.** O fluxo escolhido (2b) é um serviço de pagamento à luz da Lei 15/2026? Com split pelo fornecedor licenciado, o EKAYA não deveria precisar de licença [I], mas é preciso confirmar.
4. **Contrato de parceiro:**
   - comissão;
   - paridade de preço;
   - reembolsos;
   - responsabilidade pelo serviço;
   - dados pessoais;
   - fim do contrato.
   - O rascunho virá em `docs/sales/`, com aviso de revisão jurídica.
5. **Consumidor e publicidade:**
   - reembolsos e cancelamentos (Lei de Defesa do Consumidor, Lei n.º 22/2009 [I]);
   - identificação da publicidade;
   - regras para conteúdo patrocinado [Q].
6. **Dados pessoais.**
   - A proposta de Lei de Proteção de Dados foi submetida à Assembleia, mas não encontrei aprovação até agosto de 2026 [F10].
   - O RGPD aplica-se aos utilizadores na UE.

**Com o contabilista:**

1. **IVA** sobre comissões, destaques, plano e patrocínios.
   - As fontes divergem entre 16% e 15% como taxa normal [F11].
   - A Lei n.º 10/2025 passou a incluir serviços digitais no IVA [F11].
2. **Faturação legal:**
   - numeração;
   - software certificado;
   - faturação eletrónica (as fontes não concordam) [Q].
3. **Retenções na fonte** quando o negócio é pessoa singular, e o tratamento da comissão retida no split [Q].

[F10] https://aimnews.org/2026/08/25/intic-alerta-para-desafios-na-proteccao-de-dados-pessoais-em-mocambique/
[F11] https://www.rsm.global/mozambique/sites/default/files/media/documents/Mo%C3%A7ambique%20Guia%20Fiscal%202026.PT%20_0.pdf, https://www.pwc.pt/pt/pwcinforfisco/flash/mocambique/mocambique-iva-alteracao-civa.html

### 2g. Encaixe técnico

- **Uma só fonte da verdade.**
  - A reserva continua em `bookings`.
  - O pagamento fica em `payments` (1 ativo por reserva), com o seu próprio estado:
    - `awaiting_payment`;
    - `processing`;
    - `paid`;
    - `failed`;
    - `expired`;
    - `refund_pending`;
    - `refunded`.
- **Confirmação.** Proposta [D]: a experiência tem a opção "reserva imediata", decidida pelo negócio.
  - Com ela, pagamento validado → reserva `confirmed`.
  - Sem ela, o negócio confirma primeiro e o turista paga depois, dentro de um prazo.
- **Capacidade presa no checkout.**
  - A reserva `pending` já prende lugares.
  - O pagamento tem um `expires_at` = agora + 15 min [H].
  - Um pg_cron de 5 em 5 minutos (`expire_unpaid_checkouts`) cancela a reserva com o motivo `PAYMENT_EXPIRED`. É um caminho novo no `bookings_guard_update`: só sem sessão, só `pending` e só com um pagamento vencido.
- **Pagamento depois de a reserva expirar.** Proposta: **reembolso automático** (reversão no fornecedor), com notificação ao turista e registo no ledger. Se o reembolso falhar, entra numa fila de revisão do admin.
- **Confirmação do fornecedor.** O servidor valida a confirmação em duas etapas:
  1. verifica a assinatura do webhook;
  2. consulta o estado do pagamento no fornecedor, de servidor para servidor.

  O regresso do browser só mostra "a verificar". Nunca confirma.

- **Idempotência.**
  - Há uma `idempotency_key` única por checkout.
  - Cada evento é guardado em `payment_events`, único por `(provider, provider_event_id)`.
  - O processamento corre numa transação, com uma máquina de estados que só avança.
- **Snapshot no checkout.** Fica registado:
  - `gross_cents`;
  - a versão da comissão;
  - `commission_bp`;
  - `commission_cents`;
  - `provider_fee_cents` (estimado no checkout e substituído pelo real);
  - `net_cents`.
- **Arredondamento.**
  - Todos os valores são inteiros em centavos.
  - Comissão = arredondamento comercial (meio para cima) de `gross × bp / 10 000`.
  - Taxa = a que o fornecedor reporta.
  - Líquido = `gross − commission − fee`: o resto do arredondamento fica no negócio.
  - Um `CHECK` garante `gross = commission + fee + net` quando o pagamento está pago.
- **Pontos.** `points_on_booking` passa a exigir, para reservas com pagamento, que o pagamento esteja `paid` e não reembolsado.
- **Reconciliação.**
  - Um job diário compara os pagamentos `paid` com o extrato ou o estado no fornecedor.
  - As diferenças vão para a fila do admin.
  - Os ajustes são lançamentos no ledger, nunca edições.

### 2h. Schema e RLS (migrações aditivas; SQL definitivo só depois da aprovação)

**Regras gerais:**

- Tabelas novas sem grants de escrita para `anon` e `authenticated`.
- As escritas passam por RPCs `SECURITY DEFINER` com verificação do papel, ou por funções de servidor com a service role.
- Os valores em dinheiro são `bigint` em centavos, com `CHECK (… >= 0)`.
- Moeda: `CHECK (currency = 'MZN')`.

| Tabela                                            | Colunas principais                                                                                                                                                                                                                                                             | Constraints e índices                                                                                                                                                                                | Quem lê / escreve                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commission_configs`                              | `version`, `rate_bp`, `payer` (business/tourist/split), `tourist_share_bp`, `founder_rate_bp`, `founder_months`, `valid_from`, `created_by`, `note`                                                                                                                            | `version` única; `rate_bp` entre 0 e 5 000; só de acrescentar (trigger bloqueia UPDATE/DELETE)                                                                                                       | Lê: admin. O valor que o turista vê vem da RPC `get_checkout_quote`. Escreve: RPC do admin, com auditoria                                                               |
| `business_commercial_terms`                       | `business_id`, `founder_until`, `custom_rate_bp`, `instant_booking_default`                                                                                                                                                                                                    | PK `business_id`                                                                                                                                                                                     | Lê: dono e admin. Escreve: admin                                                                                                                                        |
| `payments`                                        | `booking_id`, `customer_id`, `business_id`, `provider`, `provider_ref`, `idempotency_key`, `status`, `currency`, `gross_cents`, `commission_bp`, `commission_cents`, `provider_fee_cents`, `net_cents`, `commission_config_id`, `expires_at`, `paid_at`                        | Único `idempotency_key`; único parcial `booking_id` onde o estado está ativo; único `(provider, provider_ref)`; índices `(status, expires_at)` e `(business_id, created_at)`; CHECK da reconciliação | Lê: o turista os seus, o dono os do seu negócio, o admin todos. **Ninguém escreve pelo cliente**                                                                        |
| `payment_events`                                  | `provider`, `provider_event_id`, `payment_id`, `type`, `signature_valid`, `payload` (sem dados pessoais), `received_at`, `processed_at`, `error`                                                                                                                               | Único `(provider, provider_event_id)`                                                                                                                                                                | Lê: só o admin. Escreve: só o servidor                                                                                                                                  |
| `ledger_entries`                                  | `business_id`, `payment_id`, `kind` (commission, provider_fee, payout, refund, adjustment, sponsored, plan, sponsorship), `amount_cents` (com sinal), `reason`, `created_by`                                                                                                   | Só de acrescentar                                                                                                                                                                                    | Lê: dono (as do seu negócio) e admin. Escreve: servidor e RPC do admin (ajustes com motivo obrigatório)                                                                 |
| `invoices`                                        | `series`, `number`, `business_id`, `period`, `subtotal_cents`, `vat_cents`, `total_cents`, `status`, `pdf_path`, `issued_at`                                                                                                                                                   | Único `(series, number)`; numeração sem buracos [Q]                                                                                                                                                  | Lê: dono e admin. Escreve: admin                                                                                                                                        |
| `sponsored_placements`                            | `business_id`, `experience_id`, `kind` (destaque/campanha), `scope` (home/province/category), `province_id`, `category_code`, `title_pt/en`, `starts_at`, `ends_at`, `status` (requested, approved, active, rejected, expired), `price_cents`, `payment_ref`, `paid_marked_by` | `ends_at > starts_at`; o limite por âmbito é verificado na RPC de aprovação                                                                                                                          | Lê: o público só os ativos, por uma vista sem preço; o dono os seus; o admin todos. Escreve: o dono pede pela RPC `request_placement`; o admin aprova e marca como pago |
| `plans` / `subscriptions`                         | `code`, `name_pt/en`, `price_cents`, `period`, `features`; `business_id`, `plan_id`, `starts_at`, `ends_at`, `status`, `payment_ref`                                                                                                                                           | Uma subscrição ativa por negócio (único parcial)                                                                                                                                                     | Lê: os planos são públicos; as subscrições, o dono e o admin. Escreve: admin                                                                                            |
| `promo_codes` / `promo_redemptions` / `referrals` | código (único, sem maiúsculas), desconto, `max_uses`, `per_user_limit`, `min_gross_cents`, validade; resgates com `unique (code_id, user_id)`; indicações com `unique (referred_business_id)`                                                                                  | Ver 2d (anti-abuso)                                                                                                                                                                                  | Admin e RPCs; o turista vê os seus resgates                                                                                                                             |
| `business_metric_daily`                           | `business_id`, `day`, `kind` (view, click_call, click_whatsapp, click_map, favorite), `count`                                                                                                                                                                                  | PK `(business_id, day, kind)`; sem utilizador nem IP                                                                                                                                                 | Escreve: RPC `track_business_event` (incremento, com limite por sessão no browser). Lê: dono (plano Parceiro) e admin                                                   |
| `business_leads`                                  | nome, negócio, telefone/email, província, mensagem, consentimento                                                                                                                                                                                                              | —                                                                                                                                                                                                    | Escreve: server function com limite por IP (o `anon` não tem grants de escrita). Lê: admin                                                                              |
| `admin_audit`                                     | `actor_id`, `action`, `entity`, `entity_id`, `before`, `after`, `reason`                                                                                                                                                                                                       | Só de acrescentar                                                                                                                                                                                    | Lê: admin                                                                                                                                                               |
| `app_settings`                                    | `key`, `value` (ex.: `payments_enabled = false`)                                                                                                                                                                                                                               | —                                                                                                                                                                                                    | Lê: servidor. Escreve: admin, com auditoria                                                                                                                             |

**Alterações a funções que já existem:**

- `bookings_guard_update`: caminho `PAYMENT_EXPIRED`.
- `points_on_booking`: condição "pago".
- Uma RPC `create_checkout` que cria a reserva e o pagamento numa só transação.

As tabelas `bookings`, `experiences` e `businesses` não recebem colunas novas.

---

## 3. Plano de entrega

Cada fase é um branch e um PR, com testes de BD que se revertem sozinhos, Vitest e QA de browser nas páginas tocadas.

| Fase | Entrega                                                                                                                                  | Critérios de aceitação                                                              | Testes                                                                              | Riscos                            | Ficheiros                                               | Impacto no lançamento                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| M0   | As tuas decisões (secção de decisões)                                                                                                    | Respostas registadas no `roadmap.md`                                                | —                                                                                   | —                                 | `roadmap.md`                                            | Nenhum                                                   |
| M1   | Motor de comissão + `commission_configs` + `admin_audit` + `app_settings`                                                                | Uma alteração cria uma versão nova e auditada; a cotação é calculada só no servidor | Arredondamento (Vitest, casos limite); adulteração pelo cliente (BD)                | Arredondamento                    | `drizzle/0049…`, `src/lib/commission.ts`, admin         | Nenhum: tudo atrás da flag                               |
| M2   | `payments`, `payment_events`, `ledger_entries`, adaptador `PaymentProvider` + `mock`, webhook, consulta de estado, expiração por pg_cron | Os 7 cenários do mock passam; a flag fica desligada em produção                     | Falha, duplicado, atraso, expiração com pagamento tardio, reembolso, acesso cruzado | Rota pública do webhook; relógios | `drizzle/0050…`, `src/lib/payments/*`, rota de servidor | Nenhum                                                   |
| M3   | Checkout na reserva                                                                                                                      | Decomposição do preço, prazo, estados e erros em PT/EN; acessível                   | QA de browser + interações                                                          | Conversão                         | `experience.$id.tsx`, `bookings.tsx`                    | Nenhum (flag)                                            |
| M4   | Painel financeiro do negócio + CSV                                                                                                       | Bruto, comissão, taxa e líquido; só os dados do próprio negócio                     | RLS cruzada; CSV                                                                    | —                                 | `business-dashboard.tsx`                                | Nenhum                                                   |
| M5   | Painel financeiro do admin                                                                                                               | Receita por linha, reconciliação, ajustes e reembolsos auditados, flag Fundador     | Auditoria; reconciliação                                                            | —                                 | `admin.tsx`                                             | Nenhum                                                   |
| M6   | Destaques e campanhas com pagamento manual                                                                                               | Etiqueta "Patrocinado" sempre visível; limites; ordem orgânica intacta              | Etiqueta, limites, ordem                                                            | Confiança do turista              | home, mapa, listas, painel do negócio, admin            | **Pode lançar já**: não depende de fornecedor            |
| M7   | Plano Parceiro + estatísticas                                                                                                            | Contadores diários anónimos; só métricas medidas                                    | Privacidade; limites                                                                | Inflação de contadores            | `business_metric_daily`, painel                         | Pode lançar já                                           |
| M8   | Códigos promocionais e de indicação                                                                                                      | Anti-abuso; nunca reduzem o líquido do negócio                                      | Abuso; limites                                                                      | Fraude                            | promo, referrals                                        | Depois do M2 para turistas; as indicações podem ir antes |
| M9   | Página "Para negócios" + formulário de interesse                                                                                         | Preços vindos da configuração; leads visíveis no admin                              | Limite de envios; PT/EN                                                             | Spam                              | rota nova, `business_leads`                             | Pode lançar já                                           |
| M10  | Textos comerciais em `docs/sales/`                                                                                                       | Pitch, mensagem de WhatsApp, rascunho do contrato com aviso jurídico                | Revisão tua                                                                         | Promessas comerciais              | `docs/sales/*`                                          | Nenhum                                                   |
| M11  | Adaptador real em sandbox                                                                                                                | Testes só em sandbox                                                                | Os mesmos do M2 contra a sandbox                                                    | Dependência externa               | `src/lib/payments/<fornecedor>.ts`, CSP                 | **BLOCKED**: fornecedor, contrato e chaves               |

Ordem proposta: M1 → M6 → M9 → M7 → M2 → M3 → M4 → M5 → M8 → M10 (o M10 pode correr em paralelo).
Os destaques, a página "Para negócios" e o plano dão receita sem esperar pelo fornecedor nem pelo parecer jurídico.

---

## 4. Decisões de 30/10/2026

1. **Quem recebe o dinheiro:** sem pagamento online no lançamento; depois split pelo fornecedor; se não houver split, fatura mensal da comissão. A custódia fica de fora sem parecer jurídico.
2. **Quem paga a comissão:** opção B, descontada ao negócio. **O ecrã de adesão mostra sempre ao negócio o total descontado** (comissão + taxa do fornecedor), em MT e em %, antes de aceitar.
3. **Valores iniciais**, todos configuráveis no admin:
   - comissão de 10%;
   - Parceiro Fundador: 0% durante 6 meses, para os primeiros 20 negócios;
   - destaque a 500 MT/semana ou 1 500 MT/mês, com o 1.º grátis para os Fundadores;
   - plano Parceiro a 750 MT/mês.
4. **Paridade de preço:** o preço no EKAYA não pode ser mais alto do que o preço direto.
5. **Reserva imediata** depois de pago, escolhida pelo negócio em cada experiência.
6. **Pagamento depois de a reserva expirar:** reembolso automático; se falhar, vai para revisão do admin.
7. **Fornecedores:** EPay e pawaPay primeiro. Os emails são enviados pelo responsável.
8. **Ordem:** LEGAL-1 → SEG-2 → CONTEÚDO-1 → M1 → M6 → M9.
9. **Piloto:** Maputo (cidade e província) e Inhambane (Tofo e Vilankulo).
