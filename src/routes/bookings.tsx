import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Clock,
  Compass,
  Mail,
  MapPin,
  Phone,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useLang } from "@/contexts/LanguageContext";
import {
  bookingReasonText,
  cancelMyBooking,
  fetchMyBookings,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "As Minhas Reservas — Ekaya Explore" },
      {
        name: "description",
        content: "Acompanha as tuas reservas de experiências comunitárias em Moçambique.",
      },
      { property: "og:title", content: "As Minhas Reservas — Ekaya Explore" },
      {
        property: "og:description",
        content: "Acompanha as tuas reservas de experiências comunitárias em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: BookingsPage,
});

const STATUS_STYLE: Record<BookingStatus, { pt: string; en: string; className: string }> = {
  pending: { pt: "Pendente", en: "Pending", className: "bg-amber-100 text-amber-700" },
  confirmed: { pt: "Confirmada", en: "Confirmed", className: "bg-emerald-100 text-emerald-700" },
  rejected: { pt: "Rejeitada", en: "Rejected", className: "bg-rose-100 text-rose-700" },
  cancelled: { pt: "Cancelada", en: "Cancelled", className: "bg-muted text-muted-foreground" },
  completed: { pt: "Concluída", en: "Completed", className: "bg-blue-100 text-blue-700" },
  no_show: { pt: "Não compareceu", en: "No-show", className: "bg-orange-100 text-orange-700" },
};

type TabId = "all" | "pending" | "confirmed" | "closed";

const TABS: { id: TabId; pt: string; en: string; match: (s: BookingStatus) => boolean }[] = [
  { id: "all", pt: "Todas", en: "All", match: () => true },
  { id: "pending", pt: "Pendentes", en: "Pending", match: (s) => s === "pending" },
  { id: "confirmed", pt: "Confirmadas", en: "Confirmed", match: (s) => s === "confirmed" },
  {
    id: "closed",
    pt: "Encerradas",
    en: "Closed",
    match: (s) => s === "completed" || s === "rejected" || s === "cancelled" || s === "no_show",
  },
];

