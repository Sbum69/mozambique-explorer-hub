/** LEGAL_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const LEGAL_TXT = {
  pt: {
    back: "Voltar",
    draft: "Rascunho — sujeito a revisão jurídica",
    draftBody:
      "Este texto ainda vai ser revisto por um jurista e pode mudar antes da versão final.",
    version: (v: string) => `Versão de ${v}`,
    contents: "Conteúdo",
    terms: "Termos",
    privacy: "Privacidade",
    credits: "Créditos",
    footerLabel: "Informação legal",
    pricing: "Preços e reembolsos",
    provider: "Fornecedor",
    nuitPending: "NUIT em processo",
    incorporating: "em constituição",
    promptTitle: "Atualizámos os nossos documentos",
    promptBody:
      "Para continuares a usar o EKAYA, lê e aceita os Termos de Utilização e a Política de Privacidade.",
    readTerms: "Ler os Termos de Utilização",
    readPrivacy: "Ler a Política de Privacidade",
    accept: "Aceito",
    accepting: "A guardar…",
    signOut: "Sair",
    errAccept: "Não foi possível guardar a aceitação. Tenta novamente.",
    errLoad: "Não foi possível confirmar a aceitação dos documentos.",
    retry: "Tentar novamente",
    opensNewTab: "(abre num novo separador)",
  },
  en: {
    back: "Back",
    draft: "Draft — subject to legal review",
    draftBody:
      "This text will still be reviewed by a lawyer and may change before the final version.",
    version: (v: string) => `Version of ${v}`,
    contents: "Contents",
    terms: "Terms",
    privacy: "Privacy",
    credits: "Credits",
    footerLabel: "Legal information",
    pricing: "Prices and refunds",
    provider: "Provider",
    nuitPending: "NUIT being registered",
    incorporating: "being incorporated",
    promptTitle: "We have updated our documents",
    promptBody:
      "To keep using EKAYA, please read and accept the Terms of Use and the Privacy Policy.",
    readTerms: "Read the Terms of Use",
    readPrivacy: "Read the Privacy Policy",
    accept: "I accept",
    accepting: "Saving…",
    signOut: "Sign out",
    errAccept: "Could not save your acceptance. Please try again.",
    errLoad: "Could not confirm that you accepted the documents.",
    retry: "Try again",
    opensNewTab: "(opens in a new tab)",
  },
} as const;

/** SEG-2 — two-factor authentication (Settings → Security, code prompt, admin requirement). */
