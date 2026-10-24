import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  adminErrorText,
  assignBusinessOwner,
  countOpenBookings,
  isValidEmail,
  isValidReason,
  setBusinessStatus,
} from "@/lib/admin";
import { useLang } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ConfirmDialog";

type Status = "pending" | "approved" | "rejected" | "suspended";
interface Row {
  id: string;
  name: string;
  status: Status;
  category: string | null;
  province: string | null;
  created_at: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  rejection_reason: string | null;
  decided_at: string | null;
}

const TXT = {
  pt: {
    title: "Aprovação de Negócios",
    desc: "Negócios registados na plataforma. Apenas pendentes podem ser decididos.",
    pending: "Pendentes",
    approved: "Aprovados",
    rejected: "Rejeitados",
    search: "Pesquisar nome, dono ou email…",
    allProv: "Todas as províncias",
    owner: "Proprietário",
    catalog: "Catálogo (sem proprietário)",
    category: "Categoria",
    province: "Província",
    registered: "Registo",
    decided: "Decisão",
    reason: "Motivo",
    approve: "Aprovar",
    reject: "Rejeitar",
    empty: "Sem negócios neste estado.",
    error: "Não foi possível carregar os negócios.",
    retry: "Tentar novamente",
    confirmReject: "Rejeitar negócio",
    reasonLabel: "Motivo da rejeição (visível para o proprietário)",
    cancel: "Cancelar",
    confirm: "Confirmar rejeição",
    okApprove: "Negócio aprovado.",
    okReject: "Negócio rejeitado.",
    stale: "Este negócio já não está pendente. Lista atualizada.",
    fail: "A decisão não foi gravada.",
    reasonShort: "Indica um motivo (mín. 3 caracteres).",
    confirmApprove: "Aprovar este negócio? Passará a aparecer em Negócios Locais.",
    suspended: "Suspensos",
    suspend: "Suspender",
    reactivate: "Reativar",
    assign: "Atribuir dono",
    suspendTitle: "Suspender negócio",
    suspendLabel: "Motivo da suspensão (visível para o proprietário)",
    suspendInfo:
      "Deixa de aparecer ao público e de aceitar reservas. As reservas existentes mantêm-se.",
    openBookings: (n: number) =>
      `Atenção: este negócio tem ${n} reserva(s) pendente(s) ou confirmada(s) que ficam como estão.`,
    confirmSuspend: "Confirmar suspensão",
    okSuspend: "Negócio suspenso.",
    okReactivate: "Negócio reativado.",
    okSuspendOpen: (n: number) =>
      `Negócio suspenso. ${n} reserva(s) aberta(s) mantêm-se — acompanha-as em Reservas.`,
    assignTitle: "Atribuir dono",
    assignLabel: "Email da conta (confirmada, sem negócio)",
    confirmAssign: "Atribuir",
    okAssign: "Dono atribuído e notificado.",
    emailInvalid: "Indica um email válido.",
  },
  en: {
    title: "Business Approval",
    desc: "Businesses registered on the platform. Only pending ones can be decided.",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    search: "Search name, owner or email…",
    allProv: "All provinces",
    owner: "Owner",
    catalog: "Catalogue (no owner)",
    category: "Category",
    province: "Province",
    registered: "Registered",
    decided: "Decided",
    reason: "Reason",
    approve: "Approve",
    reject: "Reject",
    empty: "No businesses in this state.",
    error: "Could not load businesses.",
    retry: "Try again",
    confirmReject: "Reject business",
    reasonLabel: "Rejection reason (visible to the owner)",
    cancel: "Cancel",
    confirm: "Confirm rejection",
    okApprove: "Business approved.",
    okReject: "Business rejected.",
    stale: "This business is no longer pending. List refreshed.",
    fail: "The decision was not saved.",
    reasonShort: "Enter a reason (min. 3 characters).",
    confirmApprove: "Approve this business? It will appear in Local Businesses.",
    suspended: "Suspended",
    suspend: "Suspend",
    reactivate: "Reactivate",
    assign: "Assign owner",
    suspendTitle: "Suspend business",
    suspendLabel: "Suspension reason (visible to the owner)",
    suspendInfo: "It stops being listed and bookable. Existing bookings remain.",
    openBookings: (n: number) =>
      `Warning: this business has ${n} pending or confirmed booking(s) that remain as they are.`,
    confirmSuspend: "Confirm suspension",
    okSuspend: "Business suspended.",
    okReactivate: "Business reactivated.",
    okSuspendOpen: (n: number) =>
      `Business suspended. ${n} open booking(s) remain — follow them in Bookings.`,
    assignTitle: "Assign owner",
    assignLabel: "Account email (confirmed, without a business)",
    confirmAssign: "Assign",
    okAssign: "Owner assigned and notified.",
    emailInvalid: "Enter a valid email.",
  },
} as const;

