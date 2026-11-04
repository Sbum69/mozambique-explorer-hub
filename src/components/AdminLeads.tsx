import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { inviteUrl } from "@/lib/content";
import {
  LEAD_STATUSES,
  convertLead,
  fetchLeads,
  setLeadStatus,
  type Lead,
  type LeadStatus,
} from "@/lib/leads";
import { FOR_BUSINESS_TXT } from "@/lib/page-texts";

/** Admin → "Para negócios" requests: status, notes and "create business from request". */
export function AdminLeads() {
  const { lang } = useLang();
  const t = FOR_BUSINESS_TXT[lang];
  const queryClient = useQueryClient();
  const [askConfirm, confirmDialog] = useConfirm();
  const [filter, setFilter] = useState<LeadStatus | "all">("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ leadId: string; url: string } | null>(null);
  const q = useQuery({ queryKey: ["admin-leads"], queryFn: fetchLeads });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] });

  const change = async (l: Lead, status: LeadStatus) => {
    const answer = await askConfirm({
      title: `${t[`status_${status}`]} — ${l.businessName}`,
      confirmLabel: t[`status_${status}`],
      destructive: status === "discarded",
      reason: "optional",
      reasonLabel: t.note,
    });
    if (!answer) return;
    setBusy(l.id);
    try {
      await setLeadStatus(l.id, status, answer.reason);
      await refresh();
    } catch {
      toast.error(t.errAction);
    } finally {
      setBusy(null);
    }
  };

  const convert = async (l: Lead) => {
    const answer = await askConfirm({
      title: t.convertTitle,
      description: t.convertBody,
      confirmLabel: t.convert,
    });
    if (!answer) return;
    setBusy(l.id);
    try {
      const { token } = await convertLead(l);
      setInvite({ leadId: l.id, url: inviteUrl(window.location.origin, token) });
      toast.success(t.converted);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error && e.message === "DUPLICATE" ? t.errDuplicate : t.errAction);
    } finally {
      setBusy(null);
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

  const list = q.data.filter((l) => filter === "all" || l.status === filter);
  return (
    <div className="space-y-4">
      {confirmDialog}
      <p className="text-sm text-muted-foreground">{t.adminIntro}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.adminTitle}>
        {(["all", ...LEAD_STATUSES] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? t.filterAll : t[`status_${s}`]} (
            {s === "all" ? q.data.length : q.data.filter((l) => l.status === s).length})
          </Button>
        ))}
      </div>
      {!list.length && <p className="text-sm text-muted-foreground">{t.empty}</p>}
      <ul className="space-y-3">
        {list.map((l) => (
          <li key={l.id} className="rounded-[10px] border border-border p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium break-words">{l.businessName}</p>
              <Badge variant={l.status === "new" ? "default" : "secondary"}>
                {t[`status_${l.status}`]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {l.provinceCode} · {l.categoryCode} ·{" "}
              {l.acceptsBookings ? t.bookingsYes : t.bookingsNo} ·{" "}
              {new Date(l.createdAt).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB")}
            </p>
            <p className="text-sm break-words">
              {l.contactName} · {l.contact}
            </p>
            {l.message && <p className="text-sm whitespace-pre-line break-words">{l.message}</p>}
            {l.adminNote && (
              <p className="text-sm">
                {t.note}: {l.adminNote}
              </p>
            )}
            {invite?.leadId === l.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void navigator.clipboard.writeText(invite.url).then(
                    () => toast.success(t.copied),
                    () => toast.error(t.errAction),
                  )
                }
              >
                <Copy className="size-4" aria-hidden="true" />
                {t.copyInvite}
              </Button>
            )}
            <div className="flex flex-wrap gap-2">
              {busy === l.id && <Loader2 className="size-4 animate-spin" aria-label={t.loading} />}
              {l.status !== "converted" && (
                <Button size="sm" onClick={() => void convert(l)} disabled={!!busy}>
                  {t.convert}
                </Button>
              )}
              {l.status === "new" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void change(l, "contacted")}
                  disabled={!!busy}
                >
                  {t.markContacted}
                </Button>
              )}
              {(l.status === "new" || l.status === "contacted") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void change(l, "discarded")}
                  disabled={!!busy}
                >
                  {t.discard}
                </Button>
              )}
              {l.status === "discarded" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void change(l, "new")}
                  disabled={!!busy}
                >
                  {t.reopen}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
