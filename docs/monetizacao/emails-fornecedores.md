# Emails para os fornecedores de pagamento (prontos a enviar)

Preenche os campos entre `[ ]` antes de enviar. Não incluem dados de utilizadores do EKAYA.

---

## 1. EPay (através do contacto em https://epay.co.mz/)

**Assunto:** EKAYA — integração de pagamentos para uma plataforma de turismo com vários negócios

Bom dia,

Escrevo em nome do EKAYA ([nome da empresa], NUIT [n.º]), uma plataforma de turismo comunitário em Moçambique. Na plataforma, os turistas reservam atividades de vários negócios locais.

Estamos a avaliar a EPay para receber os pagamentos das reservas por M-Pesa, e-Mola e IZI. Antes de decidir, gostaríamos de esclarecer o seguinte:

1. **Vários vendedores.** É possível que cada negócio tenha a sua conta na EPay e que um único pagamento do turista seja repartido automaticamente entre o negócio e o EKAYA (comissão)? Se sim, como se configura e em que momento cada parte recebe?
2. **Taxas.** O site indica 7% por venda, negociável. Que taxa se aplicaria a uma plataforma com vários negócios? Há taxas de reembolso, de estorno ou de levantamento além dos 120 MT por M-Pesa/e-Mola?
3. **API.** Podem enviar a documentação da API e dos webhooks, em particular:
   - como verificar a assinatura;
   - que eventos existem;
   - política de reenvio;
   - endpoint de consulta do estado de um pagamento, de servidor para servidor.
4. **Ambiente de testes.** Como obtemos as chaves de teste? A sandbox simula falhas, atrasos e reembolsos?
5. **Reembolsos.** Podemos iniciar um reembolso total ou parcial pela API, por exemplo quando uma reserva expira antes de o pagamento chegar?
6. **Limites.** Confirmam os 25 000 MT por pagamento M-Pesa/e-Mola e os 250 000 MT por IZI? Há limites diários?
7. **Prazo de carência.** O site menciona um prazo de carência antes do levantamento. Quanto tempo é?
8. **Requisitos.** Que documentos pedem ao EKAYA e a cada negócio (NUIT, alvará, conta bancária, documento de identificação)?
9. **Regulação.** Qual é o enquadramento da EPay junto do Banco de Moçambique (licença e número)? Qual é o papel do Millennium bim?
10. **Dados pessoais.** Que dados do pagador recebem e guardam, durante quanto tempo e onde?

Obrigado,
[nome] — EKAYA
[email de contacto] · [telefone]

---

## 2. pawaPay (através de https://pawapay.io/ — formulário de contacto comercial)

**Subject:** EKAYA — mobile money collections for a multi-merchant tourism platform in Mozambique

Hello,

I am writing on behalf of EKAYA ([company name], NUIT [number]), a community tourism platform in Mozambique. On the platform, tourists book activities from several local businesses.

We read about the Bank of Mozambique PSP licence granted to Quidexplus Mozambique, and we would like to understand the following:

1. **Coverage.** Which collection methods are live in Mozambique today: M-Pesa, e-Mola, mKesh? When do you expect e-Mola collections?
2. **Multi-merchant.** Can each local business be onboarded as its own merchant, so that funds settle directly to the business and EKAYA's commission settles to EKAYA? Or would EKAYA be the only merchant? We do not want to hold third-party funds without legal clearance.
3. **Pricing.** What are the fees for collections, refunds and payouts in Mozambique, and do you charge a monthly minimum?
4. **Sandbox.** How do we access the sandbox, and does it simulate failures, delays, duplicate callbacks and refunds?
5. **Callbacks.** We plan to verify the RFC 9421 callback signatures and then check the deposit status server-to-server. Is that the recommended pattern? What is your retry policy?
6. **Refunds.** Can we refund a deposit fully or partially by API, and how long does a refund take to reach the payer's wallet?
7. **Settlement.** What is the settlement schedule, which currency and which accounts (bank or wallet)?
8. **Onboarding.** Which documents do you need from EKAYA and, where relevant, from each business?
9. **Licence.** Please send the licence number and the category under which Quidexplus Mozambique is licensed.
10. **Data.** Which payer data do you receive and store, for how long, and in which country?

Thank you,
[name] — EKAYA
[contact email] · [phone]

---

## 3. Vodacom M-Pesa — API para comerciantes (através de https://developer.mpesa.vm.co.mz/ ou do gestor de conta M-Pesa Business)

**Assunto:** EKAYA — API M-Pesa (C2B, reversão e consulta) para uma plataforma de reservas

Bom dia,

Escrevo em nome do EKAYA ([nome da empresa], NUIT [n.º]), uma plataforma de turismo comunitário em Moçambique. Estamos a avaliar a integração direta com a API M-Pesa e precisamos de confirmar o seguinte:

1. **Requisitos comerciais.** Que conta e que documentos são precisos para usar a API em produção (M-Pesa Business, NUIT, alvará)? Quanto tempo demora o processo de "Go Live"?
2. **Tarifas.** Qual é a tarifa de C2B para comerciantes e qual é o custo de uma reversão?
3. **Vários negócios.** É possível repartir um pagamento C2B entre a conta do EKAYA e a conta M-Pesa de um negócio parceiro? Se não, que produto M-Pesa recomendam para plataformas com vários vendedores?
4. **Respostas assíncronas.** A documentação indica um URL HTTPS nas portas 11000–19000. As notificações vêm assinadas? Como verificamos que vieram da Vodacom? Há uma lista de IPs de origem?
5. **Consulta de estado.** Qual é o limite de pedidos à API de consulta do estado de uma transação?
6. **Reversões.** Têm prazo máximo? Podem ser parciais?
7. **Limites** por transação e por dia para clientes e para comerciantes.
8. **Ambiente de testes.** A sandbox simula falhas e respostas assíncronas?

Obrigado,
[nome] — EKAYA
[email de contacto] · [telefone]

---

## 4. Genérico (PaySuite, Quick-e-Pay, Pagar, QuantumPay, Payted)

**Assunto:** EKAYA — perguntas sobre integração de pagamentos

Bom dia,

O EKAYA ([nome da empresa], NUIT [n.º]) é uma plataforma de turismo comunitário em Moçambique, com vários negócios locais. Estamos a avaliar fornecedores de pagamento e precisamos de saber:

1. Que métodos estão ativos hoje (M-Pesa, e-Mola, mKesh, cartões)?
2. Que taxas cobram por transação, por reembolso e por levantamento?
3. Têm ambiente de testes com chaves separadas?
4. Os webhooks são assinados? Há um endpoint de consulta do estado de um pagamento?
5. Os reembolsos podem ser feitos pela API?
6. Qual é o prazo de liquidação?
7. Suportam vários vendedores, com o pagamento repartido automaticamente entre o negócio e a plataforma?
8. Que documentos pedem à plataforma e a cada negócio?
9. Que licença do Banco de Moçambique têm (categoria e número)?
10. Que dados do pagador guardam, durante quanto tempo e onde?

Obrigado,
[nome] — EKAYA
[email de contacto] · [telefone]
