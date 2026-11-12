import { describe, expect, it } from "vitest";
import {
  ALL_PROVINCES,
  BADGES,
  PROVINCE_REGIONS,
  badgeStatus,
  isUnlocked,
  passportKey,
  quizPassed,
  type BadgeInput,
} from "./games";

const empty: BadgeInput = {
  completed: {},
  passedQuizzes: 0,
  photoSteps: 0,
  bookingsCompleted: 0,
  routesCompleted: 0,
};
const badge = (id: string) => BADGES.find((b) => b.id === id)!;

describe("games rules", () => {
  it("quiz passes at 5 of 7 (70%) and fails at 4 of 7", () => {
    expect(quizPassed(5, 7)).toBe(true);
    expect(quizPassed(4, 7)).toBe(false);
  });
  it("locked game unlocks only after its prerequisite is completed", () => {
    const g = {
      key: "g4",
      category: "tesouro",
      xp: 250,
      total: 4,
      verification: "photo" as const,
      unlockAfter: "g3",
      provinceId: null,
    };
    expect(isUnlocked(g, {})).toBe(false);
    expect(isUnlocked(g, { g3: "2026-01-01" })).toBe(true);
  });
  it("no badge is earned with no verified activity", () => {
    expect(BADGES.some((b) => badgeStatus(b, empty).earned)).toBe(false);
  });
  it("Historian needs 5 passed quizzes", () => {
    expect(badgeStatus(badge("s3"), { ...empty, passedQuizzes: 4 }).earned).toBe(false);
    expect(badgeStatus(badge("s3"), { ...empty, passedQuizzes: 5 }).earned).toBe(true);
  });
  it("Community Friend needs 3 completed bookings", () => {
    expect(badgeStatus(badge("s2"), { ...empty, bookingsCompleted: 3 }).earned).toBe(true);
  });
  it("region badges need every passport of the region, and only passports", () => {
    const south = Object.fromEntries(
      PROVINCE_REGIONS.south.map((p) => [passportKey(p), "2026-11-12"]),
    );
    expect(badgeStatus(badge("s9"), { ...empty, completed: south }).earned).toBe(true);
    const { [passportKey("gaza")]: _gaza, ...missingGaza } = south;
    void _gaza;
    expect(badgeStatus(badge("s9"), { ...empty, completed: missingGaza }).earned).toBe(false);
    expect(badgeStatus(badge("s10"), { ...empty, completed: south }).earned).toBe(false);
    expect(badgeStatus(badge("s9"), { ...empty, completed: { gv: "2026-11-12" } }).have).toBe(0);
  });
  it("the 11 provinces are the three regions, with no repeats", () => {
    expect(ALL_PROVINCES).toHaveLength(11);
    expect(new Set(ALL_PROVINCES).size).toBe(11);
    const all = Object.fromEntries(ALL_PROVINCES.map((p) => [passportKey(p), "2026-11-12"]));
    expect(badgeStatus(badge("s12"), { ...empty, completed: all }).earned).toBe(true);
  });
});
