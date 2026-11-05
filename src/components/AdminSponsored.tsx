import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Receipt, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCurrentConfig, formatCents, type CommercialConfig } from "@/lib/commission";
import { SPONSORED_TXT } from "@/lib/page-texts";
import {
  decidePlacement,
  fetchAllPlacements,
  fetchPaymentConfig,
  formatDay,
  hasReceipt,
  needsAdmin,
  placementError,
  savePaymentConfig,
  saveSponsoredLimits,
  type AdminDecision,
  type AdminPlacement,
  type PaymentConfig,
} from "@/lib/sponsored";

type Txt = (typeof SPONSORED_TXT)["pt"] | (typeof SPONSORED_TXT)["en"];
const errText = (t: Txt, e: unknown) =>
  t[`err_${placementError(e instanceof Error ? e.message : "")}` as keyof Txt] as string;

/** Admin → Highlights: decide requests, confirm M-Pesa payments, payment instructions, limits. */
export function AdminSponsored() {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const queryClient = useQueryClient();
  const [askConfirm, confirmDialog] = useConfirm();
  const [todoOnly, setTodoOnly] = useState(true);
  const q = useQuery({
    queryKey: ["admin-sponsored"],
    queryFn: async () => {
      const [placements, payment, config] = await Promise.all([
        fetchAllPlacements(),
        fetchPaymentConfig(),
        fetchCurrentConfig(),
      ]);
      return { placements, payment, config };
    },
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-sponsored"] });
    void queryClient.invalidateQueries({ queryKey: ["sponsored"] });
  };

  const decide = async (p: AdminPlacement, decision: AdminDecision) => {
    const label =
      decision === "approve"
        ? t.approve
        : decision === "paid"
          ? t.markPaid
          : decision === "reject"
            ? t.reject
            : t.adminCancel;
    const answer = await askConfirm({
      title: `${label} — ${p.reference}`,
      description: `${p.businessName} · ${p.free ? t.priceFree : formatCents(p.priceCents, lang)}`,
      confirmLabel: t.confirm,
      destructive: decision === "reject" || decision === "cancel",
      reason: decision === "approve" ? "none" : "required",
      reasonLabel: decision === "paid" ? t.paymentNote : t.decisionReason,
    });
    if (!answer) return;
    try {
      await decidePlacement(
        p.id,
        decision,
        decision === "paid" ? { paymentNote: answer.reason } : { reason: answer.reason },
      );
      toast.success(t.done);
      refresh();
    } catch (e) {
      toast.error(errText(t, e));
    }
  };

  if (q.isLoading) return <p aria-busy="true">{t.loading}</p>;
  if (q.isError || !q.data)
    return (
      <div role="alert" className="space-y-2">
        <p>{t.errLoad}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t.retry}
        </Button>
      </div>
    );

  const list = q.data.placements.filter((p) => !todoOnly || needsAdmin(p.status));
  return (
    <div className="space-y-6">
      {confirmDialog}
      <p className="text-sm text-muted-foreground">{t.adminIntro}</p>
      <div className="flex gap-2" role="group" aria-label={t.adminTitle}>
        <Button
          size="sm"
          variant={todoOnly ? "default" : "outline"}
          aria-pressed={todoOnly}
          onClick={() => setTodoOnly(true)}
        >
          {t.filterTodo} ({q.data.placements.filter((p) => needsAdmin(p.status)).length})
        </Button>
        <Button
          size="sm"
          variant={todoOnly ? "outline" : "default"}
          aria-pressed={!todoOnly}
          onClick={() => setTodoOnly(false)}
        >
          {t.filterAll} ({q.data.placements.length})
        </Button>
      </div>
      {!list.length && <p className="text-sm text-muted-foreground">{t.empty}</p>}
      <ul className="space-y-3">
        {list.map((p) => (
          <li key={p.id} className="rounded-[10px] border border-border p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium break-words">
                {p.businessName} ·{" "}
                {p.kind === "campaign"
                  ? `${t[`campaign_${p.campaignType ?? "experience"}`]}: ${p.titlePt ?? ""}`
                  : t.kindHighlight}
              </p>
              <Badge variant={p.status === "active" ? "default" : "secondary"}>
                {t[`status_${p.status}`]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{p.reference}</span> · {t[`scope_${p.scope}`]}
              {p.categoryCode ? ` (${p.categoryCode})` : ""} ·{" "}
              {t.period(formatDay(p.startsOn, lang), formatDay(p.endsOn, lang))} ·{" "}
              {p.free ? t.priceFree : formatCents(p.priceCents, lang)}
            </p>
            {p.decisionReason && <p className="text-sm">{t.reason(p.decisionReason)}</p>}
            {p.paymentNote && (
              <p className="text-sm">
                {t.paymentNote}: {p.paymentNote}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {p.status === "requested" && (
                <>
                  <Button size="sm" onClick={() => void decide(p, "approve")}>
                    {t.approve}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(p, "reject")}>
                    {t.reject}
                  </Button>
                </>
              )}
              {p.status === "awaiting_payment" && (
                <Button size="sm" onClick={() => void decide(p, "paid")}>
                  {t.markPaid}
                </Button>
              )}
              {["awaiting_payment", "paid", "active"].includes(p.status) && (
                <Button size="sm" variant="outline" onClick={() => void decide(p, "cancel")}>
                  {t.adminCancel}
                </Button>
              )}
              {hasReceipt(p) && (
                <Button asChild size="sm" variant="ghost">
                  <Link to="/recibo/$id" params={{ id: p.id }}>
                    <Receipt className="size-4" aria-hidden="true" />
                    {t.receipt}
                  </Link>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <PaymentForm current={q.data.payment} onSaved={refresh} />
      <LimitsForm current={q.data.config} onSaved={refresh} />
    </div>
  );
}

function PaymentForm({ current, onSaved }: { current: PaymentConfig | null; onSaved: () => void }) {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const [v, setV] = useState({
    mpesaNumber: current?.mpesaNumber ?? "",
    accountName: current?.accountName ?? "",
    instructionsPt: current?.instructionsPt ?? "",
    instructionsEn: current?.instructionsEn ?? "",
    reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
    setV((o) => ({ ...o, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const version = await savePaymentConfig({ ...v, reason: v.reason.trim() });
      toast.success(t.saved(version));
      setV((o) => ({ ...o, reason: "" }));
      onSaved();
    } catch (e) {
      setError(errText(t, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">{t.paymentTitle}</h3>
      <p className="text-sm text-muted-foreground">
        {current ? t.paymentCurrent(current.version) : t.paymentNone}
      </p>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="mp-number">{t.mpesaNumber}</Label>
          <Input
            id="mp-number"
            inputMode="tel"
            value={v.mpesaNumber}
            onChange={set("mpesaNumber")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mp-name">{t.accountName}</Label>
          <Input id="mp-name" value={v.accountName} onChange={set("accountName")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mp-pt">{t.instructionsPt}</Label>
          <Textarea
            id="mp-pt"
            maxLength={1000}
            value={v.instructionsPt}
            onChange={set("instructionsPt")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mp-en">{t.instructionsEn}</Label>
          <Textarea
            id="mp-en"
            maxLength={1000}
            value={v.instructionsEn}
            onChange={set("instructionsEn")}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="mp-reason">{t.changeReason}</Label>
          <Input id="mp-reason" value={v.reason} onChange={set("reason")} />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || !v.reason.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LimitsForm({ current, onSaved }: { current: CommercialConfig; onSaved: () => void }) {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const [slots, setSlots] = useState(String(current.sponsoredSlotsPerScope));
  const [perPage, setPerPage] = useState(String(current.sponsoredPerPage));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const version = await saveSponsoredLimits(Number(slots), Number(perPage), reason.trim());
      toast.success(t.saved(version));
      setReason("");
      onSaved();
    } catch (e) {
      setError(errText(t, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">{t.limitsTitle}</h3>
      <p className="text-sm text-muted-foreground">
        {t.limitsCurrent(current.sponsoredSlotsPerScope, current.sponsoredPerPage)}
      </p>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="sl-slots">{t.slotsPerScope}</Label>
          <Input
            id="sl-slots"
            type="number"
            min={0}
            max={50}
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sl-page">{t.perPage}</Label>
          <Input
            id="sl-page"
            type="number"
            min={0}
            max={10}
            value={perPage}
            onChange={(e) => setPerPage(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="sl-reason">{t.changeReason}</Label>
          <Input id="sl-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || !reason.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}
