import { Link } from "@tanstack/react-router";

import { useLang } from "@/contexts/LanguageContext";
import { APP_VERSION, LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/app-info";
import { FOR_BUSINESS_TXT, LEGAL_TXT } from "@/lib/page-texts";
import { cn } from "@/lib/utils";

/** Footer: For businesses, prices, Terms, Privacy, Credits, version and who provides the service. */
export function LegalFooterLinks({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const { lang } = useLang();
  const t = LEGAL_TXT[lang];
  const link = "underline-offset-4 hover:underline hover:text-foreground";
  return (
    <nav aria-label={t.footerLabel} className={cn("text-xs text-muted-foreground", className)}>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <li>
          <Link to="/para-negocios" className={link} onClick={onNavigate}>
            {FOR_BUSINESS_TXT[lang].nav}
          </Link>
        </li>
        <li>
          <Link to="/precos-e-reembolsos" className={link} onClick={onNavigate}>
            {t.pricing}
          </Link>
        </li>
        <li>
          <Link to="/terms" className={link} onClick={onNavigate}>
            {t.terms}
          </Link>
        </li>
        <li>
          <Link to="/privacy" className={link} onClick={onNavigate}>
            {t.privacy}
          </Link>
        </li>
        <li>
          <Link to="/creditos" className={link} onClick={onNavigate}>
            {t.credits}
          </Link>
        </li>
        <li>v{APP_VERSION}</li>
      </ul>
      {/* Who provides the service (from app-info.ts). */}
      <p className="mt-1">
        {LEGAL_ENTITY.name}
        {LEGAL_ENTITY.incorporated ? "" : ` (${t.incorporating})`} · {LEGAL_ENTITY.country[lang]} ·{" "}
        {LEGAL_ENTITY.nuit ? `NUIT ${LEGAL_ENTITY.nuit}` : t.nuitPending}
        {LEGAL_ENTITY.responsible ? ` · ${LEGAL_ENTITY.responsible}` : ""} ·{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={link}>
          {SUPPORT_EMAIL}
        </a>
      </p>
    </nav>
  );
}
