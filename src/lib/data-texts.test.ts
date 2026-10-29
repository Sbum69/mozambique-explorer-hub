import { describe, expect, it } from "vitest";

import { SAMPLE_ITINERARIES } from "@/data/itineraries";
import { TRAVEL_TIPS } from "@/data/news-extra";
import { getTreasureStops } from "@/data/treasure-stops";

const PT_ACCENTS = /[ãõçáéíóúâêô]/i;
// Proper names keep their Portuguese spelling in English.
const PROPER_NAMES = /Praça da Independência|Moçambique/;

describe("static content exists in PT and EN", () => {
  it.each(SAMPLE_ITINERARIES.map((i) => [i.id, i] as const))(
    "itinerary %s has an English name, description and duration",
    (_id, it) => {
      expect(it.nameEn.trim()).not.toBe("");
      expect(it.descriptionEn.trim()).not.toBe("");
      expect(it.durationEn).toMatch(/^\d+ days?$/);
      expect(it.descriptionEn).not.toMatch(PT_ACCENTS);
    },
  );

  const stories = SAMPLE_ITINERARIES.flatMap((it) =>
    it.route.filter((s) => s.type === "story").map((s) => [`${it.id}:${s.id}`, s] as const),
  );

  it.each(stories)("story %s is translated (title, story, context)", (_id, s) => {
    expect(s.titleEn?.trim()).toBeTruthy();
    expect(s.storyEn?.trim()).toBeTruthy();
    expect(s.culturalContextEn?.trim()).toBeTruthy();
    for (const text of [s.titleEn, s.storyEn, s.culturalContextEn]) {
      expect((text ?? "").replace(PROPER_NAMES, "")).not.toMatch(PT_ACCENTS);
    }
  });

  it("gives every treasure-hunt hint written in Portuguese an English version", () => {
    for (const game of ["g1", "g2", "g3", "g4"]) {
      for (const stop of getTreasureStops(game)) {
        if (stop.hint && PT_ACCENTS.test(stop.hint)) expect(stop.hintEn, stop.id).toBeTruthy();
      }
    }
  });

  it("has travel tips in both languages", () => {
    expect(TRAVEL_TIPS.length).toBeGreaterThan(0);
    for (const tip of TRAVEL_TIPS) {
      for (const field of [tip.title, tip.category, tip.body]) {
        expect(field.pt.trim(), tip.id).not.toBe("");
        expect(field.en.trim(), tip.id).not.toBe("");
        expect(field.en, tip.id).not.toMatch(PT_ACCENTS);
      }
    }
  });
});

describe("sample itineraries link only to real routes", () => {
  it.each(SAMPLE_ITINERARIES.map((i) => [i.id, i.routeId] as const))(
    "%s points to a route id or to nothing",
    (_id, routeId) => {
      if (routeId !== null) expect(routeId).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});
