import { supabase } from "@/integrations/supabase/client";

export interface OwnBusiness {
  id: string;
  name: string;
  category: string;
  location: string;
  contact: string;
  description: string;
  status: string;
  verified: boolean;
  type: string | null;
  rejectionReason: string | null;
}

function textOf(value: unknown, key: string) {
  if (value && typeof value === "object" && key in (value as Record<string, unknown>)) {
    const inner = (value as Record<string, unknown>)[key];
    return typeof inner === "string" ? inner : "";
  }
  return "";
}

/** The business owned by the authenticated user (RLS only returns their own). */
export async function fetchOwnBusiness(): Promise<OwnBusiness | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, category, location, contact, description, status, verified, type, rejection_reason")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    category: data.category ?? "—",
    location: textOf(data.location, "address"),
    contact: textOf(data.contact, "phone"),
    description: data.description ?? "",
    status: data.status,
    verified: data.verified,
    type: data.type,
    rejectionReason: data.rejection_reason ?? null,
  };
}
