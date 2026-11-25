/**
 * Today's date in Mozambique (YYYY-MM-DD), the reference for reward validity.
 * In its own module so pages that only need the date (the games) do not load the reward form
 * validators (zod) with src/lib/rewards.ts.
 */
export function maputoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo" }).format(now);
}