async function load(): Promise<Row[]> {
  const [b, e] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id, name, status, category, category_code, province, created_at, owner_id, rejection_reason, decided_at, profiles:owner_id(display_name), provinces:province_id(name_pt)",
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("admin_business_owner_emails"),
  ]);
  if (b.error) throw b.error;
  if (e.error) throw e.error;
  const emails = new Map(
    (e.data ?? []).map((r: { business_id: string; email: string }) => [r.business_id, r.email]),
  );
  type BusinessRow = {
    id: string;
    name: string;
    status: Status;
    category: string | null;
    category_code: string | null;
    province: string | null;
    created_at: string;
    owner_id: string | null;
    rejection_reason: string | null;
    decided_at: string | null;
    profiles: { display_name: string | null } | null;
    provinces: { name_pt: string } | null;
  };
  return (b.data as unknown as BusinessRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    category: r.category ?? r.category_code,
    province: r.provinces?.name_pt ?? r.province,
    created_at: r.created_at,
    owner_id: r.owner_id,
    owner_name: r.profiles?.display_name ?? null,
    owner_email: emails.get(r.id) ?? null,
    rejection_reason: r.rejection_reason,
    decided_at: r.decided_at,
  }));
}

export function AdminBusinessesModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = TXT[lang];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState<Status>("pending");
  const [q, setQ] = useState("");
  const [prov, setProv] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [suspending, setSuspending] = useState<{ row: Row; open: number | null } | null>(null);
  const [assigning, setAssigning] = useState<Row | null>(null);
  const [email, setEmail] = useState("");

  const run = async (r: Row, action: () => Promise<void>) => {
    setBusy(r.id);
    try {
      await action();
      return true;
    } catch (e) {
      toast.error(adminErrorText(e instanceof Error ? e.message : "", lang));
      return false;
    } finally {
      setBusy(null);
      refresh();
    }
  };
  const openSuspend = (r: Row) => {
    setReason("");
    setSuspending({ row: r, open: null });
    countOpenBookings(r.id)
      .then((n) => setSuspending((cur) => (cur && cur.row.id === r.id ? { ...cur, open: n } : cur)))
      .catch(() => undefined);
  };

  const refresh = () => {
    setErr(false);
    setRows(null);
    load()
      .then(setRows)
      .catch(() => setErr(true));
  };
  useEffect(refresh, []);

  const provinces = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.province).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        r.status === tab &&
        (!prov || r.province === prov) &&
        (!s || [r.name, r.owner_name, r.owner_email].some((v) => v?.toLowerCase().includes(s))),
    );
  }, [rows, tab, q, prov]);
  const count = (s: Status) => (rows ?? []).filter((r) => r.status === s).length;
  const fmt = (d: string) => new Date(d).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB");

  const decide = async (r: Row, decision: "approved" | "rejected", why?: string) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("admin_decide_business", {
      _business_id: r.id,
      _decision: decision,
      _reason: why ?? undefined,
    });
    setBusy(null);
    if (error) {
      toast.error(
        error.message.includes("NOT_PENDING")
          ? t.stale
          : error.message.includes("REASON_REQUIRED")
            ? t.reasonShort
            : t.fail,
      );
      refresh();
      return false;
    }
    toast.success(decision === "approved" ? t.okApprove : t.okReject);
    refresh();
    return true;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {confirmDialog}
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2" role="tablist">
          {(["pending", "approved", "suspended", "rejected"] as const).map((s) => (
            <Button
              key={s}
              role="tab"
              aria-selected={tab === s}
              size="sm"
              variant={tab === s ? "default" : "outline"}
              onClick={() => setTab(s)}
            >
              {t[s]} {rows && <span className="ml-1 opacity-70">({count(s)})</span>}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            aria-label="refresh"
            className="ml-auto"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className="pl-9"
            />
          </div>
          <select
            value={prov}
            onChange={(e) => setProv(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t.allProv}</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {err ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-destructive text-sm">{t.error}</p>
            <Button size="sm" variant="outline" onClick={refresh}>
              {t.retry}
            </Button>
          </div>
        ) : !rows ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">{t.empty}</p>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{r.name}</p>
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "rejected" || r.status === "suspended"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {t[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.owner}:{" "}
                      {r.owner_id
                        ? `${r.owner_name ?? "—"}${r.owner_email ? ` · ${r.owner_email}` : ""}`
                        : t.catalog}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.category}: {r.category ?? "—"} · {t.province}: {r.province ?? "—"} ·{" "}
                      {t.registered}: {fmt(r.created_at)}
                      {r.decided_at && ` · ${t.decided}: ${fmt(r.decided_at)}`}
                    </p>
                    {(r.status === "rejected" || r.status === "suspended") &&
                      r.rejection_reason && (
                        <p className="text-xs">
                          <span className="text-muted-foreground">{t.reason}:</span>{" "}
                          {r.rejection_reason}
                        </p>
                      )}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={busy === r.id}
                        onClick={async () => {
                          if (await confirm({ title: t.confirmApprove, confirmLabel: t.approve }))
                            await decide(r, "approved");
                        }}
                      >
                        {busy === r.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}{" "}
                        {t.approve}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === r.id}
                        onClick={() => {
                          setReason("");
                          setRejecting(r);
                        }}
                      >
                        <XCircle className="size-4" /> {t.reject}
                      </Button>
                    </div>
                  )}
                  {r.status === "approved" && (
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {!r.owner_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === r.id}
                          onClick={() => {
                            setEmail("");
                            setAssigning(r);
                          }}
                        >
                          <UserPlus className="size-4" /> {t.assign}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === r.id}
                        onClick={() => openSuspend(r)}
                      >
                        <PauseCircle className="size-4" /> {t.suspend}
                      </Button>
                    </div>
                  )}
                  {r.status === "suspended" && (
                    <Button
                      size="sm"
                      disabled={busy === r.id}
                      className="shrink-0"
                      onClick={() =>
                        void run(r, async () => {
                          await setBusinessStatus(r.id, "approved");
                          toast.success(t.okReactivate);
                        })
                      }
                    >
                      {busy === r.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PlayCircle className="size-4" />
                      )}{" "}
                      {t.reactivate}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Dialog open={!!suspending} onOpenChange={(o) => !o && setSuspending(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.suspendTitle}</DialogTitle>
              <DialogDescription>
                {suspending?.row.name} — {t.suspendInfo}
              </DialogDescription>
            </DialogHeader>
            {suspending && suspending.open !== null && suspending.open > 0 && (
              <p
                role="alert"
                className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
              >
                <AlertTriangle className="size-4 shrink-0 text-destructive" />{" "}
                {t.openBookings(suspending.open)}
              </p>
            )}
            <label className="text-sm font-medium" htmlFor="suspend-reason">
              {t.suspendLabel}
            </label>
            <Textarea
              id="suspend-reason"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSuspending(null)}>
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                disabled={!isValidReason(reason) || busy === suspending?.row.id}
                onClick={async () => {
                  if (!suspending) return;
                  const ok = await run(suspending.row, async () => {
                    const res = await setBusinessStatus(suspending.row.id, "suspended", reason);
                    toast.success(
                      res.open_bookings > 0 ? t.okSuspendOpen(res.open_bookings) : t.okSuspend,
                    );
                  });
                  if (ok) setSuspending(null);
                }}
              >
                {busy === suspending?.row.id && <Loader2 className="size-4 animate-spin" />}{" "}
                {t.confirmSuspend}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!assigning} onOpenChange={(o) => !o && setAssigning(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.assignTitle}</DialogTitle>
              <DialogDescription>{assigning?.name}</DialogDescription>
            </DialogHeader>
            <label className="text-sm font-medium" htmlFor="assign-email">
              {t.assignLabel}
            </label>
            <Input
              id="assign-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {email.trim() !== "" && !isValidEmail(email) && (
              <p className="text-xs text-destructive">{t.emailInvalid}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssigning(null)}>
                {t.cancel}
              </Button>
              <Button
                disabled={!isValidEmail(email) || busy === assigning?.id}
                onClick={async () => {
                  if (!assigning) return;
                  const ok = await run(assigning, async () => {
                    await assignBusinessOwner(assigning.id, email);
                    toast.success(t.okAssign);
                  });
                  if (ok) setAssigning(null);
                }}
              >
                {busy === assigning?.id && <Loader2 className="size-4 animate-spin" />}{" "}
                {t.confirmAssign}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.confirmReject}</DialogTitle>
              <DialogDescription>{rejecting?.name}</DialogDescription>
            </DialogHeader>
            <label className="text-sm font-medium" htmlFor="reject-reason">
              {t.reasonLabel}
            </label>
            <Textarea
              id="reject-reason"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejecting(null)}>
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                disabled={reason.trim().length < 3 || busy === rejecting?.id}
                onClick={async () => {
                  if (rejecting && (await decide(rejecting, "rejected", reason.trim())))
                    setRejecting(null);
                }}
              >
                {busy === rejecting?.id && <Loader2 className="size-4 animate-spin" />} {t.confirm}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
