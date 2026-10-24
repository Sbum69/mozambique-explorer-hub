import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Search } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bookingReasonText, type BookingStatus } from "@/lib/bookings";
import {
  adminCancelBooking,
  adminErrorText,
  fetchAdminBookings,
  isValidReason,
  type AdminBooking,
} from "@/lib/admin";

const STATUSES: (BookingStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "rejected",
  "cancelled",
];

const TXT = {
  pt: {
    title: "Reservas",
    desc: "Todas as reservas da plataforma. O administrador pode cancelar uma reserva pendente ou confirmada, com motivo.",
    search: "Pesquisar código, cliente, atividade ou negócio…",
    loading: "A carregar reservas…",
    error: "Não foi possível carregar as reservas.",
    retry: "Tentar novamente",
    empty: "Sem reservas neste filtro.",
    people: "pessoas",
    reason: "Motivo",
    cancel: "Cancelar com motivo",
    suspendedBiz: "Negócio suspenso — reserva aberta a acompanhar",
    cancelTitle: "Cancelar reserva",
    reasonLabel: "Motivo (enviado ao turista e ao negócio)",
    back: "Voltar",
    confirm: "Confirmar cancelamento",
    ok: "Reserva cancelada.",
    status: {
      all: "Todas",
      pending: "Pendente",
      confirmed: "Confirmada",
      completed: "Concluída",
      no_show: "Não compareceu",
      rejected: "Rejeitada",
      cancelled: "Cancelada",
    },
  },
  en: {
    title: "Bookings",
    desc: "Every booking on the platform. The administrator can cancel a pending or confirmed booking, with a reason.",
    search: "Search code, customer, activity or business…",
    loading: "Loading bookings…",
    error: "Could not load bookings.",
    retry: "Try again",
    empty: "No bookings for this filter.",
    people: "people",
    reason: "Reason",
    cancel: "Cancel with reason",
    suspendedBiz: "Business suspended — open booking to follow up",
    cancelTitle: "Cancel booking",
    reasonLabel: "Reason (sent to the tourist and the business)",
    back: "Back",
    confirm: "Confirm cancellation",
    ok: "Booking cancelled.",
    status: {
      all: "All",
      pending: "Pending",
      confirmed: "Confirmed",
      completed: "Completed",
      no_show: "No-show",
      rejected: "Rejected",
      cancelled: "Cancelled",
    },
  },
} as const;

export function AdminBookingsModal({ onClose }: { onClose: () => void }) {
  const { authUser } = useAuth();
  const { lang } = useLang();
  const t = TXT[lang];
  const qc = useQueryClient();
  const key = ["admin-bookings", authUser?.id];
  const q = useQuery({ queryKey: key, queryFn: fetchAdminBookings, enabled: !!authUser?.id });
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [cancelling, setCancelling] = useState<AdminBooking | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter(
      (b) =>
        (filter === "all" || b.status === filter) &&
        (!s ||
          [b.code, b.customerName, b.experienceTitle, b.businessName].some((v) =>
            v.toLowerCase().includes(s),
          )),
    );
  }, [q.data, filter, search]);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await adminCancelBooking(cancelling.id, reason);
      toast.success(t.ok);
      setCancelling(null);
      await qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(adminErrorText(e instanceof Error ? e.message : "", lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2" role="tablist">
          {STATUSES.map((s) => (
            <Button
              key={s}
              role="tab"
              aria-selected={filter === s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {t.status[s]}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="pl-9"
          />
        </div>
        {q.isPending ? (
          <p aria-busy="true" className="text-sm">
            {t.loading}
          </p>
        ) : q.isError ? (
          <div role="alert" className="text-sm space-y-2">
            <p>{t.error}</p>
            <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
              {t.retry}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t.empty}</p>
        ) : (
          <ul className="divide-y">
            {list.map((b) => {
              const open = b.status === "pending" || b.status === "confirmed";
              return (
                <li key={b.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium break-words">{b.experienceTitle}</p>
                      <Badge
                        variant={
                          b.status === "cancelled" ||
                          b.status === "rejected" ||
                          b.status === "no_show"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {t.status[b.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.code} · {b.businessName} · {b.date} {b.time} · {b.people} {t.people} ·{" "}
                      {b.customerName}
                    </p>
                    {b.decisionReason && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">{t.reason}:</span>{" "}
                        {bookingReasonText(b.decisionReason, lang)}
                      </p>
                    )}
                    {open && b.businessStatus === "suspended" && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        {t.suspendedBiz}
                      </p>
                    )}
                  </div>
                  {open && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReason("");
                        setCancelling(b);
                      }}
                    >
                      <Ban className="size-4" />
                      {t.cancel}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Dialog
          open={!!cancelling}
          onOpenChange={(o) => {
            if (!o && !busy) setCancelling(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.cancelTitle}</DialogTitle>
              <DialogDescription>
                {cancelling ? `${cancelling.code} · ${cancelling.experienceTitle}` : ""}
              </DialogDescription>
            </DialogHeader>
            <label className="text-sm font-medium" htmlFor="admin-cancel-reason">
              {t.reasonLabel}
            </label>
            <Textarea
              id="admin-cancel-reason"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelling(null)} disabled={busy}>
                {t.back}
              </Button>
              <Button
                variant="destructive"
                disabled={!isValidReason(reason) || busy}
                onClick={() => void confirmCancel()}
              >
                {t.confirm}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
