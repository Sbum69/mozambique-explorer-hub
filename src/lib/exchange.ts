import { supabase } from "@/integrations/supabase/client";

/**
 * Reference exchange rates (open.er-api.com, refreshed daily on the database server into
 * public.exchange_rates — readable by everyone, writable only by the refresh job).
 * Rates are stored as units per 1 USD, so any pair converts through USD.
 */

export const CURRENCIES = ["MZN", "USD", "EUR", "ZAR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Rates older than this are treated as missing: the converter hides instead of showing stale values. */
export const RATES_MAX_AGE_DAYS = 7;

export interface RateTable {
  perUsd: Partial<Record<Currency, number>>;
  rateDate: string;
  source: string;
}

export const isCurrency = (c: string): c is Currency =>
  (CURRENCIES as readonly string[]).includes(c);

/** Rounds half away from zero to 2 decimals without binary drift (1.005 → 1.01). */
export function round2(n: number): number {
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
}

export function convert(
  amount: number,
  from: string,
  to: string,
  table: Pick<RateTable, "perUsd">,
): number {
  if (!isCurrency(from) || !isCurrency(to)) throw new Error("INVALID_CURRENCY");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("INVALID_AMOUNT");
  const a = table.perUsd[from];
  const b = table.perUsd[to];
  if (!a || !b || !(a > 0) || !(b > 0)) throw new Error("RATE_MISSING");
  return round2((amount / a) * b);
}

export function isStale(rateDate: string, now = new Date()): boolean {
  const t = new Date(rateDate).getTime();
  return Number.isNaN(t) || now.getTime() - t > RATES_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

interface RateRow {
  currency: string;
  per_usd: number | string;
  rate_date: string;
  source: string;
}

/** Builds the table from database rows; null when any supported currency is missing or the rates are stale. */
export function rateTableFromRows(rows: RateRow[], now = new Date()): RateTable | null {
  const perUsd: RateTable["perUsd"] = {};
  let rateDate = "";
  let source = "";
  for (const r of rows) {
    const v = Number(r.per_usd);
    if (!isCurrency(r.currency) || !(v > 0)) continue;
    perUsd[r.currency] = v;
    if (!rateDate || r.rate_date < rateDate) rateDate = r.rate_date;
    source = r.source;
  }
  if (CURRENCIES.some((c) => !perUsd[c]) || !rateDate || isStale(rateDate, now)) return null;
  return { perUsd, rateDate, source };
}

export async function fetchRateTable(): Promise<RateTable | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("currency, per_usd, rate_date, source");
  if (error) throw new Error(error.message);
  return rateTableFromRows(data ?? []);
}
