import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowLeft, Compass, Clock, Star, MapPin, Users, Check, Sparkles, Calendar, Phone, Mail, User as UserIcon, Store, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { EXPERIENCES, type Experience, type ExperienceCategory } from "@/data/experiences";
import { FavoriteButton } from "@/components/FavoriteButton";
import { addBooking, generateBookingCode, type Booking } from "@/data/bookings";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Experiências — Ekaya Explore" },
      { name: "description", content: "Reserva experiências comunitárias autênticas em Moçambique." },
      { property: "og:title", content: "Experiências — Ekaya Explore" },
      { property: "og:description", content: "Reserva experiências comunitárias autênticas em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ekaya.auth.user")) {
      throw redirect({ to: "/login" });
    }
  },
  component: ExperiencesPage,
});

const CATEGORIES: { id: ExperienceCategory | "all"; emoji: string; labelPt: string; labelEn: string }[] = [
  { id: "all", emoji: "✨", labelPt: "Todas", labelEn: "All" },
  { id: "beach", emoji: "🏖️", labelPt: "Praia", labelEn: "Beach" },
  { id: "culture", emoji: "🎨", labelPt: "Cultura", labelEn: "Culture" },
  { id: "food", emoji: "🍽️", labelPt: "Gastronomia", labelEn: "Food" },
  { id: "nature", emoji: "🌿", labelPt: "Natureza", labelEn: "Nature" },
  { id: "community", emoji: "👥", labelPt: "Comunidade", labelEn: "Community" },
  { id: "adventure", emoji: "🏃", labelPt: "Aventura", labelEn: "Adventure" },
];

