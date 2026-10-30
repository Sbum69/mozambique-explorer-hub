import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/app-info";
import type { Lang } from "@/contexts/LanguageContext";

/** A paragraph, or a bullet list when it is an array. */
export type LegalBlock = string | string[];

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  sections: LegalSection[];
}

/** Identification lines shared by both documents (no invented data: missing values say so). */
export function entityLines(lang: Lang): string[] {
  const pt = lang === "pt";
  const status = LEGAL_ENTITY.incorporated
    ? ""
    : pt
      ? " (em constituição)"
      : " (being incorporated)";
  const name = `${LEGAL_ENTITY.name}${status}`;
  const lines = [pt ? `Entidade: ${name}` : `Entity: ${name}`];
  if (LEGAL_ENTITY.responsible)
    lines.push(
      pt
        ? `Responsável: ${LEGAL_ENTITY.responsible}`
        : `Responsible person: ${LEGAL_ENTITY.responsible}`,
    );
  lines.push(`NUIT: ${LEGAL_ENTITY.nuit ?? (pt ? "em processo" : "being registered")}`);
  lines.push(pt ? `Email de contacto: ${SUPPORT_EMAIL}` : `Contact email: ${SUPPORT_EMAIL}`);
  if (LEGAL_ENTITY.phone)
    lines.push(pt ? `Telefone: ${LEGAL_ENTITY.phone}` : `Phone: ${LEGAL_ENTITY.phone}`);
  return lines;
}
