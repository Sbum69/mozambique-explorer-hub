import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar as CalendarIcon, ArrowLeft, LogOut, Check, X, Store, Ban, Flag, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { BusinessManagement } from "@/components/BusinessManagement";
import { decideBooking, type Booking, type BookingStatus } from "@/lib/bookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOwnerBookings } from "@/lib/dashboard.functions";
import { bookingMetrics, bookingHasStarted } from "@/lib/business-dashboard";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/business-dashboard")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({ status: STATUS_FILTERS.includes(search.status as BookingStatus | "all") ? search.status as BookingStatus | "all" : "all" as const }),
  beforeLoad: () => requireRole(["business_small", "business_large"]),
  head: () => ({
    meta: [
      { title: "Painel do Negócio — Ekaya Explore" },
      { name: "description", content: "Gere reservas, perfil e desempenho do teu negócio turístico em Moçambique." },
      { property: "og:title", content: "Painel do Negócio — Ekaya Explore" },
      { property: "og:description", content: "Gere reservas, perfil e desempenho do teu negócio turístico em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessDashboardPage,
});

const STATUS_FILTERS: (BookingStatus | "all")[] = ["all", "pending", "confirmed", "completed", "rejected", "cancelled"];

function decisionError(message: string, pt: boolean): string {
  const m = message.toLowerCase();
  if (m.includes("reason_required")) return pt ? "Indica um motivo." : "Please provide a reason.";
  if (m.includes("already_decided") || m.includes("final state")) return pt ? "Esta reserva já foi processada." : "This booking was already processed.";
  if (m.includes("invalid_transition") || m.includes("only the business")) return pt ? "Esta ação não é permitida para esta reserva." : "This action is not allowed for this booking.";
  if (m.includes("booking_not_yet_completed")) return pt ? "Só podes concluir após a data e hora da reserva." : "You can only complete after the booking date and time.";
  if (m.includes("forbidden")) return pt ? "Esta reserva não pertence ao teu negócio." : "This booking does not belong to your business.";
  return pt ? "Não foi possível atualizar a reserva." : "Could not update the booking.";
}

function BusinessDashboardPage() {
  const navigate = useNavigate();
  const { logout, authUser, isLoading } = useAuth();
  const { lang } = useLang();
  const pt = lang === "pt";
  const fetchBookings = useServerFn(getOwnerBookings);
  const { data: bookings = [], isPending: loading, isError: error, refetch } = useQuery({ queryKey: ["owner-bookings", authUser?.id], queryFn: () => fetchBookings(), enabled: !isLoading && !!authUser?.id, staleTime: 30_000 });
  const load = async () => { await refetch(); };
  const [busy, setBusy] = useState<string | null>(null);
  const { status: filter } = Route.useSearch();
  const setFilter = (status: BookingStatus | "all") => void navigate({ to: "/business-dashboard", search: { status } });
  const [detail, setDetail] = useState<Booking | null>(null);
  const [reasonAction, setReasonAction] = useState<{ booking: Booking; decision: "rejected" | "cancelled" } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const decide = async (booking: Booking, decision: "confirmed" | "completed") => {
    setBusy(booking.id);
    try {
      await decideBooking(booking.id, decision);
      await load();
      toast.success(pt ? "Reserva atualizada." : "Booking updated.");
    } catch (err) {
      toast.error(decisionError(err instanceof Error ? err.message : "", pt));
    } finally {
      setBusy(null);
    }
  };

  const submitReason = async () => {
    if (!reasonAction) return;
    if (!reason.trim()) {
      setReasonError(pt ? "Indica um motivo." : "Please provide a reason.");
      return;
    }
    setBusy(reasonAction.booking.id);
    setReasonError("");
    try {
      await decideBooking(reasonAction.booking.id, reasonAction.decision, reason);
      await load();
      toast.success(pt ? "Reserva atualizada." : "Booking updated.");
      setReasonAction(null);
      setReason("");
    } catch (err) {
      setReasonError(decisionError(err instanceof Error ? err.message : "", pt));
    } finally {
      setBusy(null);
    }
  };

  const labels: Record<BookingStatus, string> = {
    pending: pt ? "Pendente" : "Pending",
    confirmed: pt ? "Confirmada" : "Confirmed",
    rejected: pt ? "Rejeitada" : "Rejected",
    cancelled: pt ? "Cancelada" : "Cancelled",
    completed: pt ? "Concluída" : "Completed",
  };
  const filterLabels: Record<BookingStatus | "all", string> = { all: pt ? "Todas" : "All", ...labels };
  const isPast = (b: Booking) => bookingHasStarted(b.date, b.time);
  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = bookingMetrics(bookings);
  const openBookings = (status: BookingStatus | "all") => { setFilter(status); document.getElementById("business-bookings")?.scrollIntoView({ block: "start" }); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
          <Store className="size-5 text-primary" />
          <span className="font-bold flex-1">{pt ? "Painel do Negócio" : "Business Dashboard"}</span>
          <Button variant="ghost" size="icon" className="text-foreground" aria-label={pt ? "Voltar à Home" : "Back to Home"} onClick={() => navigate({ to: "/home" })}>
            <ArrowLeft className="size-4" />
          </Button>
          <LanguageToggle />
          <NotificationsBell />
          <Button variant="ghost" size="icon" className="text-foreground" aria-label={pt ? "Sair" : "Sign out"} onClick={() => void logout().then(() => navigate({ to: "/login", replace: true }))}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <section className="space-y-4" aria-label={pt ? "Resumo de reservas" : "Bookings summary"}>
          <h2 className="text-xl font-bold">{pt ? "Resumo de reservas" : "Bookings summary"}</h2>
          {loading ? <p aria-busy="true">{pt ? "A carregar reservas…" : "Loading bookings…"}</p> : error ? <div role="alert"><p>{pt ? "Não foi possível carregar as métricas." : "Could not load metrics."}</p><Button variant="outline" onClick={() => void load()}>{pt ? "Tentar novamente" : "Retry"}</Button></div> : <>
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {STATUS_FILTERS.map(s => <div key={s} className="border-l-2 border-primary pl-3"><dt className="text-sm text-muted-foreground">{pt ? "Reservas" : "Bookings"} · {filterLabels[s]}</dt><dd className="text-2xl font-bold tabular-nums">{counts[s]}</dd></div>)}
              <div className="border-l-2 border-primary pl-3"><dt className="text-sm text-muted-foreground">{pt ? "Confirmadas futuras" : "Upcoming confirmed"}</dt><dd className="text-2xl font-bold tabular-nums">{counts.upcoming}</dd></div>
            </dl>
            {!bookings.length && <p className="text-muted-foreground">{pt ? "Ainda não há reservas." : "No bookings yet."}</p>}
          </>}
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openBookings("pending")}><Check className="size-4" />{pt ? "Abrir reservas pendentes" : "Open pending bookings"}</Button><Button variant="outline" onClick={() => openBookings("all")}><CalendarIcon className="size-4" />{pt ? "Ver todas as reservas" : "View all bookings"}</Button></div>
        </section>
        <BusinessManagement />
        {!loading && !error && <section className="space-y-3"><h2 className="text-xl font-bold">{pt ? "Reservas recentes" : "Recent bookings"}</h2>{!bookings.length ? <p className="text-muted-foreground">{pt ? "Sem reservas recentes." : "No recent bookings."}</p> : <ul className="divide-y">{bookings.slice(0,5).map(b => <li key={b.id} className="py-3"><Button variant="link" className="h-auto p-0 whitespace-normal text-left" onClick={() => setDetail(b)}>{b.experienceTitle[lang] || b.code}</Button><p className="text-sm text-muted-foreground">{b.code} · {new Date(b.createdAt).toLocaleString(pt ? "pt-PT" : "en-GB")} · {labels[b.status]}</p></li>)}</ul>}</section>}
        <section id="business-bookings" className="border-t pt-6 space-y-4 scroll-mt-24">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold">{pt ? "Reservas" : "Bookings"}</h2>
            <Button variant="ghost" size="sm" onClick={() => void load()} aria-label={pt ? "Atualizar" : "Refresh"}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap" role="group" aria-label={pt ? "Filtrar por estado" : "Filter by status"}>
            {STATUS_FILTERS.map((s) => (
              <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} aria-pressed={filter === s}>
                {filterLabels[s]} ({loading || error ? "—" : counts[s]})
              </Button>
            ))}
          </div>
          {loading ? (
            <p aria-busy="true">{pt ? "A carregar reservas…" : "Loading bookings…"}</p>
          ) : error ? (
            <div role="alert">
              <p>{pt ? "Não foi possível carregar as reservas." : "Could not load bookings."}</p>
              <Button variant="outline" onClick={() => void load()}>{pt ? "Tentar novamente" : "Retry"}</Button>
            </div>
          ) : !filtered.length ? (
            <p className="text-muted-foreground">{pt ? "Sem reservas neste estado." : "No bookings in this state."}</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((b) => (
                <li key={b.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between gap-3 flex-wrap">
                    <Button variant="link" className="h-auto p-0 text-left font-semibold break-words whitespace-normal" onClick={() => setDetail(b)}>
                      {b.experienceTitle[lang]}
                    </Button>
                    <Badge variant="secondary">{labels[b.status]}</Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
                  <p className="text-sm">
                    {b.date} · {b.time} · {b.people} {pt ? "pessoas" : "people"} · {pt ? "criada em" : "created"} {new Date(b.createdAt).toLocaleDateString(lang)}
                  </p>
                  <p className="text-sm break-words">
                    {b.customerName}
                    {b.customerPhone ? ` · ${b.customerPhone}` : ""}
                    {b.customerEmail ? ` · ${b.customerEmail}` : ""}
                  </p>
                  {b.decisionReason && (
                    <p className="text-sm text-muted-foreground">
                      {pt ? "Motivo: " : "Reason: "}
                      {b.decisionReason}
                    </p>
                  )}
                  <div className="flex justify-between gap-3 items-center flex-wrap">
                    <strong>{b.totalMzn.toLocaleString(lang)} MZN</strong>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(b)}>{pt ? "Detalhes" : "Details"}</Button>
                      {b.status === "pending" && (
                        <>
                          <Button disabled={busy === b.id} variant="outline" size="sm" onClick={() => { setReason(""); setReasonError(""); setReasonAction({ booking: b, decision: "rejected" }); }}>
                            <X className="size-4" />
                            {pt ? "Rejeitar" : "Reject"}
                          </Button>
                          <Button disabled={busy === b.id} size="sm" onClick={() => void decide(b, "confirmed")}>
                            <Check className="size-4" />
                            {pt ? "Confirmar" : "Confirm"}
                          </Button>
                        </>
                      )}
                      {b.status === "confirmed" && (
                        <>
                          <Button disabled={busy === b.id} variant="outline" size="sm" onClick={() => { setReason(""); setReasonError(""); setReasonAction({ booking: b, decision: "cancelled" }); }}>
                            <Ban className="size-4" />
                            {pt ? "Cancelar" : "Cancel"}
                          </Button>
                          {isPast(b) && (
                            <Button disabled={busy === b.id} variant="outline" size="sm" onClick={() => void decide(b, "completed")}>
                              <Flag className="size-4" />
                              {pt ? "Concluir" : "Complete"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{pt ? "Detalhes da reserva" : "Booking details"}</DialogTitle>
          <DialogDescription>{detail?.code}</DialogDescription>
          {detail && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{pt ? "Atividade" : "Activity"}</dt>
              <dd className="break-words">{detail.experienceTitle[lang]}</dd>
              <dt className="text-muted-foreground">{pt ? "Data e hora" : "Date and time"}</dt>
              <dd>{detail.date} · {detail.time}</dd>
              <dt className="text-muted-foreground">{pt ? "Participantes" : "Participants"}</dt>
              <dd>{detail.people}</dd>
              <dt className="text-muted-foreground">{pt ? "Total" : "Total"}</dt>
              <dd>{detail.totalMzn.toLocaleString(lang)} MZN</dd>
              <dt className="text-muted-foreground">{pt ? "Estado" : "Status"}</dt>
              <dd>{labels[detail.status]}</dd>
              <dt className="text-muted-foreground">{pt ? "Criada em" : "Created"}</dt>
              <dd>{new Date(detail.createdAt).toLocaleString(lang)}</dd>
              <dt className="text-muted-foreground">{pt ? "Cliente" : "Customer"}</dt>
              <dd className="break-words">{detail.customerName}</dd>
              {detail.customerPhone && (<><dt className="text-muted-foreground">{pt ? "Telefone" : "Phone"}</dt><dd>{detail.customerPhone}</dd></>)}
              {detail.customerEmail && (<><dt className="text-muted-foreground">Email</dt><dd className="break-words">{detail.customerEmail}</dd></>)}
              {detail.notes && (<><dt className="text-muted-foreground">{pt ? "Notas" : "Notes"}</dt><dd className="whitespace-pre-line break-words">{detail.notes}</dd></>)}
              {detail.decisionReason && (<><dt className="text-muted-foreground">{pt ? "Motivo" : "Reason"}</dt><dd className="break-words">{detail.decisionReason}</dd></>)}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={reasonAction !== null} onOpenChange={(open) => { if (!open) setReasonAction(null); }}>
        <DialogContent className="max-w-lg">
          <DialogTitle>
            {reasonAction?.decision === "rejected" ? (pt ? "Rejeitar reserva" : "Reject booking") : (pt ? "Cancelar reserva confirmada" : "Cancel confirmed booking")}
          </DialogTitle>
          <DialogDescription>
            {reasonAction?.decision === "rejected"
              ? (pt ? "O motivo é obrigatório e será partilhado com o turista." : "A reason is required and will be shared with the tourist.")
              : (pt ? "A reserva fica no histórico. O motivo é obrigatório e será partilhado com o turista. Não há reembolsos automáticos." : "The booking stays in the history. A reason is required and will be shared with the tourist. No automatic refunds.")}
          </DialogDescription>
          <p className="font-mono text-xs text-muted-foreground">{reasonAction?.booking.code}</p>
          <Textarea
            aria-label={pt ? "Motivo" : "Reason"}
            placeholder={pt ? "Escreve o motivo…" : "Write the reason…"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {reasonError && <p role="alert" className="text-destructive text-sm">{reasonError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setReasonAction(null)}>{pt ? "Voltar" : "Back"}</Button>
            <Button variant="destructive" disabled={busy === reasonAction?.booking.id} onClick={() => void submitReason()}>
              {reasonAction?.decision === "rejected" ? (pt ? "Confirmar rejeição" : "Confirm rejection") : (pt ? "Confirmar cancelamento" : "Confirm cancellation")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
