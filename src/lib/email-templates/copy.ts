import type { EmailCopy } from "./layout";

/**
 * Subjects and texts of the auth emails, PT first and EN below (docs/email-templates.md).
 * The Lovable webhook sends one email per event, with no language of the person: both go in it.
 */
type Kind = "signup" | "recovery" | "email_change" | "magiclink" | "reauthentication" | "invite";

export const EMAIL_COPY: Record<
  Kind,
  { subject: string; preview: string; button?: string; pt: EmailCopy; en: EmailCopy }
> = {
  signup: {
    subject: "Confirma a tua conta EKAYA · Confirm your EKAYA account",
    preview: "Confirma o teu email para ativar a conta EKAYA.",
    button: "Confirmar email · Confirm email",
    pt: {
      heading: "Bem-vindo/a à EKAYA",
      body: "Obrigado por te juntares à comunidade EKAYA. Confirma o teu email para ativar a conta e começar a descobrir Moçambique com quem o conhece por dentro.",
      note: "Se não criaste esta conta, ignora este email.",
    },
    en: {
      heading: "Welcome to EKAYA",
      body: "Thanks for joining the EKAYA community. Confirm your email to activate your account and start discovering Mozambique with the people who know it best.",
      note: "If you didn't create this account, you can ignore this email.",
    },
  },
  recovery: {
    subject: "Nova palavra-passe EKAYA · Reset your EKAYA password",
    preview: "Escolhe uma nova palavra-passe para a tua conta EKAYA.",
    button: "Escolher nova palavra-passe · Choose a new password",
    pt: {
      heading: "Definir uma nova palavra-passe",
      body: "Recebemos um pedido para alterar a palavra-passe da tua conta EKAYA. Usa o botão para escolher uma nova. A ligação é válida durante pouco tempo e só pode ser usada uma vez.",
      note: "Se não pediste esta alteração, ignora este email: a tua palavra-passe atual continua válida.",
    },
    en: {
      heading: "Choose a new password",
      body: "We received a request to change the password of your EKAYA account. Use the button above to choose a new one. The link is valid for a short time and can only be used once.",
      note: "If you didn't request this, ignore this email: your current password stays valid.",
    },
  },
  email_change: {
    subject: "Confirma o novo email · Confirm your new email",
    preview: "Confirma a alteração do email da tua conta EKAYA.",
    button: "Confirmar novo email · Confirm new email",
    pt: {
      heading: "Confirmar a alteração de email",
      body: "Pediste para alterar o email da tua conta EKAYA. Confirma para passares a entrar com o novo endereço.",
      note: "Se não pediste esta alteração, ignora este email e muda a tua palavra-passe.",
    },
    en: {
      heading: "Confirm your new email",
      body: "You asked to change the email of your EKAYA account. Confirm to start signing in with the new address.",
      note: "If you didn't request this change, ignore this email and change your password.",
    },
  },
  magiclink: {
    subject: "O teu link de entrada EKAYA · Your EKAYA sign-in link",
    preview: "Entra na tua conta EKAYA.",
    button: "Entrar · Sign in",
    pt: {
      heading: "Entrar na EKAYA",
      body: "Usa o botão para entrar na tua conta. A ligação é válida durante pouco tempo e só pode ser usada uma vez.",
      note: "Se não pediste para entrar, ignora este email.",
    },
    en: {
      heading: "Sign in to EKAYA",
      body: "Use the button above to sign in to your account. The link is valid for a short time and can only be used once.",
      note: "If you didn't ask to sign in, you can ignore this email.",
    },
  },
  reauthentication: {
    subject: "Código de confirmação EKAYA · Your EKAYA confirmation code",
    preview: "O teu código de confirmação EKAYA.",
    pt: {
      heading: "Confirmar que és tu",
      body: "Para continuar, escreve este código na aplicação. É válido durante pouco tempo.",
      note: "Se não estás a fazer nenhuma alteração na tua conta, ignora este email e muda a tua palavra-passe.",
    },
    en: {
      heading: "Confirm it's you",
      body: "To continue, enter the code above in the app. It is valid for a short time.",
      note: "If you are not changing anything in your account, ignore this email and change your password.",
    },
  },
  invite: {
    subject: "Convite para a EKAYA · You're invited to EKAYA",
    preview: "Foste convidado/a para criar conta na EKAYA.",
    button: "Aceitar convite · Accept invitation",
    pt: {
      heading: "Foste convidado/a para a EKAYA",
      body: "Recebeste um convite para criar conta na EKAYA, a plataforma de turismo comunitário em Moçambique. Usa o botão para aceitar.",
      note: "Se não esperavas este convite, ignora este email.",
    },
    en: {
      heading: "You're invited to EKAYA",
      body: "You've been invited to create an account on EKAYA, the community tourism platform in Mozambique. Use the button above to accept.",
      note: "If you weren't expecting this invitation, you can ignore this email.",
    },
  },
};

export const EMAIL_SENDER_NAME = "EKAYA";
