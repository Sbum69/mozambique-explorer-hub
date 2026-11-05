/**
 * Prints the INSERT for the initial FAQ (docs/ia/faq-v1.json) used at the end of migration 0056.
 * The support email placeholder {SUPPORT} is kept: the app fills it from app-info.ts.
 * Usage: bun scripts/qa/faq-sql.ts > out.sql
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REPO } from "./lib";

type Seed = {
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
    links: unknown[];
    validate?: boolean;
  }[];
};
const seed = JSON.parse(readFileSync(join(REPO, "docs/ia/faq-v1.json"), "utf8")) as Seed;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => `ARRAY[${a.map(q).join(", ")}]::text[]`;
const rows = seed.entries.map(
  (e) =>
    `  (${q(e.slug)}, ${q(e.topic)}, ${q(e.kind)}, ${q(e.q_pt)}, ${q(e.q_en)}, ${q(e.a_pt)}, ${q(e.a_en)},\n   ${arr(e.kw_pt)},\n   ${arr(e.kw_en)},\n   ${q(JSON.stringify(e.links))}::jsonb, ${e.validate ? "true" : "false"})`,
);
console.log(
  `INSERT INTO public.assistant_faq_entries (slug, topic, kind, question_pt, question_en, answer_pt, answer_en,\n  keywords_pt, keywords_en, links, needs_validation)\nVALUES\n${rows.join(",\n")};`,
);
