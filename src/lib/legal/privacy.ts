import type { Lang } from "@/contexts/LanguageContext";
import { SUPPORT_EMAIL } from "@/lib/app-info";
import { entityLines, type LegalDoc } from "@/lib/legal/doc";

/** Privacy Policy — draft, subject to legal review. Lists only the processing the app does today. */
export function privacyDoc(lang: Lang): LegalDoc {
  return lang === "pt" ? privacyPt() : privacyEn();
}

function privacyPt(): LegalDoc {
  return {
    title: "Política de Privacidade",
    sections: [
      {
        id: "responsavel",
        heading: "1. Responsável pelo tratamento",
        blocks: [
          entityLines("pt"),
          "Esta política aplica-se à aplicação EKAYA Explore. Segue a lei de Moçambique e, para quem está na União Europeia, o Regulamento Geral sobre a Proteção de Dados (RGPD).",
        ],
      },
      {
        id: "dados",
        heading: "2. Que dados recolhemos",
        blocks: [
          [
            "Conta: email, nome de utilizador, nome a mostrar e, se quiseres, foto de perfil e telefone. A palavra-passe é guardada cifrada pelo serviço de autenticação; o EKAYA nunca a vê.",
            "Preferências: províncias, interesses e outras escolhas de viagem, e as notificações que silenciaste.",
            "Reservas: nome, telefone, email, notas, data, horário e número de pessoas.",
            "Atividade: favoritos, roteiros e o seu progresso, respostas e provas dos jogos, pontos e recompensas, publicações e fotos da comunidade, reações e denúncias.",
            "Localização: só quando a permites no teu dispositivo, para te mostrar no mapa ou para registar uma prova num local. Podes retirar a permissão a qualquer momento no browser.",
            "Negócios: dados do negócio e contactos que o dono decide publicar.",
            "Aceitação destes documentos: versão e data em que aceitaste os Termos e esta Política.",
            "Dados técnicos: o alojamento regista dados de acesso (endereço IP, browser, páginas vistas) para segurança e estatísticas agregadas de visitas.",
            "Pedido de adesão (Para negócios): nome do negócio, província, categoria, o teu nome e contacto, se aceitas reservas e a mensagem que escreveres. Para limitar envios abusivos guardamos um código diário calculado a partir do endereço IP, que não permite recuperá-lo.",
            "Destaques pagos por negócios: referência, datas, valor e o comprovativo de pagamento M-Pesa indicado ao EKAYA.",
            "Assistente de ajuda: as perguntas a que não soube responder são guardadas sem conta nem endereço IP, com emails e números escondidos; as avaliações (ajudou ou não) são anónimas.",
            "Erros técnicos da aplicação: página, mensagem de erro e versão da app, sem dados pessoais.",
          ],
        ],
      },
      {
        id: "finalidades",
        heading: "3. Para que usamos os dados e com que base",
        blocks: [
          [
            "Criar e gerir a tua conta e prestar o serviço que pediste — execução do contrato (estes Termos).",
            "Enviar o teu pedido de reserva ao negócio e mantê-lo informado — execução do contrato.",
            "Mostrar o que publicas na comunidade e nos roteiros públicos — execução do contrato; podes apagar o que publicaste.",
            "Usar a tua localização — consentimento, que podes retirar no browser.",
            "Enviar notificações na aplicação — execução do contrato. As de reservas e segurança não se podem silenciar; as outras sim, nas Definições.",
            "Proteger a plataforma contra abuso e fraude — interesse legítimo.",
            "Publicar estatísticas agregadas de impacto, sem identificar ninguém e sem contas de teste ou da equipa — interesse legítimo.",
            "Cumprir obrigações legais — obrigação legal.",
          ],
          "Não usamos os teus dados para publicidade de terceiros, não os vendemos e não tomamos decisões automáticas com efeitos legais sobre ti.",
        ],
      },
      {
        id: "partilha",
        heading: "4. Com quem partilhamos",
        blocks: [
          [
            "Negócio da reserva: recebe o nome, o contacto, as notas e os detalhes da reserva que fizeste.",
            "Público: o que publicas na comunidade e nos roteiros públicos, com o teu nome a mostrar e a tua foto de perfil.",
            "Lovable (alojamento da aplicação e da base de dados) e Supabase (base de dados, autenticação e ficheiros), como subcontratantes.",
            "Serviços chamados pelo teu browser quando usas o mapa e as rotas: OpenStreetMap e Esri (mapas), OSRM (cálculo de rotas, recebe as coordenadas dos pontos da rota), Open-Meteo (previsão do tempo dos destinos) e Unsplash (imagens). Recebem o teu endereço IP.",
          ],
          "Hoje não há fornecedor de pagamentos na aplicação: os destaques dos negócios pagam-se por M-Pesa, fora da aplicação. O assistente de ajuda responde a partir de perguntas frequentes, sem inteligência artificial. Se forem acrescentados fornecedores ou inteligência artificial, serão indicados aqui antes de serem usados.",
        ],
      },
      {
        id: "transferencias",
        heading: "5. Transferências para fora de Moçambique",
        blocks: [
          "Alguns subcontratantes tratam dados fora de Moçambique e da União Europeia. Nesses casos, exigimos garantias adequadas, como as cláusulas contratuais aprovadas para o efeito.",
        ],
      },
      {
        id: "prazos",
        heading: "6. Durante quanto tempo guardamos os dados",
        blocks: [
          [
            "Conta, preferências, favoritos e atividade: enquanto a conta existir.",
            "Ao apagar a conta: se não tiveres reservas nem outros registos, a conta e os dados são apagados. Se tiveres, a conta é anonimizada: as reservas passadas ficam com o negócio, sem o teu nome nem contactos, e o login deixa de funcionar.",
            "Fotos e provas de contas apagadas deixam de estar acessíveis e serão eliminadas por uma limpeza periódica (em preparação).",
            "Perguntas sem resposta e avaliações do assistente, e erros técnicos: 30 dias, apagados automaticamente.",
            "Pedidos de adesão: enquanto forem precisos para o contacto ou, se derem origem a um negócio, enquanto o negócio existir. Podes pedir que sejam apagados.",
            "Destaques e comprovativos de pagamento: pelo prazo exigido pela lei para documentos contabilísticos.",
            "Registo da aceitação dos Termos e desta Política: enquanto a conta existir, como prova da aceitação.",
            "Dados técnicos de acesso: pelos prazos dos subcontratantes de alojamento.",
          ],
        ],
      },
      {
        id: "direitos",
        heading: "7. Os teus direitos",
        blocks: [
          [
            "Acesso e portabilidade: Definições → Privacidade → Exportar os meus dados.",
            "Retificação: Definições → Perfil e Conta.",
            "Apagamento: Definições → Privacidade → Apagar conta.",
            "Oposição, limitação e retirada do consentimento: pelo email de contacto, ou no browser, no caso da localização.",
          ],
          `Respondemos no prazo de um mês. Contacto: ${SUPPORT_EMAIL}. Podes também apresentar queixa à autoridade de proteção de dados competente.`,
        ],
      },
      {
        id: "seguranca",
        heading: "8. Segurança",
        blocks: [
          "As ligações são cifradas (HTTPS). Cada pessoa só tem acesso aos seus próprios dados, por regras aplicadas na base de dados. As fotos privadas são servidas por links temporários. O acesso de administração é limitado à equipa.",
        ],
      },
      {
        id: "menores",
        heading: "9. Menores",
        blocks: [
          "O EKAYA destina-se a maiores de 18 anos. Quem tiver menos de 18 anos só o pode usar com a autorização de quem tem a sua responsabilidade legal.",
        ],
      },
      {
        id: "armazenamento",
        heading: "10. Armazenamento no teu dispositivo",
        blocks: [
          "Guardamos no teu browser apenas o que a aplicação precisa para funcionar: a sessão de login, o idioma, o tema e o modo convidado. Não usamos cookies de publicidade nem ferramentas de análise de terceiros.",
        ],
      },
      {
        id: "alteracoes",
        heading: "11. Alterações a esta Política",
        blocks: [
          "Quando esta Política mudar, publicamos uma nova versão com a data. A aplicação pede-te para a aceitares antes de continuares.",
        ],
      },
    ],
  };
}