function BookingsPage() {
  const { lang } = useLang();
  const pt = lang === "pt";
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabId>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setBookings(await fetchMyBookings());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const t = TABS.find((x) => x.id === tab)!;
    return bookings.filter((b) => t.match(b.status));
  }, [bookings, tab]);

  const open = bookings.find((b) => b.id === openId) ?? null;

  const doCancel = async () => {
    if (!open) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelMyBooking(open.id);
      setConfirmCancel(false);
      await load();
    } catch {
      setCancelError(
        pt
          ? "Não foi possível cancelar. Só reservas pendentes podem ser canceladas."
          : "Couldn't cancel. Only pending bookings can be cancelled.",
      );
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  const peopleLabel = (n: number) =>
    `${n} ${n > 1 ? (pt ? "participantes" : "participants") : pt ? "participante" : "participant"}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors ml-2"
            >
              <ArrowLeft className="size-4" /> {pt ? "Voltar ao painel" : "Back to dashboard"}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <CalendarCheck className="size-8 text-primary" />
            {pt ? "As minhas reservas" : "My bookings"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {pt
              ? "Todas as reservas que fizeste, com o respetivo código e estado."
              : "Every booking you made, with its code and status."}
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="mb-5">
          <TabsList className="h-auto flex-wrap justify-start">
            {TABS.map((t) => {
              const count = bookings.filter((b) => t.match(b.status)).length;
              return (
                <TabsTrigger key={t.id} value={t.id} className="text-xs sm:text-sm">
                  {pt ? t.pt : t.en} <span className="ml-1 text-muted-foreground">({count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Card
                key={i}
                className="h-28 animate-pulse border-0 shadow-[var(--shadow-soft)] bg-muted/40"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="border-0 shadow-[var(--shadow-soft)] p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {pt
                ? "Não foi possível carregar as tuas reservas."
                : "We couldn't load your bookings."}
            </p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              {pt ? "Carregar novamente" : "Reload"}
            </Button>
          </Card>
        )}

        {!loading && !error && visible.length === 0 && (
          <Card className="border-0 shadow-[var(--shadow-soft)] p-8 text-center space-y-3">
            <Calendar className="size-10 mx-auto text-muted-foreground/40" />
            <p className="font-semibold">{pt ? "Sem reservas" : "No bookings"}</p>
            <p className="text-sm text-muted-foreground">
              {bookings.length === 0
                ? pt
                  ? "Explora as experiências e reserva a primeira."
                  : "Explore the experiences and book your first one."
                : pt
                  ? "Não há reservas neste separador."
                  : "There are no bookings in this tab."}
            </p>
            {bookings.length === 0 && (
              <Button
                className="bg-gradient-to-r from-warning to-primary text-white border-0"
                onClick={() => navigate({ to: "/experiences" })}
              >
                {pt ? "Ver experiências" : "Browse experiences"}
              </Button>
            )}
          </Card>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {visible.map((b, i) => {
              const status = STATUS_STYLE[b.status];
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    role="button"
                    tabIndex={0}
                    aria-label={`${pt ? "Abrir reserva" : "Open booking"} ${b.code}`}
                    onClick={() => {
                      setCancelError(null);
                      setOpenId(b.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setOpenId(b.id);
                    }}
                    className="overflow-hidden border-0 shadow-[var(--shadow-soft)] cursor-pointer hover:shadow-[var(--shadow-card)] transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {b.image && (
                        <img
                          src={b.image}
                          alt=""
                          className="h-36 sm:h-auto sm:w-40 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-muted-foreground">
                              {pt ? "Código" : "Code"}: {b.code}
                            </p>
                            <h2 className="font-bold text-lg leading-tight">
                              {b.experienceTitle[lang]}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">{b.host}</p>
                          </div>
                          <Badge className={`border-0 ${status.className}`}>{status[lang]}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {b.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {b.time}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="size-3" />
                            {b.destinationName ?? b.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {peopleLabel(b.people)}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <span className="text-xl font-bold text-primary">
                            {b.totalMzn.toLocaleString()} MZN
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog
        open={!!open}
        onOpenChange={(o) => {
          if (!o) setOpenId(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 pr-6">
                  <span className="font-mono text-xs text-muted-foreground">
                    {pt ? "Código" : "Code"}: {open.code}
                  </span>
                  <Badge className={`border-0 ${STATUS_STYLE[open.status].className}`}>
                    {STATUS_STYLE[open.status][lang]}
                  </Badge>
                </div>
                <DialogTitle className="text-left">{open.experienceTitle[lang]}</DialogTitle>
                <DialogDescription className="text-left">
                  {open.experienceDescription[lang] || (pt ? "Sem descrição." : "No description.")}
                </DialogDescription>
              </DialogHeader>
              {open.image && (
                <img src={open.image} alt="" className="w-full h-40 object-cover rounded-lg" />
              )}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info
                  label={pt ? "Destino" : "Destination"}
                  value={open.destinationName ?? open.location}
                />
                <Info label={pt ? "Negócio" : "Business"} value={open.host} />
                <Info label={pt ? "Data" : "Date"} value={open.date} />
                <Info label={pt ? "Hora" : "Time"} value={open.time} />
                <Info label={pt ? "Participantes" : "Participants"} value={String(open.people)} />
                <Info label="Total" value={`${open.totalMzn.toLocaleString()} MZN`} />
              </dl>
              {(open.hostPhone || open.hostEmail) && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {pt ? "Contacto do negócio" : "Business contact"}
                  </p>
                  {open.hostPhone && (
                    <a
                      href={`tel:${open.hostPhone}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Phone className="size-3" />
                      {open.hostPhone}
                    </a>
                  )}
                  {open.hostEmail && (
                    <a
                      href={`mailto:${open.hostEmail}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Mail className="size-3" />
                      {open.hostEmail}
                    </a>
                  )}
                </div>
              )}
              {open.status === "rejected" && (
                <p className="text-xs text-muted-foreground">
                  {pt
                    ? "Esta reserva foi rejeitada pelo anfitrião."
                    : "This booking was rejected by the host."}
                </p>
              )}
              {open.decisionReason && (
                <p className="text-xs text-muted-foreground">
                  {pt ? "Motivo: " : "Reason: "}
                  {bookingReasonText(open.decisionReason, lang)}
                </p>
              )}
              {open.status === "confirmed" && (
                <p className="text-xs text-muted-foreground">
                  {pt
                    ? "Reservas confirmadas não podem ser canceladas aqui. Contacta o negócio."
                    : "Confirmed bookings can't be cancelled here. Contact the business."}
                </p>
              )}
              {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate({ to: "/experience/$id", params: { id: open.experienceId } })
                  }
                >
                  <Compass className="size-4 mr-1" />
                  {pt ? "Ver experiência" : "View experience"}
                </Button>
                {open.destinationSlug && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate({ to: "/map", search: { destination: open.destinationSlug! } })
                    }
                  >
                    <MapPin className="size-4 mr-1" />
                    {pt ? "Ver destino" : "View destination"}
                  </Button>
                )}
                {open.status === "pending" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setConfirmCancel(true)}
                  >
                    <XCircle className="size-4 mr-1" />
                    {pt ? "Cancelar" : "Cancel"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pt ? "Confirmar cancelamento" : "Confirm cancellation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pt
                ? `Queres mesmo cancelar a reserva ${open?.code ?? ""}? Os lugares serão libertados e esta ação não pode ser desfeita.`
                : `Do you really want to cancel booking ${open?.code ?? ""}? The seats will be released and this can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{pt ? "Voltar" : "Back"}</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void doCancel();
              }}
            >
              {cancelling
                ? pt
                  ? "A cancelar…"
                  : "Cancelling…"
                : pt
                  ? "Confirmar cancelamento"
                  : "Confirm cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
