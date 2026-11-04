/**
 * Assistant phase 1 — answers from the FAQ only (no language model). Keywords, a few synonyms and
 * typo tolerance, in Portuguese and English. Prices and schedules are never in the FAQ: they are
 * read from the public catalogue and RPCs at question time and shown with the date they were read.
 * No relative "@/" imports here, so QA scripts can run it directly.
 */

export type Lang = "pt" | "en";
export type FaqKind = "faq" | "support" | "refuse" | "live";

export interface FaqLink {
  path: string;
  pt: string;
  en: string;
}

export interface FaqEntry {
  slug: string;
  topic: string;
  kind: FaqKind;
  qPt: string;
  qEn: string;
  aPt: string;
  aEn: string;
  kwPt: string[];
  kwEn: string[];
  links: FaqLink[];
  validate: boolean;
}

export interface AssistantReply {
  /** "answer" = from an FAQ entry (or live data); "none" = nothing found. */
  kind: "answer" | "none";
  lang: Lang;
  entry: FaqEntry | null;
  text: string;
  links: FaqLink[];
  /** Other entries the person may have meant (questions in the reply language). */
  suggestions: FaqEntry[];
  /** When live data was read (ISO), for the "dados de …" note. */
  readAt?: string;
}

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9@.'\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s: string) =>
  normalise(s)
    .split(" ")
    .map((t) => t.replace(/^['.-]+|['.-]+$/g, ""))
    .filter(Boolean);

const STOP = new Set(
  "a o as os de da do das dos e em no na nos nas um uma uns umas para por com sem que como qual quais se eu tu me te meu minha meus minhas teu tua o-que ha ja mais muito the a an of to in on at for and or is are be do does i my me you your it this that what how can with there".split(
    " ",
  ),
);

/** Few words people use that the FAQ does not. */
const SYNONYMS: Record<string, string> = {
  senha: "palavra-passe",
  password: "palavra-passe",
  contato: "contacto",
  celular: "telefone",
  telemovel: "telefone",
  favoritas: "favoritos",
  favorite: "favourites",
  favorites: "favourites",
  itinerario: "roteiro",
  itinerarios: "roteiros",
  apagar: "apagar",
  eliminar: "apagar",
  excluir: "apagar",
  cancelo: "cancelar",
  pago: "pagar",
  mpesa: "m-pesa",
};

const PT_HINT =
  /\b(nao|como|posso|onde|quero|qual|quanto|tenho|minha|meu|podes|ha|esta|sao|voces|obrigad[oa]|ola|reserva|conta)\b/;
const EN_HINT =
  /\b(how|can|where|want|what|which|much|have|my|you|is|are|please|hi|hello|thanks|booking|account)\b/;

/** Language of the question; falls back to the app language when unclear. */
export function detectLang(question: string, fallback: Lang): Lang {
  const n = normalise(question);
  const pt = (n.match(new RegExp(PT_HINT, "g")) ?? []).length;
  const en = (n.match(new RegExp(EN_HINT, "g")) ?? []).length;
  if (pt > en) return "pt";
  if (en > pt) return "en";
  return fallback;
}

/** Damerau–Levenshtein distance (optimal string alignment), capped for speed. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const tolerance = (len: number) => (len >= 8 ? 2 : len >= 5 ? 1 : 0);

function tokenMatch(word: string, qTokens: string[]): number {
  let best = 0;
  for (const t of qTokens) {
    if (t === word) return 2;
    if (word.length >= 4 && t.length >= 4 && (t.startsWith(word) || word.startsWith(t)))
      best = Math.max(best, 1.5);
    else if (tolerance(word.length) && editDistance(t, word, 2) <= tolerance(word.length))
      best = Math.max(best, 1.5);
  }
  return best;
}

/** Topics that list place names: a place name alone is not enough to answer. */
const PLACE_TOPICS = new Set(["content"]);

