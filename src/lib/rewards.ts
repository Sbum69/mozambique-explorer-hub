import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";

/**
 * Business rewards: owners manage the rewards of their own business (RLS), tourists redeem them
 * with redeem_reward (atomic, points_ledger), and the business validates the voucher code once.
 */
export const rewardSchema = z.object({
  businessId: z.string().uuid(),
  titlePt: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().max(120),
  descriptionPt: z.string().trim().max(1000),
  descriptionEn: z.string().trim().max(1000),
  costPoints: z.number().int().min(1).max(100000),
  /** Empty means unlimited. */
  stock: z.number().int().min(0).max(100000).nullable(),
  /** YYYY-MM-DD, last day the reward can be redeemed; empty means no end date. */
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  active: z.boolean(),
});
export type RewardInput = z.infer<typeof rewardSchema>;

export interface BusinessReward {
  id: string;
  businessId: string | null;
  businessName: string | null;
  titlePt: string;
  titleEn: string | null;
  descriptionPt: string | null;
  descriptionEn: string | null;
  costPoints: number;
  stock: number | null;
  validUntil: string | null;
  active: boolean;
}

const REWARD_SELECT =
  "id, business_id, title_pt, title_en, description_pt, description_en, cost_points, stock, valid_until, active, businesses(name)";

type RewardRow = {
  id: string;
  business_id: string | null;
  title_pt: string;
  title_en: string | null;
  description_pt: string | null;
  description_en: string | null;
  cost_points: number;
  stock: number | null;
  valid_until: string | null;
  active: boolean;
  businesses: { name: string } | null;
};

function mapReward(r: RewardRow): BusinessReward {
  return {
    id: r.id,
    businessId: r.business_id,
    businessName: r.businesses?.name ?? null,
    titlePt: r.title_pt,
    titleEn: r.title_en,
    descriptionPt: r.description_pt,
    descriptionEn: r.description_en,
    costPoints: r.cost_points,
    stock: r.stock,
    validUntil: r.valid_until,
    active: r.active,
  };
}

/** Today's date in Mozambique (YYYY-MM-DD), the reference for reward validity. */
export function maputoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo" }).format(now);
}

/** A reward can be redeemed while active, in stock and not past its last valid day. */
export function isRewardRedeemable(
  r: Pick<BusinessReward, "active" | "stock" | "validUntil">,
  today = maputoToday(),
): boolean {
  return (
    r.active &&
    (r.stock === null || r.stock > 0) &&
    (r.validUntil === null || r.validUntil >= today)
  );
}

export async function fetchOwnerRewards(userId: string): Promise<{
  businesses: { id: string; name: string; status: string }[];
  rewards: BusinessReward[];
}> {
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
  const ids = (businesses ?? []).map((b) => b.id);
  if (!ids.length) return { businesses: [], rewards: [] };
  const { data, error: rErr } = await supabase
    .from("rewards")
    .select(REWARD_SELECT)
    .in("business_id", ids)
    .order("created_at", { ascending: false });
  if (rErr) throw new Error(rErr.message);
  return {
    businesses: businesses ?? [],
    rewards: (data ?? []).map((r) => mapReward(r as unknown as RewardRow)),
  };
}

export async function saveReward(input: RewardInput, id?: string): Promise<void> {
  const v = rewardSchema.parse(input);
  const row = {
    title_pt: v.titlePt,
    title_en: v.titleEn || null,
    description_pt: v.descriptionPt || null,
    description_en: v.descriptionEn || null,
    cost_points: v.costPoints,
    stock: v.stock,
    valid_until: v.validUntil,
    active: v.active,
  };
  const { error } = id
    ? await supabase.from("rewards").update(row).eq("id", id)
    : await supabase.from("rewards").insert({ ...row, business_id: v.businessId });
  if (error) throw new Error(error.message);
}

export async function setRewardActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("rewards").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}

export interface VoucherCheck {
  status: "validated" | "already_used";
  used_at: string;
  redeemed_at: string;
  title_pt: string;
  title_en: string;
  cost_points: number;
}

export async function validateVoucher(code: string): Promise<VoucherCheck> {
  const { data, error } = await supabase.rpc("validate_voucher", { _code: code });
  if (error) throw new Error(error.message);
  return data as unknown as VoucherCheck;
}

/** Admin: every reward (RLS lets admins read all). */
export async function fetchAllRewardsAdmin(): Promise<BusinessReward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select(REWARD_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapReward(r as unknown as RewardRow));
}

/** Server error codes from rewards, redemption and voucher validation, in PT/EN. */
export function rewardErrorText(message: string, lang: "pt" | "en"): string {
  const map: Record<string, [string, string]> = {
    voucher_not_found: [
      "Voucher não encontrado para o teu negócio.",
      "Voucher not found for your business.",
    ],
    reward_expired: ["Esta recompensa já expirou.", "This reward has expired."],
    own_reward: [
      "Não podes resgatar uma recompensa do teu próprio negócio.",
      "You can't redeem a reward from your own business.",
    ],
    title_required: ["Indica o título em português.", "Enter the Portuguese title."],
    "row-level security": [
      "Não tens permissão para esta recompensa (o negócio tem de estar aprovado).",
      "You don't have permission for this reward (the business must be approved).",
    ],
  };
  const m = message.toLowerCase();
  const hit = Object.keys(map).find((k) => m.includes(k));
  if (hit) return map[hit][lang === "pt" ? 0 : 1];
  return lang === "pt"
    ? "Não foi possível concluir. Tenta novamente."
    : "Could not complete. Please try again.";
}
