import { describe, expect, it } from "vitest";
import { carRouteUrl, SUPPORTED_ROUTING_MODES, validMapCoordinate } from "./itinerary-routing";

describe("itinerary routing", () => {
  it("only offers estimates for the car profile supported by the service", () => {
    expect(SUPPORTED_ROUTING_MODES).toEqual(["driving"]);
  });
  it("does not invent a route for missing coordinates", () => {
    expect(carRouteUrl([])).toBeNull();
    expect(carRouteUrl([[-25.96, 32.58]])).toBeNull();
  });
  it("rejects invalid geographic coordinates", () => {
    expect(validMapCoordinate([91, 32])).toBe(false);
    expect(validMapCoordinate([-25, 181])).toBe(false);
    expect(validMapCoordinate([NaN, 32])).toBe(false);
    expect(carRouteUrl([[91, 32], [-25, 33]])).toBeNull();
  });
  it("keeps visiting order and sends longitude before latitude", () => {
    expect(carRouteUrl([[-25.96, 32.58], [-23.85, 35.54]])).toContain("/driving/32.58,-25.96;35.54,-23.85?");
  });
});