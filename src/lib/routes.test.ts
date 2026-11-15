import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/destinations", () => ({ IMAGE_BY_SLUG: {} }));
import {
  routeAllStops,
  routeInProvince,
  routeStopCount,
  stopToInput,
  type ItineraryRoute,
  type RouteStop,
} from "./routes";

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
    source: null,
    travelMinutes: null,
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

describe("province itineraries (Bloco A)", () => {
  const place: RouteStop = {
    id: "fort",
    order: 1,
    kind: "custom",
    refId: "fort",
    title: "Fortaleza de São Sebastião",
    titleEn: "Fort of São Sebastião",
    slug: null,
    description: { pt: null, en: null },
    location: "Ilha de Moçambique",
    isFree: null,
    notes: null,
    estimatedDurationMinutes: null,
    coords: [-15.0287, 40.7436],
    image: "",
    priceMzn: null,
    durationHours: null,
    destinationName: null,
    pendingValidation: false,
    communityCandidate: false,
    source: { url: "https://www.openstreetmap.org/way/206235094", label: "OpenStreetMap" },
    travelMinutes: null,
  };
  const travel: RouteStop = {
    ...place,
    id: "leg",
    order: 2,
    kind: "travel",
    refId: "leg",
    title: "Deslocação",
    coords: null,
    source: null,
    notes: "Tempo de viagem a confirmar",
  };
  const prov = (code: string) => ({ code, name: { pt: code, en: code } });
  const route = {
    days: [
      {
        id: "d1",
        dayNumber: 1,
        title: null,
        titleEn: null,
        description: null,
        isUnassigned: false,
        stops: [place, travel],
      },
    ],
    province: prov("maputo-cidade"),
    provinces: [prov("maputo-cidade"), prov("gaza"), prov("inhambane")],
  } as unknown as ItineraryRoute;

  it("keeps the source and travel legs when a route is copied", () => {
    expect(stopToInput(place)).toMatchObject({
      sourceUrl: "https://www.openstreetmap.org/way/206235094",
      sourceLabel: "OpenStreetMap",
      lat: -15.0287,
    });
    expect(stopToInput(travel)).toMatchObject({ kind: "travel", travelMinutes: null });
  });
  it("never counts a travel leg as a stop to prove", () => {
    expect(routeAllStops(route).map((s) => s.id)).toEqual(["fort"]);
    expect(routeStopCount(route)).toBe(1);
  });
  it("finds a multi-province route from any of its provinces", () => {
    expect(routeInProvince(route, "gaza")).toBe(true);
    expect(routeInProvince(route, "inhambane")).toBe(true);
    expect(routeInProvince(route, "nampula")).toBe(false);
  });
});
