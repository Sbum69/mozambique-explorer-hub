/**
 * Assistant phase 2 (language model) — prepared and OFF. Pure helpers the server uses around a
 * model answer: PT-PT/PT-MZ check, citations turned into links, and the daily quota cut.
 */

/** Daily cap kept below the free 10 000 Neurons of Workers AI. */
export const NEURON_DAILY_CAP = 9000;

/** True when a call estimated at `estimate` Neurons still fits in today's cap. */
export function canSpend(usedToday: number, estimate: number, cap = NEURON_DAILY_CAP): boolean {
  return usedToday + Math.max(0, estimate) <= cap;
}

// Letters on both sides are checked with Unicode classes (\b does not see "ê" as a letter).
const word = (w: string) => new RegExp(`(?<!\\p{L})(?:${w})(?!\\p{L})`, "iu");

/** Brazilian Portuguese words that must not appear in EKAYA texts (PT-PT/PT-MZ). */
export const PT_BR_PATTERNS: { re: RegExp; hint: string }[] = [
  { re: word("você|vocês"), hint: "tu / vocês" },
  { re: word("contato|contatos"), hint: "contacto" },
  { re: word("ônibus|onibus"), hint: "autocarro / machimbombo" },
  { re: word("celular|celulares"), hint: "telemóvel" },
  { re: word("tela|telas"), hint: "ecrã" },
  { re: word("equipe"), hint: "equipa" },
  { re: word("usuário|usuários|usuario|usuarios"), hint: "utilizador" },
  { re: word("cadastro|cadastrar|cadastrado"), hint: "registo / registar" },
  { re: word("baixar"), hint: "descarregar" },
];

/** PT-BR words found (empty = OK). Only for Portuguese text. */
export function ptPtViolations(text: string): string[] {
  return PT_BR_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.hint);
}

/**
 * Replaces [FAQ:slug] citations from the model with Markdown links to the entry's first page,
 * and drops citations to unknown entries (never links the model made up).
 */
export function linkifyCitations(
  text: string,
  entries: { slug: string; links: { path: string; pt: string; en: string }[] }[],
  lang: "pt" | "en",
): string {
  return text.replace(/\[FAQ:([a-z0-9-]+)\]/g, (_m, slug: string) => {
    const link = entries.find((e) => e.slug === slug)?.links[0];
    return link ? `[${lang === "pt" ? link.pt : link.en}](${link.path})` : "";
  });
}
