/**
 * Texts of /precos-e-reembolsos. Kept in their own module (imported only by that route) so they stay
 * out of the first-load bundle. Covered by the parity test in page-texts.test.ts.
 * Values (rates, prices) are never written here: they come from the commercial settings (0053).
 */
export const PRICING_TXT = {
  pt: {
    metaTitle: "Preços e reembolsos — Ekaya Explore",
    metaDescription:
      "Comissão, destaques, Parceiro Fundador, pagamento por M-Pesa, cancelamento e reembolso.",
    title: "Preços e reembolsos",
    draft: "Rascunho — sujeito a revisão jurídica",
    intro:
      "Os valores desta página vêm das condições comerciais em vigor no EKAYA e mudam aqui automaticamente quando forem alterados. Para os turistas, usar o EKAYA é gratuito.",
    loading: "A carregar…",
    errLoad: "Não foi possível carregar as condições em vigor.",
    retry: "Tentar novamente",
    version: (v: number, d: string) => `Condições em vigor: versão ${v}, desde ${d}.`,
    commissionTitle: "Comissão sobre reservas",
    commissionBody:
      "O perfil do negócio é gratuito. A comissão aplica-se só a reservas pagas através do EKAYA; hoje ainda não há pagamento na aplicação, por isso nada é cobrado sobre reservas.",
    highlightsTitle: "Destaques e campanhas",
    highlightsBody: (week: string, month: string) =>
      `Um destaque com a etiqueta Patrocinado custa ${week} por semana ou ${month} por mês. O preço fica fixo no momento do pedido.`,
    founderTitle: "Parceiro Fundador",
    founderBody: (n: number, months: number, rate: string, free: number) =>
      `Os primeiros ${n} negócios pagam ${rate} de comissão durante ${months} meses e têm ${free} destaque(s) grátis.`,
    planTitle: "Plano Parceiro (opcional)",
    planBody: (price: string) => `${price} por mês. Ainda não está disponível para subscrição.`,
    payTitle: "Como se paga",
    payBody: [
      "Os destaques pagam-se por M-Pesa, fora da aplicação, depois de o EKAYA aprovar o pedido.",
      "Cada pedido tem uma referência única (EKD-…), que deves indicar na mensagem do pagamento.",
      "Quando o EKAYA confirma o pagamento, o destaque fica pago e é ativado na data de início.",
      "Recebes um recibo no painel do negócio. É um comprovativo interno, documento não fiscal: não substitui fatura nem recibo fiscal.",
    ],
    refundTitle: "Cancelamento e reembolso dos destaques",
    refundBefore:
      "Antes de o destaque ficar ativo: podes cancelar o pedido no painel do negócio. Se já tiveres pago, recebes o reembolso total.",
    refundAfter:
      "Depois de o destaque estar ativo: não há reembolso, mesmo que o canceles antes do fim do período.",
    refundAdmin:
      "Se o EKAYA cancelar um destaque (por exemplo, por violar as regras), o motivo fica registado e o reembolso segue a regra acima.",
    deadlineTitle: "Prazo e como pedir",
    deadlineBody: (email: string) =>
      `Pede o reembolso por email para ${email}, com a referência do destaque. Prazo (a confirmar com o jurista): o reembolso é feito por M-Pesa em até 14 dias depois de aprovado.`,
    termsNote: "Estas regras fazem parte dos Termos de Utilização.",
    readTerms: "Ler os Termos de Utilização",
    forBusiness: "Para negócios",
  },
  en: {
    metaTitle: "Prices and refunds — Ekaya Explore",
    metaDescription:
      "Commission, highlights, Founding Partner, payment by M-Pesa, cancellation and refunds.",
    title: "Prices and refunds",
    draft: "Draft — subject to legal review",
    intro:
      "The figures on this page come from the commercial terms in force at EKAYA and update here automatically when they change. For visitors, using EKAYA is free.",
    loading: "Loading…",
    errLoad: "Could not load the terms in force.",
    retry: "Try again",
    version: (v: number, d: string) => `Terms in force: version ${v}, since ${d}.`,
    commissionTitle: "Commission on bookings",
    commissionBody:
      "The business profile is free. Commission only applies to bookings paid through EKAYA; there is no payment in the app yet, so nothing is charged on bookings.",
    highlightsTitle: "Highlights and campaigns",
    highlightsBody: (week: string, month: string) =>
      `A highlight with the Sponsored label costs ${week} per week or ${month} per month. The price is fixed when you send the request.`,
    founderTitle: "Founding Partner",
    founderBody: (n: number, months: number, rate: string, free: number) =>
      `The first ${n} businesses pay ${rate} commission for ${months} months and get ${free} free highlight(s).`,
    planTitle: "Partner plan (optional)",
    planBody: (price: string) => `${price} per month. Not open for subscription yet.`,
    payTitle: "How to pay",
    payBody: [
      "Highlights are paid by M-Pesa, outside the app, after EKAYA approves the request.",
      "Each request has a unique reference (EKD-…), which you include in the payment message.",
      "When EKAYA confirms the payment, the highlight is marked paid and goes live on its start date.",
      "You get a receipt in the business dashboard. It is an internal proof, not a tax document: it does not replace an invoice or a tax receipt.",
    ],
    refundTitle: "Cancelling and refunding highlights",
    refundBefore:
      "Before the highlight goes live: you can cancel the request in the business dashboard. If you have already paid, you get a full refund.",
    refundAfter:
      "After the highlight is live: there is no refund, even if you cancel it before the end of the period.",
    refundAdmin:
      "If EKAYA cancels a highlight (for example, because it breaks the rules), the reason is recorded and the refund follows the rule above.",
    deadlineTitle: "Deadline and how to ask",
    deadlineBody: (email: string) =>
      `Ask for the refund by email at ${email}, with the highlight reference. Deadline (to be confirmed with our lawyer): the refund is paid by M-Pesa within 14 days of approval.`,
    termsNote: "These rules are part of the Terms of Use.",
    readTerms: "Read the Terms of Use",
    forBusiness: "For businesses",
  },
} as const;
