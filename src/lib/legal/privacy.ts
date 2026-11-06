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
            "Subcontratantes que tratam dados por nossa conta: Lovable (alojamento da aplicação e da base de dados), Supabase (base de dados, autenticação e ficheiros) e Cloudflare (rede e execução da aplicação, através do alojamento). Recebem os dados da conta e da atividade guardados na aplicação e os dados técnicos de acesso.",
            "Serviços chamados pelo teu browser quando usas o mapa, as rotas ou a meteorologia: OpenStreetMap e Esri/ArcGIS (mapas), OSRM (cálculo de rotas, recebe as coordenadas dos pontos da rota) e Open-Meteo (previsão do tempo dos destinos). Recebem o teu endereço IP e as coordenadas pedidas, não a tua conta.",
          ],
          "As fontes de letra e as imagens da aplicação são servidas pelo próprio EKAYA: não usamos Google Fonts nem bancos de imagens externos. Hoje não há fornecedor de pagamentos na aplicação: os destaques dos negócios pagam-se por M-Pesa, fora da aplicação.",
          "Assistente de ajuda: responde de forma automática a partir das perguntas frequentes do EKAYA, sem inteligência artificial generativa. Se um dia passar a usar um fornecedor de inteligência artificial, este será indicado aqui antes de ser usado, com os dados que recebe (a pergunta, sem conta nem endereço IP), e o assistente passará a avisar que as respostas são geradas por IA e podem ter erros.",
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
          {
            table: [
              ["Dados", "Prazo"],
              ["Conta, preferências, favoritos e atividade", "Enquanto a conta existir."],
              [
                "Reservas",
                "Enquanto a conta existir. Se apagares a conta, as reservas passadas ficam com o negócio, sem o teu nome nem contactos.",
              ],
              [
                "Fotos e provas (comunidade, roteiros e jogos)",
                "Enquanto a conta existir. As de contas apagadas deixam de estar acessíveis e serão eliminadas por uma limpeza periódica (em preparação).",
              ],
              [
                "Perguntas sem resposta e avaliações do assistente",
                "30 dias, apagadas automaticamente.",
              ],
              ["Registo de erros técnicos", "30 dias, apagado automaticamente."],
              [
                "Registo de auditoria das ações de administração",
                "Enquanto for preciso para a segurança e para provar as decisões tomadas; revisto uma vez por ano.",
              ],
              [
                "Pedidos de adesão",
                "Enquanto forem precisos para o contacto ou, se derem origem a um negócio, enquanto o negócio existir. Podes pedir que sejam apagados.",
              ],
              [
                "Destaques e comprovativos de pagamento",
                "Pelo prazo exigido pela lei para documentos contabilísticos.",
              ],
              ["Aceitação dos Termos e desta Política", "Enquanto a conta existir, como prova."],
              ["Dados técnicos de acesso", "Pelos prazos dos subcontratantes de alojamento."],
            ],
          },
          "Ao apagar a conta: se não tiveres reservas nem outros registos, a conta e os dados são apagados. Se tiveres, a conta é anonimizada e o login deixa de funcionar.",
        ],
      },
      {
        id: "direitos",
        heading: "7. Os teus direitos",
        blocks: [
          [
            "Acesso e portabilidade: Definições → Privacidade → Exportar os meus dados.",
            "Retificação: corrige o nome, a foto, o telefone e as preferências em Definições → Perfil e Conta. Para corrigir outros dados (por exemplo, uma reserva ou o email), pede por email, indicando o que está errado e o valor certo.",
            "Apagamento: Definições → Privacidade → Apagar conta.",
            "Oposição, limitação e retirada do consentimento: pelo email de contacto, ou no browser, no caso da localização.",
          ],
          `Contacto para questões de privacidade: ${SUPPORT_EMAIL}. Respondemos no prazo de 30 dias a contar do pedido; se o pedido for complexo, avisamos-te dentro desse prazo e o prazo pode ser prolongado, no máximo, por mais 60 dias. Podemos pedir-te que confirmes a identidade antes de responder. Podes também apresentar queixa à autoridade de proteção de dados competente.`,
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
        heading: "10. Cookies e armazenamento local",
        blocks: [
          "Guardamos no teu browser apenas o que a aplicação precisa para funcionar. Não usamos cookies de publicidade nem ferramentas de análise de terceiros, por isso não te pedimos consentimento para cookies. Esta é a lista completa:",
          {
            table: [
              ["O que é guardado", "Para quê e durante quanto tempo"],
              [
                "Sessão de login (sb-…-auth-token, armazenamento local)",
                "Manter-te com sessão iniciada. Até terminares a sessão.",
              ],
              [
                "Idioma (ekaya.lang, cookie e armazenamento local)",
                "Mostrar a aplicação no teu idioma desde a primeira página. O cookie dura 1 ano; o armazenamento local, até o apagares.",
              ],
              [
                "Tema (ekaya.theme, armazenamento local)",
                "Lembrar o tema claro ou escuro. Até o apagares.",
              ],
              [
                "Modo convidado (ekaya.guest-mode, armazenamento da sessão)",
                "Explorar sem conta. Apagado quando fechas o separador.",
              ],
              [
                "Recuperação da palavra-passe (ekaya.recovery, armazenamento local)",
                "Reconhecer o link de recuperação que pediste. Válido 1 hora e apagado quando defines a nova palavra-passe.",
              ],
              [
                "Aviso de armazenamento (ekaya.storage-notice, armazenamento local)",
                "Não voltar a mostrar este aviso. Até o apagares.",
              ],
            ],
          },
          "Versões antigas da aplicação guardavam os favoritos no browser (ekaya_favorites); são passados para a tua conta e apagados do browser. Podes apagar tudo isto nas definições do browser; a aplicação volta aos valores por omissão.",
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
            "Processors that handle data on our behalf: Lovable (app and database hosting), Supabase (database, authentication and files) and Cloudflare (network and running the app, through the hosting). They receive the account and activity data stored in the app and the technical access data.",
            "Services your browser calls when you use the map, routes or weather: OpenStreetMap and Esri/ArcGIS (maps), OSRM (route calculation, receives the coordinates of the route points) and Open-Meteo (weather forecasts for destinations). They receive your IP address and the coordinates requested, not your account.",
          ],
          "The app's fonts and images are served by EKAYA itself: we do not use Google Fonts or external image banks. Today there is no payment provider in the app: business highlights are paid by M-Pesa, outside the app.",
          "Help assistant: it answers automatically from the EKAYA frequently asked questions, without generative artificial intelligence. If it ever uses an artificial intelligence provider, that provider will be listed here before it is used, with the data it receives (the question, without account or IP address), and the assistant will warn that its answers are AI-generated and may contain mistakes.",
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
          {
            table: [
              ["Data", "Period"],
              ["Account, preferences, favourites and activity", "While the account exists."],
              [
                "Bookings",
                "While the account exists. If you delete your account, past bookings stay with the business without your name or contacts.",
              ],
              [
                "Photos and proofs (community, itineraries and games)",
                "While the account exists. Those of deleted accounts are no longer accessible and will be removed by a periodic clean-up (being prepared).",
              ],
              [
                "Unanswered questions and ratings of the assistant",
                "30 days, deleted automatically.",
              ],
              ["Technical error log", "30 days, deleted automatically."],
              [
                "Audit log of administration actions",
                "While needed for security and to prove the decisions taken; reviewed once a year.",
              ],
              [
                "Requests to join",
                "While needed to contact you or, if they lead to a business, while the business exists. You can ask for them to be deleted.",
              ],
              [
                "Highlights and payment proofs",
                "For the period the law requires for accounting records.",
              ],
              ["Acceptance of the Terms and this Policy", "While the account exists, as proof."],
              ["Technical access data", "For the periods set by the hosting processors."],
            ],
          },
          "When you delete your account: if you have no bookings or other records, the account and its data are deleted. If you do, the account is anonymised and you can no longer sign in.",
        ],
      },
      {
        id: "direitos",
        heading: "7. Your rights",
        blocks: [
          [
            "Access and portability: Settings → Privacy → Export my data.",
            "Correction: fix your name, photo, phone and preferences in Settings → Profile and Account. To correct other data (for example, a booking or your email), ask by email, saying what is wrong and the right value.",
            "Erasure: Settings → Privacy → Delete account.",
            "Objection, restriction and withdrawal of consent: through the contact email, or in your browser for location.",
          ],
          `Contact for privacy questions: ${SUPPORT_EMAIL}. We reply within 30 days of the request; if the request is complex, we tell you within that period and it may be extended by up to 60 more days. We may ask you to confirm your identity before replying. You can also complain to the competent data protection authority.`,
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
        heading: "10. Cookies and local storage",
        blocks: [
          "We only store in your browser what the app needs to work. We use no advertising cookies and no third-party analytics tools, so we do not ask you to consent to cookies. This is the full list:",
          {
            table: [
              ["What is stored", "What for and for how long"],
              [
                "Sign-in session (sb-…-auth-token, local storage)",
                "Keep you signed in. Until you sign out.",
              ],
              [
                "Language (ekaya.lang, cookie and local storage)",
                "Show the app in your language from the first page. The cookie lasts 1 year; local storage, until you clear it.",
              ],
              [
                "Theme (ekaya.theme, local storage)",
                "Remember the light or dark theme. Until you clear it.",
              ],
              [
                "Guest mode (ekaya.guest-mode, session storage)",
                "Explore without an account. Removed when you close the tab.",
              ],
              [
                "Password recovery (ekaya.recovery, local storage)",
                "Recognise the recovery link you asked for. Valid for 1 hour and removed when you set the new password.",
              ],
              [
                "Storage notice (ekaya.storage-notice, local storage)",
                "Not show this notice again. Until you clear it.",
              ],
            ],
          },
          "Older versions of the app kept favourites in the browser (ekaya_favorites); they are moved to your account and removed from the browser. You can clear all of this in your browser settings; the app goes back to its defaults.",
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
