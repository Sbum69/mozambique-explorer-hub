/** SUPPORT_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const SUPPORT_TXT = {
  pt: {
    title: "Suporte",
    when: "Escreve-nos se tiveres um problema com uma reserva, com a tua conta ou com os teus dados pessoais, ou se vires conteúdo que não está certo.",
    emailLabel: (email: string) => `Enviar email para o suporte: ${email}`,
    phoneLabel: (phone: string) => `Ligar para o suporte: ${phone}`,
    legalLabel: "Termos e privacidade",
    terms: "Termos",
    privacy: "Política de Privacidade",
  },
  en: {
    title: "Support",
    when: "Write to us if you have a problem with a booking, with your account or with your personal data, or if you see content that is not right.",
    emailLabel: (email: string) => `Email support: ${email}`,
    phoneLabel: (phone: string) => `Call support: ${phone}`,
    legalLabel: "Terms and privacy",
    terms: "Terms",
    privacy: "Privacy Policy",
  },
} as const;