export function scoreEntry(question: string, e: FaqEntry): number {
  const q = normalise(question);
  const qTokens = tokens(question)
    .map((t) => SYNONYMS[t] ?? t)
    .filter((t) => !STOP.has(t));
  let score = 0;
  for (const kw of [...e.kwPt, ...e.kwEn]) {
    const k = normalise(kw);
    if (!k) continue;
    if (k.includes(" ") || k.includes("'")) {
      if (q.includes(k)) score += 3;
      continue;
    }
    const m = tokenMatch(SYNONYMS[k] ?? k, qTokens);
    score += PLACE_TOPICS.has(e.topic) ? m / 2 : m;
  }
  // Words shared with the entry questions.
  const qWords = new Set(
    tokens(`${e.qPt} ${e.qEn}`)
      .map((t) => SYNONYMS[t] ?? t)
      .filter((t) => t.length > 3 && !STOP.has(t)),
  );
  for (const t of qTokens) if (qWords.has(t)) score += 0.5;
  // Safety first: a refusal that matches wins over a topic that also matches.
  if (e.kind === "refuse" && score >= 2) score += 3;
  return score;
}

const MIN_SCORE = 2;

export interface AnswerOptions {
  supportEmail: string;
}

const fill = (s: string, o: AnswerOptions) => s.replaceAll("{SUPPORT}", o.supportEmail);

