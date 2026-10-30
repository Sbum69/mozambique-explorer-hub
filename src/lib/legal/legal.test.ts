import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { privacyDoc } from "./privacy";
import { termsDoc } from "./terms";
import { LEGAL_VERSIONS } from "./versions";
import type { LegalDoc } from "./doc";

const docs: [string, (lang: "pt" | "en") => LegalDoc][] = [
  ["terms", termsDoc],
  ["privacy", privacyDoc],
];

const shape = (d: LegalDoc) =>
  d.sections.map((s) => [s.id, s.blocks.map((b) => (Array.isArray(b) ? b.length : "p"))]);
const allText = (d: LegalDoc) => [
  d.title,
  ...d.sections.flatMap((s) => [
    s.heading,
    ...s.blocks.flatMap((b) => (Array.isArray(b) ? b : [b])),
  ]),
];

describe("LEGAL-1 legal texts", () => {
  it.each(docs)("%s has the same sections and lists in PT and EN", (_name, doc) => {
    expect(shape(doc("en"))).toEqual(shape(doc("pt")));
  });

  it.each(docs)("%s has no empty text and no unfilled placeholders", (_name, doc) => {
    for (const lang of ["pt", "en"] as const) {
      for (const text of allText(doc(lang))) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toMatch(/\[[^\]]*\]|TODO|undefined|null/);
      }
    }
  });

  it("versions match current_legal_versions() in the latest migration that defines it", () => {
    const dir = join(process.cwd(), "drizzle", "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) =>
        readFileSync(join(dir, f), "utf8").includes("FUNCTION public.current_legal_versions()"),
      );
    expect(files.length).toBeGreaterThan(0);
    const sql = readFileSync(join(dir, files[files.length - 1]), "utf8");
    const m = sql.match(/jsonb_build_object\('terms', '([0-9-]+)', 'privacy', '([0-9-]+)'\)/);
    expect(m?.slice(1)).toEqual([LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy]);
  });
});
