/**
 * The destination catalogue now lives in the database.
 * Read it with `useDestinations()` / `fetchDestinations()` from `@/lib/destinations`.
 * Only the interest presets (pure UI options) remain here.
 */
export const INTERESTS = [
  { id: "beach", emoji: "🏖️", labelKey: "intBeach" as const },
  { id: "culture", emoji: "🎨", labelKey: "intCulture" as const },
  { id: "food", emoji: "🍽️", labelKey: "intFood" as const },
  { id: "nature", emoji: "🌿", labelKey: "intNature" as const },
  { id: "community", emoji: "👥", labelKey: "intCommunity" as const },
  { id: "heritage", emoji: "🏛️", labelKey: "intHeritage" as const },
  { id: "festival", emoji: "🎭", labelKey: "intFestival" as const },
  { id: "adventure", emoji: "🏃", labelKey: "intAdventure" as const },
];
