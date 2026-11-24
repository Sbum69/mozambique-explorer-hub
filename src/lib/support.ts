import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/app-info";

export interface SupportContacts {
  email: string;
  mailto: string;
  /** Only when LEGAL_ENTITY.phone is published; never invented. */
  phone: { label: string; tel: string } | null;
}

/**
 * Support contacts shown in the menu (SupportSection): the support email and, only if the legal
 * entity publishes one, the phone. No WhatsApp or opening hours: they are not defined anywhere.
 */
export function supportContacts(
  email: string = SUPPORT_EMAIL,
  phone: string | null = LEGAL_ENTITY.phone,
): SupportContacts {
  const p = phone?.trim();
  return {
    email,
    mailto: `mailto:${email}`,
    phone: p ? { label: p, tel: `tel:${p.replace(/[^\d+]/g, "")}` } : null,
  };
}
