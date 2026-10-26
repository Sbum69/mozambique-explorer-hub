import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { authReturnFor, validateAuthReturnSearch } from "./auth";

describe("FAV-1 return to the page after signing in", () => {
  it("returns guests to the allow-listed page they came from", () => {
    expect(authReturnFor("/map")).toBe("/map");
    expect(authReturnFor("/experiences")).toBe("/experiences");
    expect(authReturnFor("/favorites")).toBe("/favorites");
    expect(authReturnFor("/itinerary/6f9619ff-8b86-4d01-b42d-00cf4fc964ff")).toBe("/itineraries");
    expect(authReturnFor("/experience/abc")).toBe("/experiences");
  });

  it("never returns to an arbitrary path (no open redirect)", () => {
    expect(authReturnFor("/admin")).toBeUndefined();
    expect(authReturnFor("//evil.example")).toBeUndefined();
    expect(validateAuthReturnSearch({ redirect: "https://evil.example" })).toEqual({});
    expect(validateAuthReturnSearch({ redirect: "/map" })).toEqual({ redirect: "/map" });
  });
});
