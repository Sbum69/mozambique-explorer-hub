/** LAUNCH_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const LAUNCH_TXT = {
  pt: {
    title: "Estado do lançamento",
    ready: "Pronto para lançar: os mínimos estão cumpridos.",
    notReady: "Ainda não está pronto para lançar.",
    ok: "Cumprido",
    todo: "Por fazer",
    notBlocking: "não impede o lançamento",
    businesses: (n: number, min: number) => `Negócios aprovados: ${n} de ${min}`,
    experiences: (n: number, min: number) => `Atividades ativas: ${n} de ${min}`,
    admins2fa: (n: number) =>
      n === 0
        ? "Todos os administradores têm a verificação em dois passos"
        : `Administradores sem verificação em dois passos: ${n}`,
    leads: (n: number) => `Pedidos Para negócios por tratar: ${n}`,
    placements: (n: number) => `Destaques à espera de decisão ou pagamento: ${n}`,
    readAt: (d: string) => `Dados lidos em ${d}. Contas internas (testes e equipa) não contam.`,
    refresh: "Atualizar",
    businessesTitle: "O que falta em cada negócio",
    noBusinesses: "Ainda não há negócios aprovados nem pendentes.",
    errorsTitle: (n: number) => `Erros registados nos últimos 7 dias: ${n}`,
    errorsIntro:
      "Sem dados pessoais (emails, números e identificadores mascarados). Guardados 30 dias.",
    noErrors: "Não há erros registados.",
    loading: "A carregar…",
    errLoad: "Não foi possível carregar o estado do lançamento.",
    retry: "Tentar novamente",
  },
  en: {
    title: "Launch status",
    ready: "Ready to launch: the minimums are met.",
    notReady: "Not ready to launch yet.",
    ok: "Done",
    todo: "To do",
    notBlocking: "does not block the launch",
    businesses: (n: number, min: number) => `Approved businesses: ${n} of ${min}`,
    experiences: (n: number, min: number) => `Active activities: ${n} of ${min}`,
    admins2fa: (n: number) =>
      n === 0
        ? "Every administrator has two-step verification"
        : `Administrators without two-step verification: ${n}`,
    leads: (n: number) => `For businesses requests to handle: ${n}`,
    placements: (n: number) => `Highlights waiting for a decision or payment: ${n}`,
    readAt: (d: string) => `Data read on ${d}. Internal accounts (tests and team) do not count.`,
    refresh: "Refresh",
    businessesTitle: "What each business is missing",
    noBusinesses: "There are no approved or pending businesses yet.",
    errorsTitle: (n: number) => `Errors logged in the last 7 days: ${n}`,
    errorsIntro: "No personal data (emails, numbers and identifiers masked). Kept 30 days.",
    noErrors: "There are no logged errors.",
    loading: "Loading…",
    errLoad: "Could not load the launch status.",
    retry: "Try again",
  },
} as const;

/** The two Home actions (HomeCta): the subtitles show on larger screens only. */
