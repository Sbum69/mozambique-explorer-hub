import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/destinations", () => ({ IMAGE_BY_SLUG: {} }));
import { stopToInput, type RouteStop } from "./routes";

describe("existing itinerary stop preservation", () => {
  const stop: RouteStop = {
    id: "existing-stop",
    order: 1,
    kind: "custom",
    refId: "existing-stop",
    title: "Existing stop",
    titleEn: "Existing English title",
    slug: null,
    description: { pt: "Existing description", en: "Existing English description" },
    location: "Existing location",
    isFree: true,
    notes: "Existing note",
    estimatedDurationMinutes: 30,
    coords: null,
    image: "",
    priceMzn: null,
    durationHours: null,
    destinationName: null,
    pendingValidation: true,
    communityCandidate: true,
  };
  it("retains custom stops instead of dropping them when saving or copying", () => {
    expect(stopToInput(stop)).toMatchObject({
      kind: "custom",
      refId: "existing-stop",
      title: "Existing stop",
    });
  });
  it("never invents coordinates for an unvalidated stop", () => {
    expect(stopToInput(stop)).toMatchObject({ lat: null, lng: null, pendingValidation: true });
  });
  it("preserves descriptions, notes and duration", () => {
    expect(stopToInput(stop)).toMatchObject({
      titleEn: stop.titleEn,
      descriptionPt: stop.description.pt,
      descriptionEn: stop.description.en,
      notes: "Existing note",
      estimatedDurationMinutes: 30,
      communityCandidate: true,
    });
  });
});
