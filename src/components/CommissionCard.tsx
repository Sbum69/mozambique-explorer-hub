import { useQuery } from "@tanstack/react-query";
import { Percent } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import {
  commissionSplit,
  fetchCurrentConfig,
  fetchFounderTerms,
  formatBp,
  formatCents,
  isFounderActive,
  toCents,
} from "@/lib/commission";
import { COMMISSION_TXT } from "@/lib/page-texts";

/**
 * What a business pays, always shown in full: commission + provider fee = total deducted, with an
 * example. Rates and prices come from the commercial settings (never from the code).
 */
export function CommissionCard({
  businessId,
  examplePriceMzn = 1000,
}: {
  businessId?: string;
  examplePriceMzn?: number;
}) {
  const { lang } = useLang();
  const t = COMMISSION_TXT[lang];
  const q = useQuery({
    queryKey: ["commission-card", businessId ?? null],
    queryFn: async () => ({
      config: await fetchCurrentConfig(),
      terms: businessId ? await fetchFounderTerms(businessId) : null,
    }),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading)
    return (
      <Card className="p-5" aria-busy="true">
        {t.loading}
      </Card>
    );
  if (q.isError || !q.data)
    return (
      <Card className="p-5 space-y-2" role="alert">
        <p>{t.errLoad}</p>
        <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
          {t.retry}
        </Button>
      </Card>
    );

  const { config: c, terms } = q.data;
  const founder = isFounderActive(terms);
  const bp = founder ? c.founderCommissionBp : c.commissionBp;
  const gross = toCents(examplePriceMzn);
  const s = commissionSplit(gross, bp, c.providerFeeBp);
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <Card className="p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Percent className="size-5 text-primary" aria-hidden="true" />
        {t.cardTitle}
      </h2>
      <p className="text-sm text-muted-foreground">{t.cardIntro}</p>
      {founder && terms?.founderUntil && (
        <p className="rounded-md border border-primary/60 p-3 text-sm font-medium">
          {t.founderOn(dateFmt(terms.founderUntil))}
        </p>
      )}
      <div>
        <p className="text-sm font-medium mb-2">{t.example(formatCents(gross, lang))}</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt>{t.commission(formatBp(bp, lang))}</dt>
          <dd className="text-right tabular-nums">− {formatCents(s.commissionCents, lang)}</dd>
          <dt>
            {c.providerFeeBp > 0 ? t.providerFee(formatBp(c.providerFeeBp, lang)) : t.providerNone}
          </dt>
          <dd className="text-right tabular-nums">− {formatCents(s.providerFeeCents, lang)}</dd>
          <dt className="font-semibold border-t border-border pt-1">{t.totalDeducted}</dt>
          <dd className="text-right font-semibold tabular-nums border-t border-border pt-1">
            {formatCents(s.commissionCents + s.providerFeeCents, lang)} (
            {formatBp(bp + c.providerFeeBp, lang)})
          </dd>
          <dt className="font-semibold">{t.youReceive}</dt>
          <dd className="text-right font-semibold tabular-nums">{formatCents(s.netCents, lang)}</dd>
        </dl>
      </div>
      <ul className="text-sm space-y-1 text-muted-foreground">
        {!founder && c.founderCap > 0 && (
          <li>
            {t.founderOffer(c.founderCap, c.founderMonths, formatBp(c.founderCommissionBp, lang))}
          </li>
        )}
        <li>
          {t.highlights(
            formatCents(c.highlightWeekCents, lang),
            formatCents(c.highlightMonthCents, lang),
          )}
        </li>
        <li>{t.plan(formatCents(c.planMonthCents, lang))}</li>
      </ul>
    </Card>
  );
}
