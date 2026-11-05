import { supabase } from "@/integrations/supabase/client";
import { createInvite, importContent } from "@/lib/content";

/**
 * M9 — interest requests from the "Para negócios" page (0055). Visitors send them through
 * submit_business_lead (honeypot + limit per IP per day in the database); only the admin reads them.
 */

export type LeadStatus = "new" | "contacted" | "converted" | "discarded";
export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "converted", "discarded"];

export interface LeadInput {
  businessName: string;
  provinceId: string;
  categoryCode: string;
  contactName: string;
  contact: string;
  acceptsBookings: boolean;
  message: string;
  lang: "pt" | "en";
  /** Honeypot: hidden from people; anything typed here makes the request be ignored. */
  website: string;
}

export type LeadProblem = "businessName" | "province" | "category" | "contactName" | "contact";

/** Field checks before sending (the database checks again). */
export function leadProblems(v: Omit<LeadInput, "lang" | "website">): LeadProblem[] {
  const out: LeadProblem[] = [];
  if (v.businessName.trim().length < 2) out.push("businessName");
  if (!v.provinceId) out.push("province");
  if (!v.categoryCode) out.push("category");
  if (v.contactName.trim().length < 2) out.push("contactName");
  const c = v.contact.trim();
  const phone = /^\+?[0-9 ]{9,16}$/.test(c);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
  if (!phone && !email) out.push("contact");
  return out;
}

export async function submitLead(v: LeadInput): Promise<void> {
  const { error } = await supabase.rpc("submit_business_lead", {
    _business_name: v.businessName.trim(),
    _province_id: v.provinceId,
    _category_code: v.categoryCode,
    _contact_name: v.contactName.trim(),
    _contact: v.contact.trim(),
    _accepts_bookings: v.acceptsBookings,
    _message: v.message.trim() || null,
    _lang: v.lang,
    _website: v.website,
  });
  if (error) throw new Error(error.message);
}

/** Founding Partner places still open (public). */
export async function fetchFounderPlacesLeft(): Promise<number> {
  const { data, error } = await supabase.rpc("founder_places_left");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export interface Lead {
  id: string;
  businessName: string;
  provinceId: string;
  provinceCode: string;
  categoryCode: string;
  contactName: string;
  contact: string;
  acceptsBookings: boolean;
  message: string | null;
  lang: "pt" | "en";
  status: LeadStatus;
  adminNote: string | null;
  businessId: string | null;
  createdAt: string;
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("business_leads")
    .select(
      "id, business_name, province_id, category_code, contact_name, contact, accepts_bookings, message, lang, status, admin_note, business_id, created_at, provinces(code)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    businessName: r.business_name,
    provinceId: r.province_id,
    provinceCode: (r.provinces as { code: string } | null)?.code ?? "",
    categoryCode: r.category_code,
    contactName: r.contact_name,
    contact: r.contact,
    acceptsBookings: r.accepts_bookings,
    message: r.message,
    lang: r.lang === "en" ? "en" : "pt",
    status: r.status as LeadStatus,
    adminNote: r.admin_note,
    businessId: r.business_id,
    createdAt: r.created_at,
  }));
}

export async function setLeadStatus(
  id: string,
  status: LeadStatus,
  note?: string,
  businessId?: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_lead_status", {
    _id: id,
    _status: status,
    _note: note,
    _business_id: businessId,
  });
  if (error) throw new Error(error.message);
}

/** Import row (0051 admin_import_content) for a draft business built from a request. */
export function leadImportRow(l: Lead): Record<string, string> {
  const c = l.contact.trim();
  const row: Record<string, string> = {
    kind: "business",
    name: l.businessName.trim(),
    province: l.provinceCode,
    category: l.categoryCode,
  };
  if (c.includes("@")) row.email = c;
  else row.phone = c;
  return row;
}

/**
 * Creates the draft business (pending, not public) through the 0051 import, creates the owner
 * invite and marks the request as converted. Returns the invite token.
 */
export async function convertLead(l: Lead): Promise<{ businessId: string; token: string }> {
  const [result] = await importContent([leadImportRow(l)], false);
  if (!result) throw new Error("IMPORT_FAILED");
  if (result.duplicate) throw new Error("DUPLICATE");
  if (result.status === "error" || !result.id)
    throw new Error(`IMPORT_FAILED:${result.errors.join(",")}`);
  const token = await createInvite(result.id);
  await setLeadStatus(l.id, "converted", undefined, result.id);
  return { businessId: result.id, token };
}
