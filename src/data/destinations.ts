/**
 * The destination catalogue now lives in the database.
 * Read it with `useDestinations()` / `fetchDestinations()` from `@/lib/destinations`.
 * Only the interest presets (pure UI options) remain here.
 */
export const INTERESTS = [
  { id: "beach", labelKey: "intBeach" as const },
  { id: "culture", labelKey: "intCulture" as const },
  { id: "food", labelKey: "intFood" as const },
  { id: "nature", labelKey: "intNature" as const },
  { id: "community", labelKey: "intCommunity" as const },
  { id: "heritage", labelKey: "intHeritage" as const },
  { id: "festival", labelKey: "intFestival" as const },
  { id: "adventure", labelKey: "intAdventure" as const },
];
