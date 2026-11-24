import { Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, Phone } from "lucide-react";
import { useId } from "react";

import type { Lang } from "@/contexts/LanguageContext";
import { SUPPORT_TXT } from "@/lib/page-texts";
import { supportContacts } from "@/lib/support";

/** "Support" block of the main menu (desktop and phone): email, phone if published, Terms, Privacy. */
export function SupportSection({ lang, onNavigate }: { lang: Lang; onNavigate?: () => void }) {
  const t = SUPPORT_TXT[lang];
  const c = supportContacts();
  const headingId = useId();
  const link =
    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2"
      >
        {t.title}
      </h3>
      <p className="px-3 mb-2 text-xs text-muted-foreground">{t.when}</p>
      <ul className="space-y-0.5">
        <li>
          <a href={c.mailto} className={link} aria-label={t.emailLabel(c.email)}>
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 break-all">{c.email}</span>
          </a>
        </li>
        {c.phone && (
          <li>
            <a href={c.phone.tel} className={link} aria-label={t.phoneLabel(c.phone.label)}>
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{c.phone.label}</span>
            </a>
          </li>
        )}
      </ul>
      <nav aria-label={t.legalLabel} className="mt-1 px-3 flex items-center gap-2 text-xs">
        <LifeBuoy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Link
          to="/terms"
          onClick={onNavigate}
          className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {t.terms}
        </Link>
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <Link
          to="/privacy"
          onClick={onNavigate}
          className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {t.privacy}
        </Link>
      </nav>
    </section>
  );
}
