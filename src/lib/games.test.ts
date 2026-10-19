import { describe, expect, it } from "vitest";
import { BADGES, badgeStatus, isUnlocked, quizPassed, type BadgeInput } from "./games";

const empty: BadgeInput = { completed: {}, passedQuizzes: 0, photoSteps: 0, bookingsCompleted: 0, routesCompleted: 0 };
const badge = (id: string) => BADGES.find((b) => b.id === id)!;

describe("games rules", () => {
  it("quiz passes at 5 of 7 (70%) and fails at 4 of 7", () => {
    expect(quizPassed(5, 7)).toBe(true);
    expect(quizPassed(4, 7)).toBe(false);
  });
  it("locked game unlocks only after its prerequisite is completed", () => {
    const g = { key: "g4", category: "tesouro", xp: 250, total: 4, verification: "photo" as const, unlockAfter: "g3" };
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
});
