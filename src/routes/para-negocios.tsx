import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2, Megaphone, Store } from "lucide-react";

import { CommissionCard } from "@/components/CommissionCard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { useBusinessCategories, useProvinces } from "@/hooks/useProvinces";
import { SUPPORT_EMAIL } from "@/lib/app-info";
import { fetchCurrentConfig, formatBp, formatCents } from "@/lib/commission";
import { fetchFounderPlacesLeft, leadProblems, submitLead, type LeadProblem } from "@/lib/leads";
import { FOR_BUSINESS_TXT, LEGAL_TXT } from "@/lib/page-texts";

const PT = FOR_BUSINESS_TXT.pt;
const EN = FOR_BUSINESS_TXT.en;

export const Route = createFileRoute("/para-negocios")({
  head: () => ({
    meta: [
      { title: PT.metaTitle },
      { name: "description", content: PT.metaDescription },
      { property: "og:title", content: PT.metaTitle },
      { property: "og:description", content: PT.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:locale:alternate", content: "en_GB" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForBusinessPage,
});

function ForBusinessPage() {
  const { lang } = useLang();
  const t = FOR_BUSINESS_TXT[lang];
  // The head is in Portuguese (default language); the tab title follows the chosen language.
  useEffect(() => {
    document.title = (lang === "pt" ? PT : EN).metaTitle;
  }, [lang]);
  const cfg = useQuery({
    queryKey: ["commercial-config"],
    queryFn: fetchCurrentConfig,
    staleTime: 5 * 60_000,
  });
  const places = useQuery({
    queryKey: ["founder-places"],
    queryFn: fetchFounderPlacesLeft,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={lang === "pt" ? "Início" : "Home"}
            >
              <Link to="/home">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <span className="font-bold ml-1 truncate">{t.nav}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        <section className="space-y-4 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t.heroTitle}</h1>
          <p className="text-lg text-muted-foreground">{t.heroBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="#pedido">{t.ctaInterest}</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/business-register">{t.ctaRegister}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/precos-e-reembolsos">{LEGAL_TXT[lang].pricing}</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2" aria-label={t.freeTitle}>
          <Card className="p-5 space-y-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Store className="size-5 text-primary" aria-hidden="true" />
              {t.freeTitle}
            </h2>
            <p className="text-sm">{t.freeBody}</p>
          </Card>
          <Card className="p-5 space-y-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="size-5 text-primary" aria-hidden="true" />
              {t.highlightsTitle}
            </h2>
            {cfg.data ? (
              <p className="text-sm">
                {t.highlightsBody(
                  formatCents(cfg.data.highlightWeekCents, lang),
                  formatCents(cfg.data.highlightMonthCents, lang),
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground" aria-busy={cfg.isLoading}>
                …
              </p>
            )}
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">{t.commissionTitle}</h2>
          <p className="text-muted-foreground">{t.commissionBody}</p>
          <div className="max-w-xl">
            <CommissionCard />
          </div>
        </section>

        {cfg.data && cfg.data.founderCap > 0 && (
          <section className="space-y-2 max-w-3xl">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <BadgeCheck className="size-6 text-primary" aria-hidden="true" />
              {t.founderTitle}
            </h2>
            <p>
              {t.founderBody(
                cfg.data.founderCap,
                cfg.data.founderMonths,
                formatBp(cfg.data.founderCommissionBp, lang),
                cfg.data.founderFreeHighlights,
              )}
            </p>
            <p className="font-semibold" role="status">
              {places.isError
                ? t.founderUnknown
                : places.data != null
                  ? t.founderLeft(places.data)
                  : "…"}
            </p>
          </section>
        )}

        <section className="space-y-3 max-w-3xl" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-2xl font-bold">
            {t.faqTitle}
          </h2>
          <div className="divide-y divide-border rounded-[10px] border border-border">
            {t.faq.map((f) => (
              <details key={f.q} className="group p-4">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <LeadForm />

        <p className="text-sm text-muted-foreground">{t.contactUs(SUPPORT_EMAIL)}</p>
      </main>
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}

function LeadForm() {
  const { lang } = useLang();
  const t = FOR_BUSINESS_TXT[lang];
  const { provinces } = useProvinces();
  const { categories } = useBusinessCategories();
  const [v, setV] = useState({
    businessName: "",
    provinceId: "",
    categoryCode: "",
    contactName: "",
    contact: "",
    acceptsBookings: true,
    message: "",
    website: "",
  });
  const [problems, setProblems] = useState<LeadProblem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
    setV((o) => ({ ...o, [k]: e.target.value }));

  const send = async () => {
    const p = leadProblems(v);
    setProblems(p);
    setError(null);
    if (p.length) {
      document.getElementById(`lead-${p[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await submitLead({ ...v, lang });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error && /RATE_LIMITED/.test(e.message) ? t.errRate : t.errSend);
    } finally {
      setBusy(false);
    }
  };

  const err = (k: LeadProblem) =>
    problems.includes(k) ? (
      <p id={`lead-${k}-err`} className="text-destructive text-sm">
        {t[`err_${k}`]}
      </p>
    ) : null;
  const aria = (k: LeadProblem) => ({
    "aria-invalid": problems.includes(k),
    "aria-describedby": problems.includes(k) ? `lead-${k}-err` : undefined,
  });
  const select = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <section id="pedido" className="scroll-mt-20 max-w-2xl space-y-3" aria-labelledby="pedido-h">
      <h2 id="pedido-h" className="text-2xl font-bold">
        {t.formTitle}
      </h2>
      {sent ? (
        <Card role="status" className="p-5 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-primary shrink-0" aria-hidden="true" />
          <p>{t.sent}</p>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground mb-4">{t.formIntro}</p>
          <form
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="lead-businessName">{t.businessName}</Label>
              <Input
                id="lead-businessName"
                maxLength={120}
                autoComplete="organization"
                value={v.businessName}
                onChange={set("businessName")}
                {...aria("businessName")}
              />
              {err("businessName")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-province">{t.province}</Label>
              <select
                id="lead-province"
                className={select}
                value={v.provinceId}
                onChange={set("provinceId")}
                {...aria("province")}
              >
                <option value="">{t.choose}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name[lang]}
                  </option>
                ))}
              </select>
              {err("province")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-category">{t.category}</Label>
              <select
                id="lead-category"
                className={select}
                value={v.categoryCode}
                onChange={set("categoryCode")}
                {...aria("category")}
              >
                <option value="">{t.choose}</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name[lang]}
                  </option>
                ))}
              </select>
              {err("category")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-contactName">{t.contactName}</Label>
              <Input
                id="lead-contactName"
                maxLength={120}
                autoComplete="name"
                value={v.contactName}
                onChange={set("contactName")}
                {...aria("contactName")}
              />
              {err("contactName")}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lead-contact">{t.contact}</Label>
              <Input
                id="lead-contact"
                maxLength={160}
                value={v.contact}
                onChange={set("contact")}
                {...aria("contact")}
                aria-describedby={
                  problems.includes("contact") ? "lead-contact-err" : "lead-contact-hint"
                }
              />
              <p id="lead-contact-hint" className="text-xs text-muted-foreground">
                {t.contactHint}
              </p>
              {err("contact")}
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">{t.acceptsBookings}</legend>
              <div className="flex gap-4">
                {[true, false].map((b) => (
                  <label key={String(b)} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="lead-bookings"
                      checked={v.acceptsBookings === b}
                      onChange={() => setV((o) => ({ ...o, acceptsBookings: b }))}
                    />
                    {b ? t.yes : t.no}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="lead-message">{t.message}</Label>
              <Textarea
                id="lead-message"
                maxLength={1000}
                value={v.message}
                onChange={set("message")}
              />
            </div>
            {/* Honeypot: off-screen and out of the tab order; people never fill it. */}
            <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
              <label htmlFor="lead-website">{t.website}</label>
              <input
                id="lead-website"
                tabIndex={-1}
                autoComplete="off"
                value={v.website}
                onChange={set("website")}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              <Link to="/privacy" className="underline underline-offset-4">
                {t.privacyNote}
              </Link>
            </p>
            {error && (
              <p role="alert" className="text-destructive text-sm sm:col-span-2">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {busy ? t.sending : t.send}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}
