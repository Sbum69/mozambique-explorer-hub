import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileWarning, RefreshCw } from "lucide-react";

import { CommissionCard } from "@/components/CommissionCard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { SUPPORT_EMAIL } from "@/lib/app-info";
import { fetchCurrentConfig, formatBp, formatCents } from "@/lib/commission";
import { PRICING_TXT } from "@/lib/pricing-texts";
import { BackButton } from "@/components/BackButton";

// The head stays in the first-load bundle, so it uses literals instead of PRICING_TXT (which then
// only loads with the page). Same texts as PRICING_TXT.pt.metaTitle / metaDescription.
const META_TITLE = "Preços e reembolsos — EKAYA";
const META_DESCRIPTION =
  "Comissão, destaques, Parceiro Fundador, pagamento por M-Pesa, cancelamento e reembolso.";

export const Route = createFileRoute("/precos-e-reembolsos")({
  head: () => ({
    meta: [
      { title: META_TITLE },
      { name: "description", content: META_DESCRIPTION },
      { property: "og:title", content: META_TITLE },
      { property: "og:description", content: META_DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PricingPage,
});

/** Prices, payment, cancellation and refunds for businesses. Figures come from the commercial settings. */
function PricingPage() {
  const { lang } = useLang();
  const t = PRICING_TXT[lang];
  useEffect(() => {
    document.title = t.metaTitle;
  }, [t]);
  const q = useQuery({
    queryKey: ["commercial-config"],
    queryFn: fetchCurrentConfig,
    staleTime: 5 * 60_000,
  });
  const c = q.data;
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <BackButton fallback="/para-negocios" />
            <h1 className="min-w-0 truncate font-bold text-base sm:text-lg ml-1">{t.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <Card role="note" className="p-4 flex items-start gap-3 border-foreground/40">
          <FileWarning className="size-5 shrink-0 text-foreground mt-0.5" aria-hidden="true" />
          <p className="font-semibold">{t.draft}</p>
        </Card>
        <p className="text-muted-foreground">{t.intro}</p>

        {q.isLoading && <p aria-busy="true">{t.loading}</p>}
        {q.isError && (
          <div role="alert" className="space-y-2">
            <p>{t.errLoad}</p>
            <Button variant="outline" onClick={() => void q.refetch()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              {t.retry}
            </Button>
          </div>
        )}

        {c && (
          <>
            <p className="text-sm text-muted-foreground">
              {t.version(c.version, day(c.createdAt))}
            </p>
            <section className="space-y-3" aria-labelledby="pr-commission">
              <h2 id="pr-commission" className="text-xl font-bold">
                {t.commissionTitle}
              </h2>
              <p>{t.commissionBody}</p>
              <CommissionCard />
            </section>
            <section className="space-y-2" aria-labelledby="pr-highlights">
              <h2 id="pr-highlights" className="text-xl font-bold">
                {t.highlightsTitle}
              </h2>
              <p>
                {t.highlightsBody(
                  formatCents(c.highlightWeekCents, lang),
                  formatCents(c.highlightMonthCents, lang),
                )}
              </p>
            </section>
            {c.founderCap > 0 && (
              <section className="space-y-2" aria-labelledby="pr-founder">
                <h2 id="pr-founder" className="text-xl font-bold">
                  {t.founderTitle}
                </h2>
                <p>
                  {t.founderBody(
                    c.founderCap,
                    c.founderMonths,
                    formatBp(c.founderCommissionBp, lang),
                    c.founderFreeHighlights,
                  )}
                </p>
              </section>
            )}
            <section className="space-y-2" aria-labelledby="pr-plan">
              <h2 id="pr-plan" className="text-xl font-bold">
                {t.planTitle}
              </h2>
              <p>{t.planBody(formatCents(c.planMonthCents, lang))}</p>
            </section>
          </>
        )}

        <section className="space-y-2" aria-labelledby="pr-pay">
          <h2 id="pr-pay" className="text-xl font-bold">
            {t.payTitle}
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {t.payBody.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-2" aria-labelledby="pr-refund">
          <h2 id="pr-refund" className="text-xl font-bold">
            {t.refundTitle}
          </h2>
          <p>{t.refundBefore}</p>
          <p>{t.refundAfter}</p>
          <p>{t.refundAdmin}</p>
        </section>

        <section className="space-y-2" aria-labelledby="pr-deadline">
          <h2 id="pr-deadline" className="text-xl font-bold">
            {t.deadlineTitle}
          </h2>
          <p>{t.deadlineBody(SUPPORT_EMAIL)}</p>
          <p className="text-sm">
            {t.termsNote}{" "}
            <Link to="/terms" className="text-primary underline underline-offset-4">
              {t.readTerms}
            </Link>
          </p>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}
