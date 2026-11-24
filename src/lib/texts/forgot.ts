/** FORGOT_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const FORGOT_TXT = {
  pt: {
    title: "Esqueci-me da palavra-passe",
    subtitle:
      "Indica o email da tua conta. Enviamos uma ligação para definires uma nova palavra-passe.",
    email: "Email",
    send: "Enviar ligação",
    sending: "A enviar…",
    sentTitle: "Verifica o teu email",
    sent: "Se existir uma conta com este email, enviámos uma ligação para definires uma nova palavra-passe. Pode demorar alguns minutos — vê também a pasta de spam.",
    back: "Voltar ao login",
    forgotLink: "Esqueci-me da palavra-passe",
    errEmail: "Indica um email válido.",
    errRate: "Já pediste várias ligações seguidas. Aguarda alguns minutos e tenta novamente.",
    errNetwork: "Sem ligação. Verifica a internet e tenta novamente.",
    errGeneric: "Não foi possível enviar agora. Tenta novamente mais tarde.",
  },
  en: {
    title: "Forgot password",
    subtitle: "Enter your account email. We'll send a link to set a new password.",
    email: "Email",
    send: "Send link",
    sending: "Sending…",
    sentTitle: "Check your email",
    sent: "If an account exists for this email, we sent a link to set a new password. It can take a few minutes — check your spam folder too.",
    back: "Back to sign in",
    forgotLink: "Forgot password?",
    errEmail: "Enter a valid email.",
    errRate: "You requested several links in a row. Wait a few minutes and try again.",
    errNetwork: "No connection. Check the internet and try again.",
    errGeneric: "Could not send right now. Please try again later.",
  },
} as const;
