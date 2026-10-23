/**
 * The experiences catalogue now lives in the database.
 * Read it through `@/lib/experiences` / `useExperiences()`.
 * This file only re-exports the shared types for modules that still import from here.
 */
export type { Experience, ExperienceCategory } from "@/lib/experiences";
