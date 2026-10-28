import { describe, expect, it } from "vitest";

import {
  COMMUNITY_CATEGORIES,
  categoryMeta,
  communityLocation,
  mapCommunityExperience,
  type CommunityExperienceRow,
} from "./community-experiences";

const row = (over: Partial<CommunityExperienceRow> = {}): CommunityExperienceRow => ({
  id: "ce1",
  title_pt: "Mercado do Peixe",
  title_en: "Fish Market",
  description_pt: "Peixe fresco",
  description_en: "Fresh fish",
  province_id: "pr1",
  category: "food",
  location: "Margens do Lago Niassa",
  location_en: "Shores of Lake Niassa",
  lat: "-25.95",
  lng: "32.6",
  image_url: "",
  image_path: null,
  active: true,
  status: "approved",
  submitted_by: null,
  submitted_at: "2026-10-01T00:00:00Z",
  decided_at: null,
  rejection_reason: null,
  additional_info: null,
  provinces: { code: "maputo-cidade", name_pt: "Maputo Cidade", name_en: "Maputo City" },
  ...over,
});

describe("community experience mapping", () => {
  it("maps both languages, coordinates as numbers and the province", () => {
    const ce = mapCommunityExperience(row());
    expect(ce.title).toEqual({ pt: "Mercado do Peixe", en: "Fish Market" });
    expect([ce.lat, ce.lng]).toEqual([-25.95, 32.6]);
    expect(ce.provinceName).toEqual({ pt: "Maputo Cidade", en: "Maputo City" });
    expect(ce.imageUrl).toBeNull();
  });

  it("shows Portuguese when the English text is empty", () => {
    const ce = mapCommunityExperience(row({ title_en: "", description_en: "" }));
    expect(ce.title.en).toBe("Mercado do Peixe");
    expect(ce.description.en).toBe("Peixe fresco");
  });

  it("keeps missing coordinates as null (no invented location)", () => {
    const ce = mapCommunityExperience(row({ lat: null, lng: null }));
    expect([ce.lat, ce.lng]).toEqual([null, null]);
  });

  it("accepts the province as a one-element array (PostgREST join)", () => {
    const ce = mapCommunityExperience(
      row({ provinces: [{ code: "gaza", name_pt: "Gaza", name_en: "Gaza" }] }),
    );
    expect(ce.provinceCode).toBe("gaza");
  });
});

describe("community experience location", () => {
  it("uses the English location when there is one", () => {
    expect(communityLocation(mapCommunityExperience(row()), "en")).toBe("Shores of Lake Niassa");
    expect(communityLocation(mapCommunityExperience(row()), "pt")).toBe("Margens do Lago Niassa");
  });

  it("shows the Portuguese location when English is missing (proper names)", () => {
    const ce = mapCommunityExperience(row({ location: "Ilha de Moçambique", location_en: null }));
    expect(communityLocation(ce, "en")).toBe("Ilha de Moçambique");
  });
});

describe("community categories", () => {
  it("label every category in PT and EN", () => {
    for (const c of COMMUNITY_CATEGORIES) {
      expect(c.label.pt.trim()).not.toBe("");
      expect(c.label.en.trim()).not.toBe("");
      expect(c.label.en).not.toMatch(/[ãõçáéíóúâêô]/i);
    }
  });

  it("falls back to 'all' for an unknown id", () => {
    expect(categoryMeta("food").id).toBe("food");
    expect(categoryMeta("unknown").id).toBe("all");
  });
});