function ExperiencesPage() {
  const { t, lang } = useLang();
  const { addXP, user } = useAuth();
  const navigate = useNavigate();
  const preferredInterest = user?.preferences?.interests?.find((i) =>
    CATEGORIES.some((c) => c.id === i),
  ) as ExperienceCategory | undefined;
  const [filter, setFilter] = useState<ExperienceCategory | "all">(preferredInterest ?? "all");
  const provinceId = user?.preferences?.province;
  const [showAllDestinations, setShowAllDestinations] = useState(!provinceId);

  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [openExp, setOpenExp] = useState<Experience | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    date: "",
    time: "09:00",
    people: 2,
    name: user?.username ?? "",
    phone: "",
    email: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    let list = EXPERIENCES;
    if (provinceId && !showAllDestinations) list = list.filter((e) => e.destinationId === provinceId);
    if (filter !== "all") list = list.filter((e) => e.category === filter);
    return list;
  }, [filter, provinceId, showAllDestinations]);


  const openBookingModal = (exp: Experience) => {
    if (booked.has(exp.id)) return;
    setForm({
      date: "",
      time: "09:00",
      people: 2,
      name: user?.username ?? "",
      phone: "",
      email: "",
      notes: "",
    });
    setOpenExp(exp);
  };

  const submitBooking = () => {
    if (!openExp) return;
    if (!form.date || !form.name || !form.phone) {
      toast.error(lang === "pt" ? "Preenche data, nome e telefone" : "Fill in date, name and phone");
      return;
    }
    const booking: Booking = {
      id: crypto.randomUUID(),
      experienceId: openExp.id,
      experienceTitle: openExp.title,
      host: openExp.host,
      location: openExp.location,
      image: openExp.image,
      priceMzn: openExp.priceMzn,
      durationHours: openExp.durationHours,
      date: form.date,
      time: form.time,
      people: form.people,
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email || undefined,
      notes: form.notes || undefined,
      totalMzn: openExp.priceMzn * form.people,
      status: "pending",
      createdAt: Date.now(),
      code: generateBookingCode(),
    };
    addBooking(booking);
    setBooked((s) => new Set(s).add(openExp.id));
    const result = addXP(50);
    setOpenExp(null);
    setConfirmedBooking(booking);
    toast.success(t("bookingConfirmed"), {
      description: `${booking.experienceTitle[lang]} — +50 XP`,
      icon: <Sparkles className="size-4" />,
    });
    if (result.leveledUp) {
      setTimeout(() => toast.success(`${t("levelUp")} Lv ${result.newLevel}`), 400);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <button onClick={() => navigate({ to: "/dashboard" })} className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors ml-2">
              <ArrowLeft className="size-4" /> {t("backToDashboard")}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Compass className="size-8 text-primary" /> {t("expTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("expSub")}</p>
        </motion.div>

        {provinceId && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-orange-500/10 px-4 py-3 flex-wrap">
            <p className="text-sm">
              <Sparkles className="inline size-4 text-primary mr-1" />
              {showAllDestinations
                ? (lang === "pt" ? "A mostrar experiências de todos os destinos" : "Showing experiences from all destinations")
                : (lang === "pt" ? `A mostrar apenas experiências em ${provinceId}` : `Showing only experiences in ${provinceId}`)}
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowAllDestinations((s) => !s)}>
              {showAllDestinations
                ? (lang === "pt" ? "Filtrar pelo meu destino" : "Filter by my destination")
                : (lang === "pt" ? "Ver todos os destinos" : "Show all destinations")}
            </Button>
          </div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === c.id
                  ? "bg-gradient-to-r from-warning to-primary text-white shadow-[var(--shadow-elegant)]"
                  : "bg-background border border-border hover:border-primary/40"
              }`}
            >
              <span className="mr-1.5">{c.emoji}</span>
              {lang === "pt" ? c.labelPt : c.labelEn}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((exp, i) => {
            const isBooked = booked.has(exp.id);
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img src={exp.image} alt={exp.title[lang]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-background/95 text-foreground backdrop-blur">
                        <Star className="size-3 mr-1 fill-warning text-warning" />
                        {exp.rating.toFixed(1)} · {exp.reviews}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-warning to-primary text-white border-0">
                        {CATEGORIES.find((c) => c.id === exp.category)?.emoji}{" "}
                        {lang === "pt"
                          ? CATEGORIES.find((c) => c.id === exp.category)?.labelPt
                          : CATEGORIES.find((c) => c.id === exp.category)?.labelEn}
                      </Badge>
                      <FavoriteButton
                        itemId={exp.id}
                        itemType="experience"
                        itemData={{
                          title: exp.title,
                          description: exp.description,
                          image: exp.image,
                          location: exp.location,
                          rating: exp.rating,
                          priceMzn: exp.priceMzn,
                          durationHours: exp.durationHours,
                          host: exp.host,
                        }}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <MapPin className="size-3" /> {exp.location}
                    </div>
                    <h3 className="font-bold text-lg leading-tight">{exp.title[lang]}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">{exp.description[lang]}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {exp.durationHours} {exp.durationHours === 1 ? t("hour") : t("hours")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" /> {exp.host}
                      </span>
                    </div>

                    <div className="flex items-end justify-between mt-5 pt-4 border-t">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {exp.priceMzn.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">MZN</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t("perPerson")}</p>
                      </div>
                      <Button
                        onClick={() => openBookingModal(exp)}
                        disabled={isBooked}
                        className={isBooked ? "" : "bg-gradient-to-r from-warning to-primary text-white border-0 hover:opacity-90"}
                        variant={isBooked ? "outline" : "default"}
                      >
                        {isBooked ? (
                          <><Check className="size-4" /> {t("booked")}</>
                        ) : (
                          t("bookNow")
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Booking details modal */}
      <Dialog open={!!openExp} onOpenChange={(o) => !o && setOpenExp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {openExp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="size-5 text-primary" />
                  {lang === "pt" ? "Detalhes da reserva" : "Booking details"}
                </DialogTitle>
                <DialogDescription>{openExp.title[lang]} — {openExp.host}</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg overflow-hidden border mb-2">
                <img src={openExp.image} alt="" className="w-full h-32 object-cover" />
                <div className="p-3 bg-muted/30 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3" />{openExp.location}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3" />{openExp.durationHours}h</span>
                  <span className="font-semibold text-primary">{openExp.priceMzn.toLocaleString()} MZN</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{lang === "pt" ? "Data" : "Date"} *</Label>
                  <Input type="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>{lang === "pt" ? "Hora" : "Time"}</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
                </div>
                <div>
                  <Label>{lang === "pt" ? "Pessoas" : "People"}</Label>
                  <Input type="number" min={1} max={20} value={form.people} onChange={(e) => setForm((f) => ({ ...f, people: Math.max(1, Number(e.target.value) || 1) }))} />
                </div>
                <div>
                  <Label>{lang === "pt" ? "Nome" : "Name"} *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>{lang === "pt" ? "Telefone" : "Phone"} *</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+258..." />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>{lang === "pt" ? "Notas (opcional)" : "Notes (optional)"}</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-lg bg-gradient-to-r from-warning/10 to-primary/10 p-3">
                <span className="text-sm text-muted-foreground">{lang === "pt" ? "Total estimado" : "Estimated total"}</span>
                <span className="text-xl font-bold text-primary">{(openExp.priceMzn * form.people).toLocaleString()} MZN</span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenExp(null)}>{t("back")}</Button>
                <Button className="bg-gradient-to-r from-warning to-primary text-white border-0" onClick={submitBooking}>
                  {lang === "pt" ? "Enviar pedido de reserva" : "Send booking request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation modal */}
      <Dialog open={!!confirmedBooking} onOpenChange={(o) => !o && setConfirmedBooking(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {confirmedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                  {lang === "pt" ? "Pedido enviado!" : "Request sent!"}
                </DialogTitle>
                <DialogDescription>
                  {lang === "pt"
                    ? "O anfitrião foi notificado e vai confirmar em breve."
                    : "The host has been notified and will confirm shortly."}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border bg-gradient-to-br from-warning/5 to-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{lang === "pt" ? "Código" : "Code"}</span>
                  <span className="font-mono font-bold text-primary">{confirmedBooking.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{lang === "pt" ? "Estado" : "Status"}</span>
                  <Badge className="bg-amber-100 text-amber-700 border-0">{lang === "pt" ? "Aguarda confirmação" : "Awaiting confirmation"}</Badge>
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <DetailRow icon={<Compass className="size-4" />} label={lang === "pt" ? "Experiência" : "Experience"} value={confirmedBooking.experienceTitle[lang]} />
                  <DetailRow icon={<Store className="size-4" />} label={lang === "pt" ? "Anfitrião" : "Host"} value={confirmedBooking.host} />
                  <DetailRow icon={<MapPin className="size-4" />} label={lang === "pt" ? "Local" : "Location"} value={confirmedBooking.location} />
                  <DetailRow icon={<Calendar className="size-4" />} label={lang === "pt" ? "Data e hora" : "Date & time"} value={`${confirmedBooking.date} · ${confirmedBooking.time}`} />
                  <DetailRow icon={<Users className="size-4" />} label={lang === "pt" ? "Pessoas" : "People"} value={String(confirmedBooking.people)} />
                  <DetailRow icon={<Clock className="size-4" />} label={lang === "pt" ? "Duração" : "Duration"} value={`${confirmedBooking.durationHours}h`} />
                  <DetailRow icon={<UserIcon className="size-4" />} label={lang === "pt" ? "Reservado por" : "Booked by"} value={confirmedBooking.customerName} />
                  <DetailRow icon={<Phone className="size-4" />} label={lang === "pt" ? "Contacto" : "Phone"} value={confirmedBooking.customerPhone} />
                  {confirmedBooking.customerEmail && <DetailRow icon={<Mail className="size-4" />} label="Email" value={confirmedBooking.customerEmail} />}
                  {confirmedBooking.notes && <DetailRow icon={<FileText className="size-4" />} label={lang === "pt" ? "Notas" : "Notes"} value={confirmedBooking.notes} />}
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{lang === "pt" ? "Total" : "Total"}</span>
                  <span className="text-2xl font-bold text-primary">{confirmedBooking.totalMzn.toLocaleString()} MZN</span>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setConfirmedBooking(null)}>
                  {lang === "pt" ? "Continuar a explorar" : "Keep exploring"}
                </Button>
                <Button
                  className="bg-gradient-to-r from-warning to-primary text-white border-0"
                  onClick={() => {
                    setConfirmedBooking(null);
                    navigate({ to: "/business-dashboard" });
                  }}
                >
                  <Store className="size-4" /> {lang === "pt" ? "Ir ao painel do anfitrião" : "Go to host's dashboard"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
