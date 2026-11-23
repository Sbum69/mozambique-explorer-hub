/** TREASURE_TXT (see src/lib/page-texts.ts). Both languages must have the same keys. */

export const TREASURE_TXT = {
  pt: {
    title: "Seleciona a paragem que fizeste",
    hint: "Story Stops, pontos de bairro, praias e ilhas elegíveis para este desafio.",
    story: "Story Stop",
    point: "Ponto do bairro",
    beach: "Praia",
    island: "Ilha",
    directions: (name: string) => `Como chegar a ${name}`,
  },
  en: {
    title: "Select the stop you visited",
    hint: "Story Stops, neighbourhood landmarks, beaches and islands that count for this challenge.",
    story: "Story Stop",
    point: "Neighbourhood landmark",
    beach: "Beach",
    island: "Island",
    directions: (name: string) => `Directions to ${name}`,
  },
} as const;
