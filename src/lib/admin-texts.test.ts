import { describe, expect, it } from "vitest";

import * as texts from "./admin-texts";

type Dict = Record<string, unknown>;

/** Flattens a dictionary into "path" → string, calling text functions with sample arguments. */
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function")
    return [[path, String((value as (...a: unknown[]) => unknown)(2, "x"))]];
  return Object.entries(value as Dict).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

const dictionaries = (Object.entries(texts) as [string, unknown][]).filter(
  (entry): entry is [string, { pt: Dict; en: Dict }] =>
    typeof entry[1] === "object" && entry[1] !== null && "pt" in entry[1] && "en" in entry[1],
);

describe("ADM-2 admin texts exist in PT and EN", () => {
  it("covers every admin dictionary", () => {
    expect(dictionaries.map(([name]) => name).sort()).toEqual(
      [
        "BROADCASTS_TXT",
        "BUSINESS_STATUS_LABEL",
        "COMMUNITY_EXP_TXT",
        "MODERATION_TXT",
        "POST_STATUS_LABEL",
        "PROVINCES_TXT",
        "REPORTS_TXT",
        "REPORT_REASON_LABEL",
        "REPORT_STATUS_LABEL",
        "ROLE_LABEL",
        "ROUTES_TXT",
        "USERS_TXT",
      ].sort(),
    );
  });

  it.each(dictionaries)(
    "%s has the same keys and no empty text in both languages",
    (_name, dict) => {
      const pt = leaves(dict.pt);
      const en = leaves(dict.en);
      expect(en.map(([k]) => k)).toEqual(pt.map(([k]) => k));
      for (const [, text] of [...pt, ...en]) expect(text.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(dictionaries)("%s has no Portuguese text left in English", (_name, dict) => {
    for (const [key, text] of leaves(dict.en)) {
      expect({ key, text }).not.toEqual({ key, text: expect.stringMatching(/[ãõçáéíóúâêô]/i) });
    }
  });
});
