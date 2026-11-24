/**
 * Optional "offer a product as a reward" step (after the business registration and on the first
 * visit to the dashboard). The direct link opens the "New reward" form of BusinessRewards.
 */

/** Search of /business-dashboard that opens the "New reward" form. */
export const NEW_REWARD_SEARCH = { status: "all", reward: "new" } as const;

/** Only "new" is a valid value of ?reward=; anything else is ignored. */
export function parseRewardParam(value: unknown): "new" | undefined {
  return value === "new" ? "new" : undefined;
}

/**
 * What the dashboard does with ?reward=new once the owner's businesses are loaded: open the form
 * when one is approved (rewards need an approved business, 0038), otherwise only show the section
 * with its "needs approval" message.
 */
export function newRewardAction(
  param: "new" | undefined,
  approvedBusinesses: number,
): "open" | "explain" | "none" {
  if (param !== "new") return "none";
  return approvedBusinesses > 0 ? "open" : "explain";
}
