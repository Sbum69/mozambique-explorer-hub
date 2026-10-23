import { describe, expect, it } from "vitest";
import { levelFor, POINT_VALUES, sourceOf } from "./points";

describe("points config", () => {
  it("uses the adopted point values", () => {
    expect(POINT_VALUES.booking_completed).toBe(100);
    expect(POINT_VALUES.route_stop_proof).toBe(20);
    expect(POINT_VALUES.route_completed).toBe(150);
  });
  it("starts at level 1 with 100 points to next", () => {
    const l = levelFor(0);
    expect(l.current.level).toBe(1);
    expect(l.toNext).toBe(100);
  });
  it("reaches level 2 at exactly 100 points", () => {
    expect(levelFor(99).current.level).toBe(1);
    expect(levelFor(100).current.level).toBe(2);
  });
  it("computes progress inside a level", () => {
    const l = levelFor(200); // level 2 (100) -> level 3 (300)
    expect(l.progress).toBe(50);
    expect(l.toNext).toBe(100);
  });
  it("caps at the top level", () => {
    const l = levelFor(9999);
    expect(l.current.level).toBe(5);
    expect(l.next).toBeNull();
    expect(l.progress).toBe(100);
  });
  it("never goes below level 1 for negative totals", () => {
    expect(levelFor(-50).current.level).toBe(1);
  });
  it("groups history origins: games vs tourism actions vs redemptions", () => {
    expect(sourceOf("game_completed")).toBe("game");
    expect(sourceOf("booking_completed")).toBe("activity");
    expect(sourceOf("route_stop_proof")).toBe("route");
    expect(sourceOf("route_completed")).toBe("route");
    expect(sourceOf("reward_redeemed")).toBe("reward");
  });
});
