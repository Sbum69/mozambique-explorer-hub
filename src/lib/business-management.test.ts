/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { activitySchema, availabilitySchema, profileSchema } from "./business-management";
const id = "11111111-1111-4111-8111-111111111111";
const activity = { businessId: id, titlePt: "Teste", titleEn: "Test", descriptionPt: "Teste isolado", descriptionEn: "Isolated test", category: "culture", priceMzn: 250, durationHours: 2, capacity: 10, location: "Test", destinationId: null, active: false };
describe("8E.2 management rules", () => {
  test("commercial activity remains associated with the supplied valid business", () => expect(activitySchema.parse(activity).businessId).toBe(id));
  test("price cannot be negative", () => expect(activitySchema.safeParse({ ...activity, priceMzn: -1 }).success).toBe(false));
  test("duration must be positive", () => expect(activitySchema.safeParse({ ...activity, durationHours: 0 }).success).toBe(false));
  test("capacity must be a positive integer", () => expect(activitySchema.safeParse({ ...activity, capacity: 1.5 }).success).toBe(false));
  test("both language titles are required", () => expect(activitySchema.safeParse({ ...activity, titleEn: "" }).success).toBe(false));
  test("availability uses existing weekday model 0 through 6", () => expect(availabilitySchema.safeParse({ experienceId: id, dayOfWeek: 7, startTime: "09:00", endTime: "10:00", capacity: 5, active: true }).success).toBe(false));
  test("end time must follow start time", () => expect(availabilitySchema.safeParse({ experienceId: id, dayOfWeek: 1, startTime: "10:00", endTime: "09:00", capacity: 5, active: true }).success).toBe(false));
  test("profile does not accept approval fields", () => {
    const parsed = profileSchema.parse({ id, name: "Test", description: "Test", categoryCode: "test", provinceId: id, address: "Test", phone: "", email: "", website: "", status: "approved", verified: true });
    expect("status" in parsed).toBe(false); expect("verified" in parsed).toBe(false);
  });
});