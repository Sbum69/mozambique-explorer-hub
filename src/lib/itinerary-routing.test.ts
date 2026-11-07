import { describe, expect, it } from "vitest";
import { googleDirectionsUrl, osmDirectionsUrl, validMapCoordinate } from "./itinerary-routing";

describe("itinerary directions (no route calculation)", () => {
  it("does not invent directions for missing coordinates", () => {
    expect(googleDirectionsUrl([])).toBeNull();
    expect(osmDirectionsUrl([[-25.96, 32.58]])).toBeNull();
  });
  it("rejects invalid geographic coordinates", () => {
    expect(validMapCoordinate([91, 32])).toBe(false);
    expect(validMapCoordinate([-25, 181])).toBe(false);
    expect(validMapCoordinate([NaN, 32])).toBe(false);
    expect(
      googleDirectionsUrl([
        [91, 32],
        [-25, 33],
      ]),
    ).toBeNull();
  });
  it("Google Maps gets every stop in visiting order, latitude first", () => {
    expect(
      googleDirectionsUrl([
        [-25.96, 32.58],
        [-24.5, 33.1],
        [-23.85, 35.54],
      ]),
    ).toBe("https://www.google.com/maps/dir/-25.96,32.58/-24.5,33.1/-23.85,35.54");
  });
  it("OpenStreetMap gets the first and the last stop", () => {
    expect(
      osmDirectionsUrl([
        [-25.96, 32.58],
        [-24.5, 33.1],
        [-23.85, 35.54],
      ]),
    ).toBe("https://www.openstreetmap.org/directions?route=-25.96,32.58;-23.85,35.54");
  });
});
