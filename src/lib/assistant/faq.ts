import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CatalogueItem, FaqEntry, FaqKind, FaqLink, Slot } from "@/lib/assistant/engine";
import { rpcNull } from "@/lib/rpc-null";

/** Assistant FAQ data (0056): public read of active entries, admin edits with versions. */

type FaqRow = {
  id: string;
  slug: string;
  topic: string;
  kind: string;
  question_pt: string;
  question_en: string;
  answer_pt: string;
  answer_en: string;
  keywords_pt: string[];
  keywords_en: string[];
  links: Json;
  needs_validation: boolean;
  active: boolean;
  version: number;
  updated_at: string;
};

export interface AdminFaqEntry extends FaqEntry {
  id: string;
  active: boolean;
  version: number;
  updatedAt: string;
}

const fromRow = (r: FaqRow): AdminFaqEntry => ({
  id: r.id,
  slug: r.slug,
  topic: r.topic,
  kind: r.kind as FaqKind,
  qPt: r.question_pt,
  qEn: r.question_en,
  aPt: r.answer_pt,
  aEn: r.answer_en,
  kwPt: r.keywords_pt ?? [],
  kwEn: r.keywords_en ?? [],
  links: (Array.isArray(r.links) ? r.links : []) as unknown as FaqLink[],
  validate: r.needs_validation,
  active: r.active,
  version: r.version,
  updatedAt: r.updated_at,
});

/** Active entries (RLS: everyone). Admins also get inactive ones, so filter for the public panel. */
export async function fetchFaq(): Promise<AdminFaqEntry[]> {
  const { data, error } = await supabase.from("assistant_faq_entries").select("*").order("topic");
  if (error) throw new Error(error.message);
  return (data as FaqRow[]).map(fromRow);
}

export async function logUnanswered(question: string, lang: "pt" | "en"): Promise<void> {
  await supabase.rpc("assistant_log_unanswered", { _question: question, _lang: lang });
}

export async function rateAnswer(slug: string, helpful: boolean, lang: "pt" | "en") {
  const { error } = await supabase.rpc("assistant_rate_answer", {
    _slug: slug,
    _helpful: helpful,
    _lang: lang,
  });
  if (error) throw new Error(error.message);
}

/** Published activities for price and schedule answers. */
export async function fetchCatalogue(): Promise<CatalogueItem[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select("id, title_pt, title_en, price_mzn")
    .eq("active", true)
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    titlePt: e.title_pt,
    titleEn: e.title_en,
    priceMzn: Number(e.price_mzn),
  }));
}

/** Slots of the next 7 days from get_experience_availability. */
export async function fetchSlots(experienceId: string): Promise<Slot[]> {
  const days = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo" }).format(
      new Date(Date.now() + i * 86_400_000),
    ),
  );
  const all = await Promise.all(
    days.map(async (d) => {
      const { data, error } = await supabase.rpc("get_experience_availability", {
        _experience_id: experienceId,
        _date: d,
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
  );
  return all.flat().map((r) => ({
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    available: r.available,
    remaining: Math.max(0, r.capacity - r.booked_people),
  }));
}

// ---------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------

export interface FaqDraft {
  slug: string;
  topic: string;
  kind: FaqKind;
  qPt: string;
  qEn: string;
  aPt: string;
  aEn: string;
  kwPt: string[];
  kwEn: string[];
  links: FaqLink[];
  validate: boolean;
  active: boolean;
}

export async function saveFaq(id: string | null, d: FaqDraft, reason: string): Promise<string> {
  const { data, error } = await supabase.rpc("admin_save_faq_entry", {
    _id: rpcNull(id),
    _entry: {
      slug: d.slug,
      topic: d.topic,
      kind: d.kind,
      question_pt: d.qPt,
      question_en: d.qEn,
      answer_pt: d.aPt,
      answer_en: d.aEn,
      keywords_pt: d.kwPt,
      keywords_en: d.kwEn,
      links: d.links as unknown as Json,
      needs_validation: d.validate,
      active: d.active,
    },
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export interface Unanswered {
  id: string;
  question: string;
  lang: "pt" | "en";
  handled: boolean;
  createdAt: string;
}

export async function fetchUnanswered(): Promise<Unanswered[]> {
  const { data, error } = await supabase
    .from("assistant_unanswered")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    question: r.question,
    lang: r.lang === "en" ? "en" : "pt",
    handled: r.handled,
    createdAt: r.created_at,
  }));
}

export async function markUnansweredHandled(id: string): Promise<void> {
  const { error } = await supabase.rpc("admin_mark_unanswered", { _id: id });
  if (error) throw new Error(error.message);
}

/** 👍/👎 per entry over the last 30 days. */
export async function fetchFeedbackStats(): Promise<Record<string, { up: number; down: number }>> {
  const { data, error } = await supabase.from("assistant_feedback").select("entry_slug, helpful");
  if (error) throw new Error(error.message);
  const out: Record<string, { up: number; down: number }> = {};
  for (const r of data ?? []) {
    const s = (out[r.entry_slug] ??= { up: 0, down: 0 });
    if (r.helpful) s.up++;
    else s.down++;
  }
  return out;
}

/** "a, b, c" → ["a", "b", "c"] (trimmed, no empties, no repeats). */
export const splitKeywords = (s: string) => [
  ...new Set(
    s
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  ),
];
