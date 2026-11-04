import { supabase } from "@/integrations/supabase/client";

/**
 * M1 — commission engine. The settings live in public.commercial_configs (versioned, admin only);
 * the database computes quotes and booking snapshots. commissionSplit mirrors
 * public.commission_split so screens can show examples without a round trip.
 * Money in centavos, rates in basis points (1% = 100 bp).
 */

export interface CommercialConfig {
  version: number;
  commissionBp: number;
  founderCommissionBp: number;
  founderMonths: number;
  founderCap: number;
  founderFreeHighlights: number;
  providerFeeBp: number;
  highlightWeekCents: number;
  highlightMonthCents: number;
  planMonthCents: number;
  /** Highlights approved at the same time for one place (home, a province or a category). */
  sponsoredSlotsPerScope: number;
  /** Sponsored cards shown on one page. */
  sponsoredPerPage: number;
  note: string | null;
  createdAt: string;
}

export interface Split {
  commissionCents: number;
  providerFeeCents: number;
  netCents: number;
}

/** Half up to the centavo; the net takes the remainder (gross = commission + fee + net). */
export function commissionSplit(grossCents: number, commissionBp: number, feeBp: number): Split {
  if (!Number.isInteger(grossCents) || grossCents < 0) throw new Error("INVALID_AMOUNT");
  const commissionCents = Math.floor((grossCents * commissionBp + 5000) / 10000);
  const providerFeeCents = Math.floor((grossCents * feeBp + 5000) / 10000);
  return {
    commissionCents,
    providerFeeCents,
    netCents: grossCents - commissionCents - providerFeeCents,
  };
}

export const toCents = (mzn: number) => Math.round(mzn * 100);

/** "1 500,00 MT" style amount from centavos, in the app language. */
export function formatCents(cents: number, lang: "pt" | "en"): string {
  return `${(cents / 100).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} MZN`;
}

/** "10%" / "7,5%" from basis points. */
export function formatBp(bp: number, lang: "pt" | "en"): string {
  return `${(bp / 100).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", { maximumFractionDigits: 2 })}%`;
}

type Row = {
  version: number;
  commission_bp: number;
  founder_commission_bp: number;
  founder_months: number;
  founder_cap: number;
  founder_free_highlights: number;
  provider_fee_bp: number;
  highlight_week_cents: number;
  highlight_month_cents: number;
  plan_month_cents: number;
  sponsored_slots_per_scope: number;
  sponsored_per_page: number;
  note: string | null;
  created_at: string;
};
const fromRow = (r: Row): CommercialConfig => ({
  version: r.version,
  commissionBp: r.commission_bp,
  founderCommissionBp: r.founder_commission_bp,
  founderMonths: r.founder_months,
  founderCap: r.founder_cap,
  founderFreeHighlights: r.founder_free_highlights,
  providerFeeBp: r.provider_fee_bp,
  highlightWeekCents: Number(r.highlight_week_cents),
  highlightMonthCents: Number(r.highlight_month_cents),
  planMonthCents: Number(r.plan_month_cents),
  sponsoredSlotsPerScope: r.sponsored_slots_per_scope,
  sponsoredPerPage: r.sponsored_per_page,
  note: r.note,
  createdAt: r.created_at,
});

/** All versions, newest first (index 0 is the one in force). */
export async function fetchCommercialConfigs(): Promise<CommercialConfig[]> {
  const { data, error } = await supabase
    .from("commercial_configs")
    .select("*")
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[]).map(fromRow);
}

export async function fetchCurrentConfig(): Promise<CommercialConfig> {
  const [first] = await fetchCommercialConfigs();
  if (!first) throw new Error("NO_CONFIG");
  return first;
}

export interface FounderTerms {
  founderSince: string | null;
  founderUntil: string | null;
  freeHighlightsUsed: number;
}

/** Founding Partner terms of a business (RLS: the owner or the admin). */
export async function fetchFounderTerms(businessId: string): Promise<FounderTerms | null> {
  const { data, error } = await supabase
    .from("business_commercial_terms")
    .select("founder_since, founder_until, free_highlights_used")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data
    ? {
        founderSince: data.founder_since,
        founderUntil: data.founder_until,
        freeHighlightsUsed: data.free_highlights_used,
      }
    : null;
}

export function isFounderActive(t: FounderTerms | null, now = new Date()): boolean {
  if (!t?.founderSince) return false;
  return new Date(t.founderSince) <= now && (!t.founderUntil || new Date(t.founderUntil) > now);
}

export interface ConfigInput {
  commissionBp: number;
  founderCommissionBp: number;
  founderMonths: number;
  founderCap: number;
  founderFreeHighlights: number;
  providerFeeBp: number;
  highlightWeekCents: number;
  highlightMonthCents: number;
  planMonthCents: number;
  reason: string;
}

export async function saveCommercialConfig(c: ConfigInput): Promise<number> {
  const { data, error } = await supabase.rpc("admin_set_commercial_config", {
    _commission_bp: c.commissionBp,
    _founder_commission_bp: c.founderCommissionBp,
    _founder_months: c.founderMonths,
    _founder_cap: c.founderCap,
    _founder_free_highlights: c.founderFreeHighlights,
    _provider_fee_bp: c.providerFeeBp,
    _highlight_week_cents: c.highlightWeekCents,
    _highlight_month_cents: c.highlightMonthCents,
    _plan_month_cents: c.planMonthCents,
    _reason: c.reason,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function setFounder(
  businessId: string,
  founder: boolean,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_founder", {
    _business_id: businessId,
    _founder: founder,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
}

export interface AuditEntry {
  id: string;
  action: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
}

export async function fetchCommercialAudit(limit = 50): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit")
    .select("id, action, entity_id, reason, created_at")
    .in("entity", ["commercial_configs", "business_commercial_terms"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    entityId: a.entity_id,
    reason: a.reason,
    createdAt: a.created_at,
  }));
}
