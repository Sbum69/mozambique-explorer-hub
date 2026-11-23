/** GAMES_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const GAMES_TXT = {
  pt: {
    locked: "Bloqueado",
    completed: "Concluído",
    action: {
      Bloqueado: "Bloqueado",
      Começar: "Começar",
      Continuar: "Continuar",
      "Jogar Quiz": "Jogar Quiz",
    },
    difficulty: { easy: "Fácil", medium: "Médio", hard: "Difícil" },
    category: {
      all: "Todos",
      tesouro: "Caça ao Tesouro",
      foto: "Fotografia",
      experiencia: "Experiências",
      conhecimento: "Conhecimento",
      tempo: "Tempo",
      social: "Sociais",
    },
    previousRecords: "Registos anteriores",
    /** What is still missing before a challenge can be confirmed. */
    missing: {
      stop: "Seleciona a paragem",
      experience: "Escolhe a experiência",
      itinerary: "Escolhe o roteiro e a paragem",
      timeOfDay: "Regista o momento do dia",
      event: "Preenche o evento e a data",
      word: "Escreve a palavra e o significado",
      note: (n: number) => `Escreve pelo menos ${n} caracteres`,
      share: "Partilha para validar",
      photo: "Tira a foto para confirmar",
    },
  },
  en: {
    locked: "Locked",
    completed: "Completed",
    action: {
      Bloqueado: "Locked",
      Começar: "Start",
      Continuar: "Continue",
      "Jogar Quiz": "Play quiz",
    },
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
    category: {
      all: "All",
      tesouro: "Treasure hunt",
      foto: "Photography",
      experiencia: "Experiences",
      conhecimento: "Knowledge",
      tempo: "Time",
      social: "Social",
    },
    previousRecords: "Previous records",
    missing: {
      stop: "Select the stop",
      experience: "Choose the experience",
      itinerary: "Choose the itinerary and the stop",
      timeOfDay: "Record the time of day",
      event: "Fill in the event and the date",
      word: "Write the word and its meaning",
      note: (n: number) => `Write at least ${n} characters`,
      share: "Share to validate",
      photo: "Take the photo to confirm",
    },
  },
} as const;
