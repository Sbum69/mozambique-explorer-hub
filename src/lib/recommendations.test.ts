import { describe, expect, it } from "vitest";

import type { Destination } from "./destinations";
import type { Experience } from "./experiences";
import {
  hasPreferences,
  recommendDestinations,
  recommendExperiences,
  recommendRoutes,
  type TravelPreferences,
} from "./recommendations";

// Test fixtures only (never shown in the app).
const dest = (slug: string, province: string, category: string): Destination =>
  ({ id: `id-${slug}`, slug, name: slug, province, category }) as unknown as Destination;
const exp = (id: string, province: string, category: string, destinationId = ""): Experience =>
  ({
    id,
    province,
    category,
    destinationId,
    destinationUuid: destinationId ? `id-${destinationId}` : null,
    title: { pt: id, en: id },
  }) as unknown as Experience;
const route = (id: string, province: string | null, durationDays: number, interests: string[]) => ({
  id,
  province: province ? { code: province } : null,
  durationDays,
  interests,
  isCurated: false,
});

const DESTS = [
  dest("ilha", "NPL", "culture"),
  dest("inhambane", "INH", "beach"),
  dest("gorongosa", "SOF", "nature"),
];
const EXPS = [
  exp("ilha-walk", "NPL", "heritage", "ilha"),
  exp("tofo-dive", "INH", "beach", "inhambane"),
  exp("safari", "SOF", "nature", "gorongosa"),
  exp("food", "MPM", "food"),
];
const ROUTES = [
  route("r-ilha-2d", "NPL", 2, ["culture"]),
  route("r-inh-5d", "INH", 5, ["beach"]),
  route("r-sof-3d", "SOF", 3, ["nature"]),
  route("r-mpm-1d", "MPM", 1, ["food"]),
];

function run(prefs: TravelPreferences) {
  const preferred = DESTS.find((d) => d.slug === prefs.province) ?? null;
  return {
    personalised: hasPreferences(prefs),
    exp: recommendExperiences(EXPS, prefs, { preferredDestination: preferred }, 2).map(
      (r) => r.item.id,
    ),
    dest: recommendDestinations(DESTS, prefs, EXPS, 1).map((r) => r.item.slug),
    routes: recommendRoutes(ROUTES, prefs, preferred, 2).map((r) => r.item.id),
  };
}

describe("recommendations: one logic for the Home and the dashboard", () => {
  it("no choice → not personalised (the UI shows 'Discover', never 'for you')", () => {
    expect(hasPreferences({})).toBe(false);
    expect(hasPreferences({ interests: [], provinces: [] })).toBe(false);
  });

  it("1) Ilha de Moçambique + culture: Ilha first everywhere", () => {
    const r = run({ province: "ilha", interests: ["culture"] });
    expect(r.personalised).toBe(true);
    expect(r.exp[0]).toBe("ilha-walk");
    expect(r.dest[0]).toBe("ilha");
    expect(r.routes[0]).toBe("r-ilha-2d");
  });

  it("2) beach only (no destination): beach experience and route first", () => {
    const r = run({ interests: ["beach"] });
    expect(r.exp[0]).toBe("tofo-dive");
    expect(r.dest[0]).toBe("inhambane");
    expect(r.routes[0]).toBe("r-inh-5d");
  });

  it("3) 3 days, nature: never a route longer than the trip (+1 day tolerance)", () => {
    const r = run({ durationDays: 3, interests: ["nature"] });
    expect(r.routes[0]).toBe("r-sof-3d");
    expect(r.routes).not.toContain("r-inh-5d");
    expect(r.exp[0]).toBe("safari");
  });

  it("4) 1 day, food: only routes of up to 2 days; food first", () => {
    const r = run({ durationDays: 1, interests: ["food"] });
    expect(r.routes).toEqual(["r-mpm-1d", "r-ilha-2d"]);
    expect(r.exp[0]).toBe("food");
  });

  it("5) Gorongosa with several interests: province match outranks other interests", () => {
    const r = run({ province: "gorongosa", interests: ["beach", "nature"] });
    expect(r.exp[0]).toBe("safari");
    expect(r.dest[0]).toBe("gorongosa");
    expect(r.routes[0]).toBe("r-sof-3d");
  });
});

describe("recommendations: itinerary interest vocabulary", () => {
  it("wildlife, history and diving routes match the Home interests", () => {
    const routes = [
      route("gorongosa", "SOF", 4, ["wildlife"]),
      route("ilha", "NPL", 3, ["history"]),
      route("tofo", "INH", 3, ["diving"]),
    ];
    expect(recommendRoutes(routes, { interests: ["nature"] }, null, 1)[0].item.id).toBe(
      "gorongosa",
    );
    expect(recommendRoutes(routes, { interests: ["culture"] }, null, 1)[0].item.id).toBe("ilha");
    expect(recommendRoutes(routes, { interests: ["beach"] }, null, 1)[0].item.id).toBe("tofo");
  });
});
