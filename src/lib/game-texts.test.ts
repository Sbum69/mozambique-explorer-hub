import { describe, expect, it } from "vitest";
import { translate, type DictKey } from "@/contexts/LanguageContext";

const GAME_IDS = Array.from({ length: 21 }, (_, i) => `g${i + 1}`);
const KINDS = ["Title", "Desc", "Badge", "Detail"] as const;

describe("10B game texts in PT and EN", () => {
  it("every game has a title, description, badge and detail in both languages", () => {
    for (const id of GAME_IDS)
      for (const kind of KINDS) {
        const key = `game${kind}_${id}` as DictKey;
        const pt = translate(key, "pt");
        const en = translate(key, "en");
        expect(pt, `${key} pt`).not.toBe(key);
        expect(en, `${key} en`).not.toBe(key);
        expect(pt.length && en.length, key).toBeTruthy();
      }
  });
  it("keeps the original Portuguese text and translates it", () => {
    expect(translate("gameTitle_g6" as DictKey, "pt")).toBe("Sabores de Moçambique");
    expect(translate("gameTitle_g6" as DictKey, "en")).toBe("Flavours of Mozambique");
  });
});