/** Best FAQ answer, or "none" with suggestions. Pure: no network. */
export function answerFromFaq(
  question: string,
  appLang: Lang,
  entries: FaqEntry[],
  o: AnswerOptions,
): AssistantReply {
  const lang = detectLang(question, appLang);
  const ranked = entries
    .map((e) => ({ e, s: scoreEntry(question, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const best = ranked[0];
  const suggestions = ranked
    .filter((x) => x.e.kind === "faq" && x !== best)
    .slice(0, 3)
    .map((x) => x.e);
  if (!best || best.s < MIN_SCORE) return noAnswer(lang, suggestions, o);
  const e = best.e;
  return {
    kind: "answer",
    lang,
    entry: e,
    text: fill(lang === "pt" ? e.aPt : e.aEn, o),
    links: e.links,
    suggestions,
  };
}

export function noAnswer(lang: Lang, suggestions: FaqEntry[], o: AnswerOptions): AssistantReply {
  return {
    kind: "none",
    lang,
    entry: null,
    text:
      lang === "pt"
        ? `Não tenho essa informação no EKAYA. Vê as sugestões abaixo ou escreve à equipa: ${o.supportEmail}.`
        : `I do not have that information in EKAYA. See the suggestions below or write to the team: ${o.supportEmail}.`,
    links: [],
    suggestions,
  };
}

// ---------------------------------------------------------------------------------------------
// Live data (prices and schedules)
// ---------------------------------------------------------------------------------------------

export interface CatalogueItem {
  id: string;
  titlePt: string;
  titleEn: string | null;
  priceMzn: number;
}

export interface Slot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  remaining: number;
}

export interface LiveDeps extends AnswerOptions {
  catalogue: () => Promise<CatalogueItem[]>;
  /** Next slots (database RPC get_experience_availability) for the next days. */
  slots: (experienceId: string) => Promise<Slot[]>;
  formatPrice: (mzn: number, lang: Lang) => string;
  now?: () => Date;
}

/** Experience whose title words best match the question (at least two words, or one long). */
export function findExperience(question: string, items: CatalogueItem[]): CatalogueItem | null {
  const qTokens = tokens(question).filter((t) => !STOP.has(t) && t.length > 2);
  let best: { item: CatalogueItem; score: number } | null = null;
  for (const item of items) {
    const words = new Set(
      tokens(`${item.titlePt} ${item.titleEn ?? ""}`).filter((t) => !STOP.has(t) && t.length > 2),
    );
    let score = 0;
    for (const w of words) score += tokenMatch(w, qTokens) >= 1.5 ? 1 : 0;
    if (score > (best?.score ?? 0)) best = { item, score };
  }
  return best && best.score >= 2 ? best.item : null;
}

const LIVE_WORDS =
  /\b(preco|precos|custa|custo|quanto|disponibilidade|disponivel|horario|horarios|vagas|lugares|price|cost|much|availability|available|schedule|slot|slots|open|abre)\b/;

/** FAQ answer, upgraded with live price and schedule when the question names an experience. */
export async function answer(
  question: string,
  appLang: Lang,
  entries: FaqEntry[],
  deps: LiveDeps,
): Promise<AssistantReply> {
  const base = answerFromFaq(question, appLang, entries, deps);
  const wantsLive =
    base.entry?.kind === "live" || (base.kind === "none" && LIVE_WORDS.test(normalise(question)));
  if (!wantsLive || base.entry?.kind === "refuse") return base;
  const lang = base.lang;
  const liveEntry = entries.find((e) => e.kind === "live");
  const expLink: FaqLink = { path: "/experiences", pt: "Experiências", en: "Experiences" };
  let item: CatalogueItem | null = null;
  try {
    item = findExperience(question, await deps.catalogue());
  } catch {
    item = null;
  }
  if (!item) {
    return {
      ...noAnswer(lang, base.suggestions, deps),
      text:
        lang === "pt"
          ? "Não encontrei essa experiência publicada no EKAYA, por isso não tenho o preço nem os horários. Procura-a em Experiências e confirma com o negócio; cada página mostra os dados em vigor."
          : "I could not find that experience published on EKAYA, so I do not have its price or schedule. Look for it in Experiences and check with the business; each page shows the current data.",
      links: [expLink],
      entry: liveEntry ?? null,
      kind: "none",
    };
  }
  const now = (deps.now ?? (() => new Date()))();
  let slots: Slot[] = [];
  let slotsFailed = false;
  try {
    slots = (await deps.slots(item.id)).filter((s) => s.available).slice(0, 3);
  } catch {
    slotsFailed = true;
  }
  const title = lang === "pt" ? item.titlePt : (item.titleEn ?? item.titlePt);
  const when = now.toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Maputo",
  });
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const slotText = slotsFailed
    ? lang === "pt"
      ? "Não consegui ler os horários agora."
      : "I could not read the schedule now."
    : slots.length
      ? (lang === "pt" ? "Próximos horários com lugares: " : "Next slots with places: ") +
        slots
          .map(
            (s) =>
              `${day(s.date)} ${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)} (${s.remaining})`,
          )
          .join("; ") +
        "."
      : lang === "pt"
        ? "Não há horários com lugares nos próximos dias."
        : "There are no slots with places in the next days.";
  const text =
    lang === "pt"
      ? `${title}: ${deps.formatPrice(item.priceMzn, lang)} por pessoa. ${slotText} Dados lidos em ${when}; confirma na página da experiência antes de reservar.`
      : `${title}: ${deps.formatPrice(item.priceMzn, lang)} per person. ${slotText} Data read on ${when}; check the experience page before booking.`;
  return {
    kind: "answer",
    lang,
    entry: liveEntry ?? null,
    text,
    links: [{ path: `/experience/${item.id}`, pt: item.titlePt, en: item.titleEn ?? item.titlePt }],
    suggestions: base.suggestions,
    readAt: now.toISOString(),
  };
}

/** Raw JSON seed (docs/ia/faq-v1.json) → entries. */
export function entriesFromSeed(seed: {
  entries: {
    slug: string;
    topic: string;
    kind: string;
    q_pt: string;
    q_en: string;
    a_pt: string;
    a_en: string;
    kw_pt: string[];
    kw_en: string[];
    links: FaqLink[];
    validate?: boolean;
  }[];
}): FaqEntry[] {
  return seed.entries.map((e) => ({
    slug: e.slug,
    topic: e.topic,
    kind: e.kind as FaqKind,
    qPt: e.q_pt,
    qEn: e.q_en,
    aPt: e.a_pt,
    aEn: e.a_en,
    kwPt: e.kw_pt,
    kwEn: e.kw_en,
    links: e.links,
    validate: !!e.validate,
  }));
}
