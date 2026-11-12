import { supabase } from "@/integrations/supabase/client";

/**
 * Title and description of public detail pages, read on the server (route loaders with
 * ssr: "data-only") so search engines and link previews see the real name in the HTML.
 * Only public rows are visible (RLS for anon); any error returns null and the page keeps its
 * generic title. Never invents text: an empty description falls back to the generic one.
 */
export interface PageMeta {
  title: string;
  description: string | null;
}

/** A place as text: the column is plain text on some tables and {address} JSON on others. */
const place = (v: unknown): string | null => {
  if (typeof v === "string") return v.trim() || null;
  if (v && typeof v === "object") {
    const o = v as { address?: unknown; city?: unknown };
    const t = typeof o.city === "string" ? o.city : typeof o.address === "string" ? o.address : "";
    return t.trim() || null;
  }
  return null;
};

const clip = (s: string | null | undefined, max = 160) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

export async function experienceMeta(id: string): Promise<PageMeta | null> {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("title_pt, description_pt, location")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const loc = place(data.location);
    const where = loc ? ` em ${loc}` : "";
    return { title: `${data.title_pt}${where}`, description: clip(data.description_pt) };
  } catch {
    return null;
  }
}

export async function businessMeta(id: string): Promise<PageMeta | null> {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("name, description, location")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const loc = place(data.location);
    const where = loc ? ` · ${loc}` : "";
    return { title: `${data.name}${where}`, description: clip(data.description) };
  } catch {
    return null;
  }
}

export async function routeMeta(id: string): Promise<PageMeta | null> {
  try {
    const { data, error } = await supabase
      .from("routes")
      .select("title, description")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return { title: data.title, description: clip(data.description) };
  } catch {
    return null;
  }
}

/** Head tags for a detail page: the real name when known, otherwise the generic text. */
export function detailHead(
  meta: PageMeta | null | undefined,
  generic: { title: string; description: string },
  type: "website" | "article" = "website",
) {
  const title = meta ? `${meta.title} — EKAYA` : generic.title;
  const description = meta?.description ?? generic.description;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
