import { describe, expect, it } from "vitest";
import { PROOF_STATUS_LABEL, distanceMeters, proofLocationVerdict } from "./geo";

// Praça da Independência, Maputo (reference point for the tests only).
const target: [number, number] = [-25.9682, 32.5745];
// Moves north by a number of metres (1° latitude ≈ 111 195 m with R = 6 371 km).
const north = (m: number): [number, number] => [target[0] + m / 111195, target[1]];

describe("10B distance (haversine)", () => {
  it("is zero for the same point", () => expect(distanceMeters(target, target)).toBe(0));
  it("measures 50 m and 2 km within a metre", () => {
    expect(distanceMeters(target, north(50))).toBeCloseTo(50, 0);
    expect(Math.abs(distanceMeters(target, north(2000)) - 2000)).toBeLessThan(1);
  });
  it("matches a known city distance (Maputo → Inhambane ≈ 370 km)", () => {
    const km = distanceMeters([-25.9692, 32.5732], [-23.865, 35.383]) / 1000;
    expect(km).toBeGreaterThan(360);
    expect(km).toBeLessThan(380);
  });
});

describe("10B proof location rules", () => {
  const at = (p: [number, number], accuracy: number) => ({ lat: p[0], lng: p[1], accuracy });
  it("50 m away with good accuracy is verified", () =>
    expect(proofLocationVerdict(target, at(north(50), 20))).toBe(true));
  it("2 km away is not verified", () =>
    expect(proofLocationVerdict(target, at(north(2000), 20))).toBe(false));
  it("accuracy worse than 200 m is not verified even on the spot", () =>
    expect(proofLocationVerdict(target, at(target, 500))).toBe(false));
  it("refused location is not verified", () =>
    expect(proofLocationVerdict(target, null)).toBe(false));
  it("a place without coordinates needs manual review (null)", () =>
    expect(proofLocationVerdict(null, at(target, 10))).toBeNull());
  it("every proof status has PT and EN labels", () => {
    for (const label of Object.values(PROOF_STATUS_LABEL)) {
      expect(label.pt.length).toBeGreaterThan(0);
      expect(label.en.length).toBeGreaterThan(0);
    }
  });
});
