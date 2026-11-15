import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { routeJsonLd } from "./page-meta";

describe("TouristTrip JSON-LD of a route", () => {
  const row = {
    title: "Ilha de Moçambique a pé",
    description: "Dois dias </script><b>",
    duration_days: 2,
    route_days: [
      {
        day_number: 2,
        route_stops: [
          {
            stop_order: 1,
            stop_type: "travel",
            custom_title_pt: "Deslocação",
            lat: null,
            lng: null,
            destinations: null,
          },
          {
            stop_order: 2,
            stop_type: "custom_stop",
            custom_title_pt: "Chocas-Mar",
            lat: -14.9427,
            lng: 40.7382,
            destinations: null,
          },
        ],
      },
      {
        day_number: 1,
        route_stops: [
          {
            stop_order: 1,
            stop_type: "destination",
            custom_title_pt: null,
            lat: null,
            lng: null,
            destinations: { name: "Ilha de Moçambique", lat: "-15.03", lng: "40.73" },
          },
        ],
      },
    ],
  };

  it("lists the places in order, without travel legs, with the database coordinates", () => {
    const ld = JSON.parse(routeJsonLd("abc", row));
    expect(ld["@type"]).toBe("TouristTrip");
    expect(ld.url).toBe("https://exploreekaya.com/itinerary/abc");
    const items = ld.itinerary.itemListElement.map((x: { item: { name: string } }) => x.item.name);
    expect(items).toEqual(["Ilha de Moçambique", "Chocas-Mar"]);
    expect(ld.itinerary.itemListElement[1].item.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: -14.9427,
      longitude: 40.7382,
    });
  });

  it("never lets the text close the script tag", () => {
    expect(routeJsonLd("abc", row)).not.toContain("</script>");
  });
});
