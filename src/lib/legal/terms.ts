import type { Lang } from "@/contexts/LanguageContext";
import { SUPPORT_EMAIL } from "@/lib/app-info";
import { entityLines, type LegalDoc } from "@/lib/legal/doc";

/** Terms of Use — draft, subject to legal review. Describes only what the app does today. */
export function termsDoc(lang: Lang): LegalDoc {
  return lang === "pt" ? termsPt() : termsEn();
}

function termsPt(): LegalDoc {
  return {
    title: "Termos de Utilização",
    sections: [
      {
        id: "quem-somos",
        heading: "1. Quem somos e aceitação",
        blocks: [
          "O EKAYA Explore é uma plataforma de turismo comunitário em Moçambique que liga turistas, negócios locais e comunidades.",
          entityLines("pt"),
          "Ao criar uma conta, aceitas estes Termos e a Política de Privacidade. Podes ver a aplicação sem conta, mas reservar, guardar favoritos, publicar ou participar em jogos exige uma conta.",
        ],
      },
      {
        id: "servico",
        heading: "2. O que o EKAYA faz — e o que não faz",
        blocks: [
          "O EKAYA mostra destinos, roteiros, experiências de negócios locais, conteúdos da comunidade, jogos e pontos.",
          "As atividades e os serviços turísticos são prestados pelos negócios, não pelo EKAYA. O EKAYA é o espaço onde o turista e o negócio se encontram.",
        ],
      },
      {
        id: "contas",
        heading: "3. Contas e papéis",
        blocks: [
          [
            "Turista: descobre conteúdos, faz pedidos de reserva, guarda favoritos, publica na comunidade e participa em roteiros e jogos.",
            "Negócio: o dono regista o negócio, que só aparece ao público depois de aprovado pela administração. Cada negócio tem um único dono.",
            "Administração: aprova negócios e conteúdos, gere reservas em caso de problema e modera a comunidade.",
          ],
          "Tens de ter pelo menos 18 anos, ou usar o EKAYA com a autorização de quem tem a tua responsabilidade legal.",
          "Os dados da tua conta têm de ser verdadeiros. És responsável por manter a tua palavra-passe segura e por tudo o que é feito com a tua conta.",
        ],
      },
      {
        id: "reservas",
        heading: "4. Reservas e cancelamento",
        blocks: [
          [
            "Um pedido de reserva fica pendente até o negócio o confirmar ou rejeitar. Só há pedidos enquanto houver lugares no horário escolhido.",
            "Se o negócio não responder até à hora de início, o pedido expira e é cancelado automaticamente.",
            "Podes cancelar um pedido enquanto estiver pendente. Depois de confirmado, fala com o negócio.",
            "O negócio pode cancelar uma reserva confirmada, indicando o motivo, e marcar a não comparência depois da hora de início.",
            "O preço mostrado é o que o negócio definiu no momento do pedido.",
            "Hoje, o pagamento não é feito na aplicação: combina-se diretamente com o negócio.",
          ],
          "Quando houver pagamento na aplicação, as regras de pagamento, reembolso e cancelamento das reservas serão publicadas nestes Termos e na página Preços e reembolsos antes de entrarem em vigor.",
        ],
      },
      {
        id: "taxas",
        heading: "5. Taxas e comissões da plataforma",
        blocks: [
          "Hoje, usar o EKAYA é gratuito para turistas e o perfil básico é gratuito para negócios. Nenhum negócio é obrigado a aceitar reservas nem a pagar.",
          "O EKAYA poderá cobrar aos negócios uma comissão sobre reservas pagas na aplicação, destaques patrocinados e um plano opcional. Os valores em vigor, a forma de pagamento (M-Pesa, fora da aplicação) e as regras de cancelamento e reembolso dos destaques estão na página Preços e reembolsos (/precos-e-reembolsos), que faz parte destes Termos. Nenhum valor é cobrado sem estar publicado nessa página.",
          "Nada é cobrado sem aviso prévio e sem o negócio aceitar. Antes de aderir, o negócio vê sempre o total descontado: comissão e taxa do fornecedor de pagamento.",
          "Ao turista não serão acrescentadas taxas do EKAYA ao preço do negócio.",
        ],
      },
      {
        id: "patrocinado",
        heading: "6. Conteúdo patrocinado",
        blocks: [
          'Os destaques e campanhas pagos pelos negócios aparecem sempre com a etiqueta "Patrocinado" e em espaços próprios. Não alteram a ordem dos resultados de pesquisa.',
          "Os apoios de entidades (turismo, organizações, marcas) são identificados como tal.",
        ],
      },
      {
        id: "negocios",
        heading: "7. Responsabilidade dos negócios",
        blocks: [
          [
            "Manter verdadeira e atualizada a informação que publicam: descrição, preços, horários, capacidade, contactos e localização.",
            "Prestar os serviços confirmados e responder aos pedidos de reserva.",
            "Ter as licenças exigidas pela lei e cumprir as regras de segurança, de consumo e fiscais da sua atividade.",
            "Tratar os dados dos clientes que recebem com uma reserva só para essa reserva.",
          ],
          "O EKAYA pode recusar, suspender ou retirar um negócio que não cumpra estas regras.",
        ],
      },
      {
        id: "conteudo",
        heading: "8. Conteúdo dos utilizadores e moderação",
        blocks: [
          "Continuas dono do que publicas (textos, fotos, roteiros, provas). Dás ao EKAYA autorização para o mostrar na aplicação enquanto estiver publicado.",
          [
            "É proibido publicar conteúdo ilegal, ofensivo, discriminatório, enganoso ou publicidade não identificada.",
            "É proibido publicar dados pessoais ou fotos de outras pessoas sem autorização.",
            "Só podes publicar fotos que tenhas tirado ou que tenhas direito a usar.",
          ],
          "A administração pode rever conteúdos antes de aparecerem, tratar denúncias, retirar conteúdos e suspender contas que não cumpram estas regras.",
        ],
      },
      {
        id: "pontos",
        heading: "9. Pontos e recompensas",
        blocks: [
          "Os pontos não têm valor em dinheiro, não se transmitem e só se usam nas recompensas publicadas na aplicação. Podem ser retirados se a ação que os deu deixar de valer (por exemplo, uma reserva que deixa de estar concluída) ou em caso de abuso.",
        ],
      },
      {
        id: "informacao",
        heading: "10. Informação turística, mapas e segurança",
        blocks: [
          "A informação sobre destinos, atividades e negócios vem dos negócios e de fontes publicadas, e pode mudar. Confirma com o negócio os dados importantes antes de viajar.",
          "Os mapas e as rotas são indicativos. A tua segurança pessoal durante a viagem é da tua responsabilidade: segue as indicações das autoridades locais.",
        ],
      },
      {
        id: "responsabilidade",
        heading: "11. Limitação de responsabilidade",
        blocks: [
          "Dentro do que a lei permite, o EKAYA não responde pelos serviços prestados pelos negócios nem por informação publicada por terceiros. Nada nestes Termos limita os direitos que a lei garante aos consumidores.",
        ],
      },
      {
        id: "apagar",
        heading: "12. Apagar a conta",
        blocks: [
          "Podes apagar a conta nas Definições → Privacidade. O que acontece aos teus dados está explicado na Política de Privacidade.",
        ],
      },
      {
        id: "alteracoes",
        heading: "13. Alterações a estes Termos",
        blocks: [
          "Quando estes Termos mudarem, publicamos uma nova versão com a data. A aplicação pede-te para a aceitares antes de continuares.",
        ],
      },
      {
        id: "lei",
        heading: "14. Lei aplicável",
        blocks: [
          "Estes Termos regem-se pela lei de Moçambique, sem prejuízo dos direitos que a lei do país de residência garante aos consumidores.",
        ],
      },
      {
        id: "contacto",
        heading: "15. Contacto",
        blocks: [`Para qualquer questão sobre estes Termos: ${SUPPORT_EMAIL}.`],
      },
    ],
  };
}

