import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

import { useLang } from "@/contexts/LanguageContext";
import { SPONSORED_TXT } from "@/lib/page-texts";
import { fetchActiveSponsored, type PlacementScope, type SponsoredCard } from "@/lib/sponsored";

/**
 * Paid highlights for one place, always labelled "Patrocinado"/"Sponsored" and kept apart from the
 * organic list (which keeps its own order). The database applies the per-page limit. Shows nothing
 * when there is no active highlight or the request fails: the page works the same without it.
 */
export function SponsoredStrip({
  scope,
  provinceId,
  categoryCode,
  className = "",
}: {
  scope: PlacementScope;
  provinceId?: string;
  categoryCode?: string;
  className?: string;
}) {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const enabled =
    scope === "home" ||
    (scope === "province" && !!provinceId) ||
    (scope === "category" && !!categoryCode);
  const q = useQuery({
    queryKey: ["sponsored", scope, provinceId ?? null, categoryCode ?? null],
    queryFn: () => fetchActiveSponsored(scope, { provinceId, categoryCode }),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const cards = q.data ?? [];
  if (!enabled || !cards.length) return null;

  return (
    <section aria-labelledby={`sponsored-${scope}`} className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`sponsored-${scope}`} className="text-lg font-bold">
          {t.stripTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{t.stripNote}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.id}>
            <SponsoredItem card={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SponsoredItem({ card: c }: { card: SponsoredCard }) {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const title = (lang === "pt" ? c.titlePt : (c.titleEn ?? c.titlePt)) ?? c.businessName;
  const body = lang === "pt" ? c.bodyPt : (c.bodyEn ?? c.bodyPt);
  const inner = (
    <>
      <span className="inline-flex items-center gap-1 rounded-md border border-foreground/40 px-2 py-0.5 text-xs font-semibold">
        <Megaphone className="size-3.5" aria-hidden="true" />
        {t.label}
      </span>
      <span className="mt-2 block font-semibold break-words">{title}</span>
      {title !== c.businessName && (
        <span className="block text-sm text-muted-foreground">{c.businessName}</span>
      )}
      {body && <span className="mt-1 block text-sm">{body}</span>}
    </>
  );
  const cls =
    "block h-full rounded-[10px] border border-border bg-card p-4 text-card-foreground hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  return c.experienceId ? (
    <Link to="/experience/$id" params={{ id: c.experienceId }} className={cls}>
      {inner}
    </Link>
  ) : (
    <Link to="/business/$id" params={{ id: c.businessId }} className={cls}>
      {inner}
    </Link>
  );
}
