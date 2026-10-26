import { describe, expect, it } from "vitest";

import * as texts from "./page-texts";

type Dict = Record<string, unknown>;

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

describe("ADM-2B page texts exist in PT and EN", () => {
  it("covers every page dictionary", () => {
    expect(dictionaries.map(([n]) => n).sort()).toEqual(
      ["FORGOT_TXT", "GAMES_TXT", "GAME_TASK_TXT", "RESET_TXT", "SIGNUP_TXT"].sort(),
    );
  });

  it.each(dictionaries)("%s has the same keys and no empty text", (_name, dict) => {
    const pt = leaves(dict.pt);
    const en = leaves(dict.en);
    expect(en.map(([k]) => k)).toEqual(pt.map(([k]) => k));
    for (const [, text] of [...pt, ...en]) expect(text.trim().length).toBeGreaterThan(0);
  });

  it.each(dictionaries)("%s has no Portuguese text left in English", (_name, dict) => {
    // Keys of GAMES_TXT.action are the Portuguese data values being translated; only values are checked.
    for (const [key, text] of leaves(dict.en)) {
      expect({ key, text }).not.toEqual({ key, text: expect.stringMatching(/[ãõçáéíóúâêô]/i) });
    }
  });
});