function termsEn(): LegalDoc {
  return {
    title: "Terms of Use",
    sections: [
      {
        id: "quem-somos",
        heading: "1. Who we are and acceptance",
        blocks: [
          "EKAYA Explore is a community tourism platform in Mozambique that connects tourists, local businesses and communities.",
          entityLines("en"),
          "By creating an account, you accept these Terms and the Privacy Policy. You can browse the app without an account, but booking, saving favourites, posting or taking part in games requires one.",
        ],
      },
      {
        id: "servico",
        heading: "2. What EKAYA does — and does not do",
        blocks: [
          "EKAYA shows destinations, itineraries, experiences from local businesses, community content, games and points.",
          "Activities and tourism services are provided by the businesses, not by EKAYA. EKAYA is the place where tourists and businesses meet.",
        ],
      },
      {
        id: "contas",
        heading: "3. Accounts and roles",
        blocks: [
          [
            "Tourist: discovers content, makes booking requests, saves favourites, posts in the community and takes part in itineraries and games.",
            "Business: the owner registers the business, which only becomes public after the administration approves it. Each business has a single owner.",
            "Administration: approves businesses and content, handles bookings when there is a problem and moderates the community.",
          ],
          "You must be at least 18 years old, or use EKAYA with the permission of the person legally responsible for you.",
          "Your account details must be true. You are responsible for keeping your password safe and for everything done with your account.",
        ],
      },
      {
        id: "reservas",
        heading: "4. Bookings and cancellation",
        blocks: [
          [
            "A booking request stays pending until the business confirms or rejects it. Requests are only possible while the chosen time slot has places.",
            "If the business does not answer by the start time, the request expires and is cancelled automatically.",
            "You can cancel a request while it is pending. Once it is confirmed, talk to the business.",
            "The business can cancel a confirmed booking, giving the reason, and mark a no-show after the start time.",
            "The price shown is the one the business set at the time of the request.",
            "Today, payment is not made in the app: it is arranged directly with the business.",
          ],
          "When in-app payment exists, the payment, refund and cancellation rules for bookings will be published in these Terms and on the Prices and refunds page before they take effect.",
        ],
      },
      {
        id: "taxas",
        heading: "5. Platform fees and commissions",
        blocks: [
          "Today, EKAYA is free for tourists and the basic profile is free for businesses. No business is required to accept bookings or to pay.",
          "EKAYA may charge businesses a commission on bookings paid in the app, sponsored highlights and an optional plan. The prices in force, how to pay (M-Pesa, outside the app) and the cancellation and refund rules for highlights are on the Prices and refunds page (/precos-e-reembolsos), which is part of these Terms. Nothing is charged unless it is published on that page.",
          "Nothing is charged without prior notice and without the business accepting. Before joining, the business always sees the total deducted: commission and payment provider fee.",
          "EKAYA will not add its own fees to the business's price for tourists.",
        ],
      },
      {
        id: "patrocinado",
        heading: "6. Sponsored content",
        blocks: [
          'Highlights and campaigns paid for by businesses always carry the "Sponsored" label and appear in their own spaces. They do not change the order of search results.',
          "Support from organisations (tourism bodies, NGOs, brands) is identified as such.",
        ],
      },
      {
        id: "negocios",
        heading: "7. Responsibilities of businesses",
        blocks: [
          [
            "Keep the information they publish true and up to date: description, prices, times, capacity, contacts and location.",
            "Provide the confirmed services and answer booking requests.",
            "Hold the licences required by law and follow the safety, consumer and tax rules of their activity.",
            "Use the customer data they receive with a booking only for that booking.",
          ],
          "EKAYA may refuse, suspend or remove a business that does not follow these rules.",
        ],
      },
      {
        id: "conteudo",
        heading: "8. User content and moderation",
        blocks: [
          "You keep ownership of what you post (texts, photos, itineraries, proofs). You allow EKAYA to show it in the app while it is published.",
          [
            "Posting illegal, offensive, discriminatory or misleading content, or unidentified advertising, is not allowed.",
            "Posting other people's personal data or photos without their permission is not allowed.",
            "You may only post photos you took or have the right to use.",
          ],
          "The administration may review content before it appears, handle reports, remove content and suspend accounts that do not follow these rules.",
        ],
      },
      {
        id: "pontos",
        heading: "9. Points and rewards",
        blocks: [
          "Points have no cash value, cannot be transferred and can only be used for the rewards published in the app. They may be removed if the action that earned them no longer counts (for example, a booking that is no longer completed) or in case of abuse.",
        ],
      },
      {
        id: "informacao",
        heading: "10. Tourism information, maps and safety",
        blocks: [
          "Information about destinations, activities and businesses comes from the businesses and published sources, and may change. Confirm important details with the business before you travel.",
          "Maps and routes are indicative. Your personal safety while travelling is your responsibility: follow the guidance of local authorities.",
        ],
      },
      {
        id: "responsabilidade",
        heading: "11. Limitation of liability",
        blocks: [
          "To the extent the law allows, EKAYA is not liable for services provided by businesses or for information published by third parties. Nothing in these Terms limits the rights the law gives consumers.",
        ],
      },
      {
        id: "apagar",
        heading: "12. Deleting your account",
        blocks: [
          "You can delete your account in Settings → Privacy. What happens to your data is explained in the Privacy Policy.",
        ],
      },
      {
        id: "alteracoes",
        heading: "13. Changes to these Terms",
        blocks: [
          "When these Terms change, we publish a new dated version. The app asks you to accept it before you continue.",
        ],
      },
      {
        id: "lei",
        heading: "14. Governing law",
        blocks: [
          "These Terms are governed by the law of Mozambique, without prejudice to the rights consumers have under the law of their country of residence.",
        ],
      },
      {
        id: "contacto",
        heading: "15. Contact",
        blocks: [`For any question about these Terms: ${SUPPORT_EMAIL}.`],
      },
    ],
  };
}
