import { Link } from "@tanstack/react-router";

import { useLang } from "@/contexts/LanguageContext";
import { APP_VERSION } from "@/lib/app-info";
import { FOR_BUSINESS_TXT, LEGAL_TXT } from "@/lib/page-texts";
import { cn } from "@/lib/utils";

/** Footer: For businesses, Terms, Privacy, Credits and the app version. */
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
    </nav>
  );
}
