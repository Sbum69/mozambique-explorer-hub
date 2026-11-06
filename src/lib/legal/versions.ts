/**
 * Versions of the legal texts in force (publication date). They must match
 * public.current_legal_versions() in the latest migration that defines it (checked by legal.test.ts):
 * change both together, in a new migration, whenever a text changes.
 */
export const LEGAL_VERSIONS = { terms: "2026-11-06", privacy: "2026-11-06" } as const;
