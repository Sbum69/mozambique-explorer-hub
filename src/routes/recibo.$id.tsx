import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/lib/app-info";
import { requireAuthenticatedUser } from "@/lib/auth";
import { formatCents } from "@/lib/commission";
import { LEGAL_TXT, SPONSORED_TXT } from "@/lib/page-texts";
import { formatDay, hasReceipt, placementFromRow } from "@/lib/sponsored";

export const Route = createFileRoute("/recibo/$id")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({
    meta: [{ title: "Recibo — EKAYA" }, { name: "robots", content: "noindex" }],
  }),
  component: ReceiptPage,
});

/** Printable proof of a highlight payment (owner or admin, by RLS). Not a tax document. */
function ReceiptPage() {
  const { id } = useParams({ from: "/recibo/$id" });
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const router = useRouter();
  const q = useQuery({
    queryKey: ["placement-receipt", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsored_placements")
        .select("*, businesses(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        p: placementFromRow(data),
        businessName: (data.businesses as { name: string } | null)?.name ?? "",
      };
    },
  });

  const back = (
    <Button variant="ghost" className="print:hidden" onClick={() => router.history.back()}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t.back}
    </Button>
  );
  if (q.isLoading)
    return (
      <main className="mx-auto max-w-2xl px-4 py-8" aria-busy="true">
        {t.loading}
      </main>
    );
  if (q.isError)
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-3" role="alert">
        {back}
        <p>{t.errLoad}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          {t.retry}
        </Button>
      </main>
    );
  const d = q.data;
  if (!d || !hasReceipt(d.p))
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-3">
        {back}
        <p role="status">{t.receiptMissing}</p>
        <Button asChild variant="outline">
          <Link to="/business-dashboard" search={{ status: "all" }}>
            {t.close}
          </Link>
        </Button>
      </main>
    );

  const { p } = d;
  const service =
    p.kind === "campaign"
      ? `${t.kindCampaign} (${t[`campaign_${p.campaignType ?? "experience"}`]}): ${(lang === "pt" ? p.titlePt : p.titleEn) ?? ""}`
      : t.kindHighlight;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <div className="flex flex-wrap justify-between gap-2 print:hidden">
        {back}
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          {t.print}
        </Button>
      </div>
      <Card className="p-6 space-y-5 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{t.receiptTitle}</h1>
          <p className="rounded-md border-2 border-foreground px-3 py-1 text-sm font-bold uppercase">
            {t.notFiscal}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t.reference}</dt>
          <dd className="font-mono">{p.reference}</dd>
          <dt className="text-muted-foreground">{t.business}</dt>
          <dd>{d.businessName}</dd>
          <dt className="text-muted-foreground">{t.item}</dt>
          <dd>
            {service} · {t[`scope_${p.scope}`]}
          </dd>
          <dt className="text-muted-foreground">{t.duration}</dt>
          <dd>{t.period(formatDay(p.startsOn, lang), formatDay(p.endsOn, lang))}</dd>
          <dt className="text-muted-foreground">{t.amount}</dt>
          <dd className="font-semibold">
            {p.free ? t.priceFree : formatCents(p.priceCents, lang)}
          </dd>
          <dt className="text-muted-foreground">{t.paidOn}</dt>
          <dd>{p.paidAt ? formatDay(p.paidAt, lang) : ""}</dd>
          <dt className="text-muted-foreground">{t.issuedBy}</dt>
          <dd>
            {LEGAL_ENTITY.name}
            {LEGAL_ENTITY.responsible ? ` · ${LEGAL_ENTITY.responsible}` : ""}
            {LEGAL_ENTITY.nuit ? ` · NUIT ${LEGAL_ENTITY.nuit}` : ""} · {SUPPORT_EMAIL}
          </dd>
        </dl>
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {t.notFiscalNote}
        </p>
        <p className="text-xs print:hidden">
          <Link to="/precos-e-reembolsos" className="text-primary underline underline-offset-4">
            {LEGAL_TXT[lang].pricing}
          </Link>
        </p>
      </Card>
    </main>
  );
}
