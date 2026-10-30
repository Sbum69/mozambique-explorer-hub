import { supabase } from "@/integrations/supabase/client";

/**
 * CONTEÚDO-1 — readiness ("pronto para publicar"), CSV import as drafts, owner invites and
 * content photos. The rules live in the database (0051): business_missing / experience_missing,
 * the experiences_require_ready trigger and admin_import_content.
 */

export type BusinessMissing =
  | "name"
  | "category"
  | "province"
  | "description"
  | "address"
  | "contact";
export type BusinessWarning = "not_approved" | "no_owner" | "no_photo";
export type ExperienceMissing =
  | "price"
  | "capacity"
  | "schedule"
  | "location"
  | "photo"
  | "title_en"
  | "description_pt"
  | "description_en"
  | "business_contact";

export interface Readiness {
  businessId: string;
  missing: BusinessMissing[];
  warnings: BusinessWarning[];
  experiences: { id: string; titlePt: string; active: boolean; missing: ExperienceMissing[] }[];
}

export async function fetchReadiness(businessId: string): Promise<Readiness> {
  const { data, error } = await supabase.rpc("content_readiness", { _business_id: businessId });
  if (error) throw new Error(error.message);
  const d = data as {
    business_id: string;
    missing: BusinessMissing[];
    warnings: BusinessWarning[];
    experiences: { id: string; title_pt: string; active: boolean; missing: ExperienceMissing[] }[];
  };
  return {
    businessId: d.business_id,
    missing: d.missing ?? [],
    warnings: d.warnings ?? [],
    experiences: (d.experiences ?? []).map((e) => ({
      id: e.id,
      titlePt: e.title_pt,
      active: e.active,
      missing: e.missing ?? [],
    })),
  };
}

/** Codes from an EXPERIENCE_NOT_READY:price,photo error (empty when it is another error). */
export function notReadyCodes(message: string): ExperienceMissing[] {
  const m = message.match(/EXPERIENCE_NOT_READY:([a-z_,]+)/);
  return m ? (m[1].split(",") as ExperienceMissing[]) : [];
}

// ---------------------------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------------------------

/** RFC 4180-ish parser: quotes, escaped quotes, CRLF, BOM; delimiter "," or ";" (auto). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Template columns (docs/content/modelo-importacao.xlsx) → import fields. */
export const IMPORT_COLUMNS = {
  tipo: "kind",
  nome_negocio: "name",
  provincia: "province",
  categoria: "category",
  tipo_negocio: "type",
  descricao_negocio: "description",
  morada: "address",
  telefone: "phone",
  email: "email",
  whatsapp: "whatsapp",
  website: "website",
  titulo_pt: "title_pt",
  titulo_en: "title_en",
  descricao_pt: "description_pt",
  descricao_en: "description_en",
  categoria_atividade: "activity_category",
  preco_mzn: "price_mzn",
  capacidade: "capacity",
  duracao_horas: "duration_hours",
  destino: "destination",
  local: "location",
  dias: "days",
  hora_inicio: "start_time",
  hora_fim: "end_time",
  lugares_por_horario: "slot_capacity",
} as const;

export type ImportRow = Record<string, string>;

const normaliseHeader = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/**
 * Turns CSV rows into import rows for admin_import_content. Unknown columns are ignored;
 * "tipo" negocio/experiencia becomes kind business/experience.
 */
export function csvToImportRows(rows: string[][]): { rows: ImportRow[]; unknownColumns: string[] } {
  if (rows.length < 2) return { rows: [], unknownColumns: [] };
  const headers = rows[0].map(normaliseHeader);
  const map = IMPORT_COLUMNS as Record<string, string>;
  const unknownColumns = headers.filter((h) => h && !(h in map));
  const out = rows.slice(1).map((cells) => {
    const r: ImportRow = {};
    headers.forEach((h, i) => {
      const key = map[h];
      const v = (cells[i] ?? "").trim();
      if (key && v !== "") r[key] = v;
    });
    const kind = normaliseHeader(r.kind ?? "");
    r.kind =
      kind.startsWith("neg") || kind === "business"
        ? "business"
        : kind.startsWith("exp")
          ? "experience"
          : kind;
    if (r.kind === "experience") {
      if (r.name) r.business_name = r.name;
      if (r.province) r.business_province = r.province;
      if (r.activity_category) r.category = r.activity_category;
      delete r.name;
    }
    delete r.activity_category;
    if (r.province) r.province = normaliseHeader(r.province).replace(/_/g, "-");
    if (r.business_province)
      r.business_province = normaliseHeader(r.business_province).replace(/_/g, "-");
    if (r.price_mzn) r.price_mzn = r.price_mzn.replace(/\s/g, "").replace(",", ".");
    return r;
  });
  return { rows: out, unknownColumns };
}

export interface ImportResult {
  row: number;
  kind: string;
  status: "ok" | "error" | "duplicate" | "created";
  errors: string[];
  duplicate: boolean;
  id: string | null;
}

/** dryRun = validation and duplicates only (nothing is written). */
export async function importContent(rows: ImportRow[], dryRun: boolean): Promise<ImportResult[]> {
  const { data, error } = await supabase.rpc("admin_import_content", {
    _rows: rows,
    _dry_run: dryRun,
  });
  if (error) throw new Error(error.message);
  return data as unknown as ImportResult[];
}

// ---------------------------------------------------------------------------------------------
// Owner invites
// ---------------------------------------------------------------------------------------------

export async function createInvite(businessId: string, days = 14): Promise<string> {
  const { data, error } = await supabase.rpc("admin_create_business_invite", {
    _business_id: businessId,
    _days: days,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/convite/${token}`;
}

export async function previewInvite(
  token: string,
): Promise<{ businessName: string; expiresAt: string }> {
  const { data, error } = await supabase.rpc("business_invite_preview", { _token: token });
  if (error) throw new Error(error.message);
  const d = data as { business_name: string; expires_at: string };
  return { businessName: d.business_name, expiresAt: d.expires_at };
}

export async function claimInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_business_invite", { _token: token });
  if (error) throw new Error(error.message);
  return data as string;
}

// ---------------------------------------------------------------------------------------------
// Photos (public bucket content-photos, folder = business id)
// ---------------------------------------------------------------------------------------------

export const CONTENT_BUCKET = "content-photos";
export const CONTENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CONTENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function photoProblem(file: { type: string; size: number }): "type" | "size" | null {
  if (!CONTENT_PHOTO_TYPES.includes(file.type)) return "type";
  if (file.size > CONTENT_PHOTO_MAX_BYTES) return "size";
  return null;
}

/** Uploads a photo and returns its public URL. */
export async function uploadContentPhoto(businessId: string, file: File): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(CONTENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Storage path of a public content photo URL, or null for any other URL. */
export function contentPhotoPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${CONTENT_BUCKET}/`;
  const at = url.indexOf(marker);
  return at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null;
}

export async function removeContentPhoto(url: string): Promise<void> {
  const path = contentPhotoPath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(CONTENT_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
