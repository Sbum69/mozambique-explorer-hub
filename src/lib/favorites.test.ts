import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import {
  LEGACY_FAVORITES_KEY,
  importLegacyFavorites,
  parseLegacyFavorites,
  type FavoriteRef,
} from "./favorites";

const ROUTE = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";
const legacy = JSON.stringify([
  { id: "maputo", type: "place", data: { name: "Maputo" }, savedDate: "2026-09-01" },
  { id: ROUTE, type: "itinerary", data: {}, savedDate: "2026-09-02" },
  { id: "maputo", type: "place", data: {}, savedDate: "2026-09-03" }, // duplicate
  { id: "n1", type: "news", data: {} }, // type no longer supported
  { id: "", type: "place" },
  { type: "experience" },
  "garbage",
]);

function memoryStorage(initial: string | null) {
  const map = new Map<string, string>();
  if (initial !== null) map.set(LEGACY_FAVORITES_KEY, initial);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    removeItem: vi.fn((k: string) => void map.delete(k)),
    has: () => map.has(LEGACY_FAVORITES_KEY),
  };
}

describe("FAV-1 legacy favourites in localStorage", () => {
  it("keeps only valid, supported and unique references", () => {
    expect(parseLegacyFavorites(legacy)).toEqual([
      { type: "place", id: "maputo" },
      { type: "itinerary", id: ROUTE },
    ]);
  });

  it("ignores empty, malformed or non-array values", () => {
    expect(parseLegacyFavorites(null)).toEqual([]);
    expect(parseLegacyFavorites("not json")).toEqual([]);
    expect(parseLegacyFavorites('{"id":"maputo"}')).toEqual([]);
    expect(parseLegacyFavorites(JSON.stringify([{ id: "x".repeat(101), type: "place" }]))).toEqual(
      [],
    );
  });

  it("imports every item and then deletes the local copy", async () => {
    const storage = memoryStorage(legacy);
    const added: FavoriteRef[] = [];
    const r = await importLegacyFavorites(storage, async (ref) => void added.push(ref));
    expect(added).toHaveLength(2);
    expect(r).toEqual({ imported: 2, rejected: 0, failed: 0, cleared: true });
    expect(storage.has()).toBe(false);
  });

  it("drops items the server refuses (removed or not visible) and still clears", async () => {
    const storage = memoryStorage(legacy);
    const r = await importLegacyFavorites(storage, async (ref) => {
      if (ref.type === "itinerary") throw new Error("ITEM_NOT_FOUND");
    });
    expect(r).toMatchObject({ imported: 1, rejected: 1, failed: 0, cleared: true });
    expect(storage.has()).toBe(false);
  });

  it("keeps the local copy when a save fails for another reason (e.g. offline), to retry later", async () => {
    const storage = memoryStorage(legacy);
    const r = await importLegacyFavorites(storage, async (ref) => {
      if (ref.type === "place") throw new Error("Failed to fetch");
    });
    expect(r).toMatchObject({ imported: 1, failed: 1, cleared: false });
    expect(storage.has()).toBe(true);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("does nothing when there is no local copy", async () => {
    const storage = memoryStorage(null);
    const add = vi.fn();
    const r = await importLegacyFavorites(storage, add);
    expect(add).not.toHaveBeenCalled();
    expect(r).toEqual({ imported: 0, rejected: 0, failed: 0, cleared: false });
  });
});
