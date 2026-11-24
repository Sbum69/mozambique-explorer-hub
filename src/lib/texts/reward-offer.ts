/** REWARD_OFFER_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const REWARD_OFFER_TXT = {
  pt: {
    title: "Oferece um produto como recompensa aos utilizadores",
    body: "Qualquer produto ou serviço do teu negócio pode ser uma recompensa, não tem de ser uma experiência. Defines o título, a descrição, o custo em pontos, o stock e a validade.",
    delivery:
      "Não há pagamentos: os turistas trocam pontos pela recompensa e o teu negócio entrega-a a quem mostrar o voucher.",
    afterApproval: "Podes criá-la quando o negócio for aprovado.",
    optional: "Passo opcional",
    create: "Criar recompensa",
    later: "Agora não",
  },
  en: {
    title: "Offer a product as a reward to users",
    body: "Any product or service from your business can be a reward, it does not have to be an experience. You set the title, description, cost in points, stock and validity.",
    delivery:
      "There are no payments: travellers exchange points for the reward and your business hands it over to whoever shows the voucher.",
    afterApproval: "You can create it once the business is approved.",
    optional: "Optional step",
    create: "Create reward",
    later: "Not now",
  },
} as const;
