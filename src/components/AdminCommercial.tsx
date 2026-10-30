import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import {
  fetchCommercialAudit,
  fetchCommercialConfigs,
  formatBp,
  isFounderActive,
  saveCommercialConfig,
  setFounder,
  type CommercialConfig,
} from "@/lib/commission";
import { COMMISSION_TXT } from "@/lib/page-texts";

type Txt = (typeof COMMISSION_TXT)["pt"] | (typeof COMMISSION_TXT)["en"];

/** Admin → Commission and prices: versioned settings, Founding Partners and the change log. */
export function AdminCommercial() {
  const { lang } = useLang();
  const t = COMMISSION_TXT[lang];
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-commercial"],
    queryFn: async () => {
      const [configs, audit, biz, terms] = await Promise.all([
        fetchCommercialConfigs(),
        fetchCommercialAudit(),
        supabase.from("businesses").select("id, name, status").order("name"),
        supabase
          .from("business_commercial_terms")
          .select("business_id, founder_since, founder_until, free_highlights_used"),
      ]);
      if (biz.error) throw new Error(biz.error.message);
      if (terms.error) throw new Error(terms.error.message);
      return { configs, audit, businesses: biz.data ?? [], terms: terms.data ?? [] };
    },
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-commercial"] });
    void queryClient.invalidateQueries({ queryKey: ["commission-card"] });
  };

  if (q.isLoading) return <p aria-busy="true">{t.loading}</p>;
  if (q.isError || !q.data || !q.data.configs[0])
    return (
      <div role="alert" className="space-y-2">
        <p>{t.errLoad}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t.retry}
        </Button>
      </div>
    );

  const { configs, audit, businesses, terms } = q.data;
  const current = configs[0];
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.adminIntro}</p>
      <ConfigForm key={current.version} t={t} current={current} onSaved={refresh} />

      <Card className="p-4 sm:p-5 space-y-3">
        <h3 className="font-semibold">{t.history}</h3>
        <ul className="text-sm space-y-1">
          {configs.map((c) => (
            <li key={c.version}>
              v{c.version} · {date(c.createdAt)} · {formatBp(c.commissionBp, lang)} · {c.note ?? ""}
            </li>
          ))}
        </ul>
      </Card>

      <Founders
        t={t}
        cap={current.founderCap}
        businesses={businesses}
        terms={terms}
        date={date}
        onChanged={refresh}
      />

      <Card className="p-4 sm:p-5 space-y-3">
        <h3 className="font-semibold">{t.audit}</h3>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.auditEmpty}</p>
        ) : (
          <ul className="text-sm space-y-1">
            {audit.map((a) => (
              <li key={a.id}>
                {date(a.createdAt)} · {t.actions[a.action] ?? a.action}
                {a.reason ? ` · ${a.reason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

const pct = (bp: number) => String(bp / 100);
const mzn = (cents: number) => String(cents / 100);

function ConfigForm({
  t,
  current,
  onSaved,
}: {
  t: Txt;
  current: CommercialConfig;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
    commission: pct(current.commissionBp),
    founderCommission: pct(current.founderCommissionBp),
    founderMonths: String(current.founderMonths),
    founderCap: String(current.founderCap),
    freeHighlights: String(current.founderFreeHighlights),
    providerFee: pct(current.providerFeeBp),
    week: mzn(current.highlightWeekCents),
    month: mzn(current.highlightMonthCents),
    plan: mzn(current.planMonthCents),
    reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const num = (s: string) => Number(s.replace(",", "."));

  const save = async () => {
    const values = {
      commissionBp: Math.round(num(v.commission) * 100),
      founderCommissionBp: Math.round(num(v.founderCommission) * 100),
      founderMonths: num(v.founderMonths),
      founderCap: num(v.founderCap),
      founderFreeHighlights: num(v.freeHighlights),
      providerFeeBp: Math.round(num(v.providerFee) * 100),
      highlightWeekCents: Math.round(num(v.week) * 100),
      highlightMonthCents: Math.round(num(v.month) * 100),
      planMonthCents: Math.round(num(v.plan) * 100),
    };
    const ok =
      Object.values(values).every((x) => Number.isFinite(x) && x >= 0) &&
      values.commissionBp <= 5000 &&
      values.founderCommissionBp <= 5000 &&
      values.providerFeeBp <= 2000 &&
      Number.isInteger(values.founderMonths) &&
      Number.isInteger(values.founderCap) &&
      Number.isInteger(values.founderFreeHighlights);
    if (!ok) {
      setError(t.errInvalid);
      return;
    }
    if (!v.reason.trim()) {
      setError(t.errReason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const version = await saveCommercialConfig({ ...values, reason: v.reason.trim() });
      toast.success(t.saved(version));
      onSaved();
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof v, label: string, mode: "decimal" | "numeric" = "decimal") => (
    <div className="space-y-1">
      <Label htmlFor={`cc-${key}`}>{label}</Label>
      <Input
        id={`cc-${key}`}
        inputMode={mode}
        value={v[key]}
        onChange={(e) => setV({ ...v, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <h3 className="font-semibold">{t.current(current.version)}</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {field("commission", t.fieldCommission)}
        {field("founderCommission", t.fieldFounderCommission)}
        {field("founderMonths", t.fieldFounderMonths, "numeric")}
        {field("founderCap", t.fieldFounderCap, "numeric")}
        {field("freeHighlights", t.fieldFreeHighlights, "numeric")}
        {field("providerFee", t.fieldProviderFee)}
        {field("week", t.fieldWeek)}
        {field("month", t.fieldMonth)}
        {field("plan", t.fieldPlan)}
      </div>
      {field("reason", t.fieldReason)}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button onClick={() => void save()} disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {t.save}
      </Button>
    </Card>
  );
}

function Founders({
  t,
  cap,
  businesses,
  terms,
  date,
  onChanged,
}: {
  t: Txt;
  cap: number;
  businesses: { id: string; name: string; status: string }[];
  terms: {
    business_id: string;
    founder_since: string | null;
    founder_until: string | null;
    free_highlights_used: number;
  }[];
  date: (iso: string) => string;
  onChanged: () => void;
}) {
  const [askConfirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const used = terms.filter((x) => x.founder_since).length;

  const toggle = async (id: string, name: string, on: boolean) => {
    const answer = await askConfirm({
      title: `${on ? t.makeFounder : t.endFounder}: ${name}`,
      confirmLabel: on ? t.makeFounder : t.endFounder,
      destructive: !on,
      reason: "required",
      reasonLabel: t.founderReason,
    });
    if (!answer) return;
    setBusy(id);
    try {
      await setFounder(id, on, answer.reason);
      onChanged();
    } catch (e) {
      toast.error(
        /FOUNDER_CAP_REACHED/.test(e instanceof Error ? e.message : "")
          ? t.founderCap
          : t.errGeneric,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-3">
      {confirmDialog}
      <h3 className="font-semibold">{t.foundersTitle}</h3>
      <p className="text-sm text-muted-foreground">{t.foundersCount(used, cap)}</p>
      <ul className="divide-y divide-border">
        {businesses.map((b) => {
          const term = terms.find((x) => x.business_id === b.id) ?? null;
          const active = isFounderActive(
            term
              ? {
                  founderSince: term.founder_since,
                  founderUntil: term.founder_until,
                  freeHighlightsUsed: term.free_highlights_used,
                }
              : null,
          );
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="flex-1 min-w-0 break-words font-medium">{b.name}</span>
              <span className="text-muted-foreground">
                {active && term?.founder_until
                  ? t.founderActive(date(term.founder_until))
                  : term?.founder_since
                    ? t.founderEnded
                    : ""}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === b.id || (!active && used >= cap)}
                onClick={() => void toggle(b.id, b.name, !active)}
              >
                {active ? t.endFounder : t.makeFounder}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
