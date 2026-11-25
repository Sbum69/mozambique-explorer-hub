# Pagamento — textos PT/EN (reservas e destaques)

Textos prontos para a app, coerentes com os Termos em vigor (`src/lib/legal/terms.ts`, versão
2026-11-23) e com a página Preços e reembolsos (`src/lib/pricing-texts.ts`).

- Estes textos ainda **não estão na app**: são a proposta de texto.
- Pô-los no ecrã de reserva é uma mudança de código, que entra num dicionário PT/EN coberto pelo
  teste de paridade.
- Não há números de M-Pesa neste ficheiro: o número e o nome da conta vêm de Admin → Destaques
  (`manual_payment_configs`).

## 1. Ecrã de reserva (turista)

Hoje **as reservas não se pagam na app**: o pagamento combina-se diretamente com o negócio
(Termos, secção das reservas). O texto do ecrã de reserva tem de dizer isso mesmo.

**PT**

> **Pagamento:** o pagamento não é feito na aplicação. Combina-o diretamente com o negócio depois
> de a reserva ser confirmada (por exemplo em dinheiro ou por M-Pesa, se o negócio o aceitar).
> O EKAYA não recebe pagamentos de reservas.

**EN**

> **Payment:** payment is not made in the app. Arrange it directly with the business once the
> booking is confirmed (for example in cash or by M-Pesa, if the business accepts it). EKAYA does
> not take payments for bookings.

**Onde aparece (proposta):**

- no formulário de reserva, por baixo do total;
- na confirmação "Pedido enviado";
- no detalhe da reserva em `/bookings`.

**[DECIDIR]**

- Os exemplos "em dinheiro ou por M-Pesa" saem do texto se não quiseres sugerir meios de pagamento.
- Se o EKAYA passar a receber as reservas por M-Pesa, este texto e os Termos mudam juntos: nova
  versão legal, migração de `current_legal_versions()` e Publish no mesmo momento.

## 2. Destaques (negócio) — M-Pesa manual

Isto **já existe na app** (`src/lib/texts/sponsored.ts`, `src/lib/pricing-texts.ts`). Fica aqui o
texto completo para referência e para as mensagens do apoio.

**PT**

> 1. Envia o pedido de destaque no painel do negócio. Recebes uma referência (`EKD-…`).
> 2. Quando o EKAYA aprovar o pedido, paga por **M-Pesa** para o número e o nome indicados no
>    pedido.
> 3. Indica a referência `EKD-…` na mensagem do pagamento.
> 4. Guarda o ID da transação M-Pesa: é o comprovativo.
> 5. Quando o EKAYA confirmar o pagamento, o destaque fica pago e é ativado na data de início. O
>    recibo aparece no painel do negócio.

**EN**

> 1. Send the highlight request from the business dashboard. You get a reference (`EKD-…`).
> 2. Once EKAYA approves the request, pay by **M-Pesa** to the number and name shown on the
>    request.
> 3. Include the reference `EKD-…` in the payment message.
> 4. Keep the M-Pesa transaction ID: it is the proof of payment.
> 5. When EKAYA confirms the payment, the highlight is marked as paid and starts on its start date.
>    The receipt appears in the business dashboard.

**Reembolso:** está na página Preços e reembolsos. O prazo de 14 dias está marcado "a confirmar
com o jurista" (`src/lib/pricing-texts.ts`).

## 3. Como testar (CEO, com a conta QA de negócio)

1. Admin → Destaques: confirmar que o número e o nome da conta M-Pesa são os reais.
2. Com a conta QA de negócio: pedir um destaque e ver a referência `EKD-…` e as instruções.
3. Admin: aprovar e marcar como pago com um ID de teste.
4. Confirmar que o recibo aparece no painel do negócio e diz que não é documento fiscal.
5. Cancelar o destaque de teste.
