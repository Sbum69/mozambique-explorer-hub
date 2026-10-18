import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut, Check, X, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { BusinessManagement } from "@/components/BusinessManagement";
import { fetchBusinessBookings, updateBookingStatus, type Booking } from "@/lib/bookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/business-dashboard")({
  ssr: false,
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

function BusinessDashboardPage() {
  const navigate = useNavigate(); const { logout } = useAuth(); const { lang } = useLang(); const pt = lang === "pt";
  const [bookings, setBookings] = useState<Booking[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(false); try { setBookings(await fetchBusinessBookings()); } catch { setError(true); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const decide = async (booking: Booking, status: "confirmed" | "rejected") => { setBusy(booking.id); try { await updateBookingStatus(booking.id, status); await load(); toast.success(pt ? "Reserva atualizada." : "Booking updated."); } catch { toast.error(pt ? "Não foi possível atualizar a reserva." : "Could not update booking."); } finally { setBusy(null); } };
  const labels = { pending: pt ? "Pendente" : "Pending", confirmed: pt ? "Confirmada" : "Confirmed", rejected: pt ? "Rejeitada" : "Rejected", cancelled: pt ? "Cancelada" : "Cancelled", completed: pt ? "Concluída" : "Completed" };
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-background sticky top-0 z-30"><div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
      <Store className="size-5 text-primary" /><span className="font-bold flex-1">{pt ? "Painel do Negócio" : "Business Dashboard"}</span>
      <Button variant="ghost" size="icon" aria-label={pt ? "Voltar à Home" : "Back to Home"} onClick={() => navigate({ to: "/home" })}><ArrowLeft className="size-4" /></Button><LanguageToggle /><NotificationsBell />
      <Button variant="ghost" size="icon" aria-label={pt ? "Sair" : "Sign out"} onClick={() => void logout().then(() => navigate({ to: "/login", replace: true }))}><LogOut className="size-4" /></Button>
    </div></header>
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-10"><BusinessManagement />
      <section className="border-t pt-6 space-y-4"><h2 className="text-xl font-bold">{pt ? "Pedidos de Reserva" : "Booking Requests"}</h2>
        {loading ? <p aria-busy="true">{pt ? "A carregar reservas…" : "Loading bookings…"}</p> : error ? <div role="alert"><p>{pt ? "Não foi possível carregar as reservas." : "Could not load bookings."}</p><Button variant="outline" onClick={() => void load()}>{pt ? "Tentar novamente" : "Retry"}</Button></div> : !bookings.length ? <p className="text-muted-foreground">{pt ? "Ainda não recebeste pedidos de reserva." : "You have no booking requests yet."}</p> : <ul className="space-y-3">{bookings.slice(0, 8).map(b => <li key={b.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between gap-3 flex-wrap"><h3 className="font-semibold break-words">{b.experienceTitle[lang]}</h3><Badge variant="secondary">{labels[b.status]}</Badge></div>
          <p className="font-mono text-xs text-muted-foreground">{b.code}</p><p className="text-sm">{b.date} · {b.time} · {b.people} {pt ? "pessoas" : "people"}</p><p className="text-sm break-words">{b.customerName} · {b.customerPhone} · {b.customerEmail}</p>{b.notes && <p className="text-sm whitespace-pre-line">{b.notes}</p>}
          <div className="flex justify-between gap-3 items-center flex-wrap"><strong>{b.totalMzn.toLocaleString(lang)} MZN</strong>{b.status === "pending" && <div className="flex gap-2"><Button disabled={busy === b.id} variant="outline" size="sm" onClick={() => void decide(b, "rejected")}><X className="size-4" />{pt ? "Rejeitar" : "Reject"}</Button><Button disabled={busy === b.id} size="sm" onClick={() => void decide(b, "confirmed")}><Check className="size-4" />{pt ? "Confirmar" : "Confirm"}</Button></div>}</div>
        </li>)}</ul>}
      </section>
    </main>
  </div>;
}
