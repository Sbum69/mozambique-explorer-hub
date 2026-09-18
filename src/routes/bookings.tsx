import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, CalendarCheck, Clock, MapPin, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useLang } from "@/contexts/LanguageContext";
import { fetchMyBookings, type Booking, type BookingStatus } from "@/lib/bookings";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "As Minhas Reservas — Ekaya Explore" },
      { name: "description", content: "Acompanha as tuas reservas de experiências comunitárias em Moçambique." },
      { property: "og:title", content: "As Minhas Reservas — Ekaya Explore" },
      { property: "og:description", content: "Acompanha as tuas reservas de experiências comunitárias em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: BookingsPage,
});

const STATUS_STYLE: Record<BookingStatus, { pt: string; en: string; className: string }> = {
  pending: { pt: "Aguarda confirmação", en: "Awaiting confirmation", className: "bg-amber-100 text-amber-700" },
  confirmed: { pt: "Confirmada", en: "Confirmed", className: "bg-emerald-100 text-emerald-700" },
  rejected: { pt: "Rejeitada", en: "Rejected", className: "bg-rose-100 text-rose-700" },
  cancelled: { pt: "Cancelada", en: "Cancelled", className: "bg-muted text-muted-foreground" },
  completed: { pt: "Concluída", en: "Completed", className: "bg-blue-100 text-blue-700" },
};

function BookingsPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <button onClick={() => navigate({ to: "/dashboard" })} className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors ml-2">
              <ArrowLeft className="size-4" /> {lang === "pt" ? "Voltar ao painel" : "Back to dashboard"}
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
            {lang === "pt" ? "As minhas reservas" : "My bookings"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {lang === "pt"
              ? "Todas as reservas que fizeste, com o respetivo código e estado."
              : "Every booking you made, with its code and status."}
          </p>
        </motion.div>

        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="h-28 animate-pulse border-0 shadow-[var(--shadow-soft)] bg-muted/40" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="border-0 shadow-[var(--shadow-soft)] p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {lang === "pt"
                ? "Não foi possível carregar as tuas reservas. Tenta novamente."
                : "We couldn't load your bookings. Please try again."}
            </p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              {lang === "pt" ? "Tentar novamente" : "Try again"}
            </Button>
          </Card>
        )}

        {!loading && !error && bookings.length === 0 && (
          <Card className="border-0 shadow-[var(--shadow-soft)] p-8 text-center space-y-3">
            <Calendar className="size-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {lang === "pt"
                ? "Ainda não tens reservas. Explora as experiências e reserva a primeira."
                : "You have no bookings yet. Explore the experiences and book your first one."}
            </p>
            <Button
              className="bg-gradient-to-r from-warning to-primary text-white border-0"
              onClick={() => navigate({ to: "/experiences" })}
            >
              {lang === "pt" ? "Ver experiências" : "Browse experiences"}
            </Button>
          </Card>
        )}

        <div className="space-y-4">
          {bookings.map((b, i) => {
            const status = STATUS_STYLE[b.status];
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)]">
                  <div className="flex flex-col sm:flex-row">
                    {b.image && (
                      <img src={b.image} alt="" className="h-36 sm:h-auto sm:w-40 object-cover" loading="lazy" decoding="async" />
                    )}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
                          <h2 className="font-bold text-lg leading-tight">{b.experienceTitle[lang]}</h2>
                          <p className="text-xs text-muted-foreground mt-1">{b.host}</p>
                        </div>
                        <Badge className={`border-0 ${status.className}`}>{status[lang]}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="size-3" />{b.date} · {b.time}</span>
                        <span className="flex items-center gap-1"><Users className="size-3" />{b.people} {b.people > 1 ? (lang === "pt" ? "pessoas" : "people") : (lang === "pt" ? "pessoa" : "person")}</span>
                        <span className="flex items-center gap-1 truncate"><MapPin className="size-3" />{b.destinationName ?? b.location}</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" />{b.durationHours}h</span>
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{lang === "pt" ? "Total" : "Total"}</span>
                        <span className="text-xl font-bold text-primary">{b.totalMzn.toLocaleString()} MZN</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