function privacyEn(): LegalDoc {
  return {
    title: "Privacy Policy",
    sections: [
      {
        id: "responsavel",
        heading: "1. Data controller",
        blocks: [
          entityLines("en"),
          "This policy applies to the EKAYA Explore app. It follows the law of Mozambique and, for people in the European Union, the General Data Protection Regulation (GDPR).",
        ],
      },
      {
        id: "dados",
        heading: "2. What data we collect",
        blocks: [
          [
            "Account: email, username, display name and, if you choose, a profile photo and phone number. Your password is stored encrypted by the authentication service; EKAYA never sees it.",
            "Preferences: provinces, interests and other travel choices, and the notifications you muted.",
            "Bookings: name, phone, email, notes, date, time and number of people.",
            "Activity: favourites, itineraries and their progress, game answers and proofs, points and rewards, community posts and photos, reactions and reports.",
            "Location: only when you allow it on your device, to show you on the map or to record a proof at a place. You can withdraw the permission at any time in your browser.",
            "Businesses: business details and the contacts the owner chooses to publish.",
            "Acceptance of these documents: the version and date on which you accepted the Terms and this Policy.",
            "Technical data: the hosting service logs access data (IP address, browser, pages viewed) for security and aggregated visit statistics.",
            "Request to join (For businesses): business name, province, category, your name and contact, whether you take bookings and the message you write. To limit abusive sending we keep a daily code computed from the IP address, which does not allow it to be recovered.",
            "Highlights paid by businesses: reference, dates, amount and the M-Pesa payment proof given to EKAYA.",
            "Help assistant: questions it could not answer are kept without account or IP address, with emails and numbers hidden; ratings (helped or not) are anonymous.",
            "Technical errors in the app: page, error message and app version, without personal data.",
          ],
        ],
      },
      {
        id: "finalidades",
        heading: "3. Why we use the data and on what basis",
        blocks: [
          [
            "Create and manage your account and provide the service you asked for — performance of the contract (these Terms).",
            "Send your booking request to the business and keep it informed — performance of the contract.",
            "Show what you post in the community and in public itineraries — performance of the contract; you can delete what you posted.",
            "Use your location — consent, which you can withdraw in your browser.",
            "Send in-app notifications — performance of the contract. Booking and security notifications cannot be muted; the others can, in Settings.",
            "Protect the platform against abuse and fraud — legitimate interest.",
            "Publish aggregated impact statistics, identifying no one and excluding test and team accounts — legitimate interest.",
            "Comply with legal obligations — legal obligation.",
          ],
          "We do not use your data for third-party advertising, we do not sell it and we make no automated decisions with legal effects on you.",
        ],
      },
      {
        id: "partilha",
        heading: "4. Who we share it with",
        blocks: [
          [
            "The business you book with: receives your name, contact, notes and the booking details.",
            "The public: what you post in the community and in public itineraries, with your display name and profile photo.",
            "Lovable (app and database hosting) and Supabase (database, authentication and files), as processors.",
            "Services your browser calls when you use the map and routes: OpenStreetMap and Esri (maps), OSRM (route calculation, receives the coordinates of the route points), Open-Meteo (weather forecasts for destinations) and Unsplash (images). They receive your IP address.",
          ],
          "Today there is no payment provider in the app: business highlights are paid by M-Pesa, outside the app. The help assistant answers from frequently asked questions, without artificial intelligence. If providers or artificial intelligence are added, they will be listed here before they are used.",
        ],
      },
      {
        id: "transferencias",
        heading: "5. Transfers outside Mozambique",
        blocks: [
          "Some processors handle data outside Mozambique and the European Union. In those cases we require appropriate safeguards, such as the contractual clauses approved for that purpose.",
        ],
      },
      {
        id: "prazos",
        heading: "6. How long we keep the data",
        blocks: [
          [
            "Account, preferences, favourites and activity: while the account exists.",
            "When you delete your account: if you have no bookings or other records, the account and its data are deleted. If you do, the account is anonymised: past bookings stay with the business without your name or contacts, and you can no longer sign in.",
            "Photos and proofs of deleted accounts are no longer accessible and will be removed by a periodic clean-up (being prepared).",
            "Unanswered questions and ratings of the assistant, and technical errors: 30 days, deleted automatically.",
            "Requests to join: while needed to contact you or, if they lead to a business, while the business exists. You can ask for them to be deleted.",
            "Highlights and payment proofs: for the period the law requires for accounting records.",
            "Record of your acceptance of the Terms and this Policy: while the account exists, as proof of acceptance.",
            "Technical access data: for the periods set by the hosting processors.",
          ],
        ],
      },
      {
        id: "direitos",
        heading: "7. Your rights",
        blocks: [
          [
            "Access and portability: Settings → Privacy → Export my data.",
            "Correction: Settings → Profile and Account.",
            "Erasure: Settings → Privacy → Delete account.",
            "Objection, restriction and withdrawal of consent: through the contact email, or in your browser for location.",
          ],
          `We reply within one month. Contact: ${SUPPORT_EMAIL}. You can also complain to the competent data protection authority.`,
        ],
      },
      {
        id: "seguranca",
        heading: "8. Security",
        blocks: [
          "Connections are encrypted (HTTPS). Each person can only access their own data, through rules enforced in the database. Private photos are served through temporary links. Administration access is limited to the team.",
        ],
      },
      {
        id: "menores",
        heading: "9. Minors",
        blocks: [
          "EKAYA is intended for people aged 18 or over. People under 18 may only use it with the permission of the person legally responsible for them.",
        ],
      },
      {
        id: "armazenamento",
        heading: "10. Storage on your device",
        blocks: [
          "We only store in your browser what the app needs to work: your sign-in session, language, theme and guest mode. We use no advertising cookies and no third-party analytics tools.",
        ],
      },
      {
        id: "alteracoes",
        heading: "11. Changes to this Policy",
        blocks: [
          "When this Policy changes, we publish a new dated version. The app asks you to accept it before you continue.",
        ],
      },
    ],
  };
}
