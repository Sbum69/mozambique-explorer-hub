import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Compass,
  Clock,
  Star,
  MapPin,
  Users,
  Check,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  User as UserIcon,
  Store,
  FileText,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InterestIcon } from "@/components/InterestIcon";
import { PhotoCredit } from "@/components/PhotoCredit";
import { Card } from "@/components/ui/card";
import { JoinEkayaCard } from "@/components/JoinEkayaCard";
import { CONTENT_TXT } from "@/lib/page-texts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { type Experience, type ExperienceCategory } from "@/lib/experiences";
import { useAvailability, useExperiences } from "@/hooks/useExperiences";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ResetPrefsButton } from "@/components/ResetPrefsButton";
import { usePersonalPrefs } from "@/hooks/usePersonalPrefs";
import { usePrefilledFilters } from "@/hooks/usePrefilledFilters";
import { useProvinces } from "@/hooks/useProvinces";
import { firstOffered, inPreferredProvinces } from "@/lib/pref-filters";
import { useBackTarget } from "@/lib/nav";
import { formatPrice } from "@/lib/price";
import {
  createBooking,
  fetchAvailableWeekdays,
  translateBookingError,
  type Booking,
} from "@/lib/bookings";

const SponsoredStrip = lazy(() =>
  import("@/components/SponsoredStrip").then((m) => ({ default: m.SponsoredStrip })),
);

const WEEKDAY_LABEL: { pt: string; en: string }[] = [
  { pt: "Domingo", en: "Sunday" },
  { pt: "Segunda", en: "Monday" },
  { pt: "Terça", en: "Tuesday" },
  { pt: "Quarta", en: "Wednesday" },
  { pt: "Quinta", en: "Thursday" },
  { pt: "Sexta", en: "Friday" },
  { pt: "Sábado", en: "Saturday" },
];

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Experiências — Ekaya Explore" },
      {
        name: "description",
        content: "Reserva experiências comunitárias autênticas em Moçambique.",
      },
      { property: "og:title", content: "Experiências — Ekaya Explore" },
      {
        property: "og:description",
        content: "Reserva experiências comunitárias autênticas em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { book?: string } =>
    typeof search.book === "string" ? { book: search.book } : {},
  component: ExperiencesPage,
});

const CATEGORIES: {
  id: ExperienceCategory | "all";
  labelPt: string;
  labelEn: string;
}[] = [
  { id: "all", labelPt: "Todas", labelEn: "All" },
  { id: "beach", labelPt: "Praia", labelEn: "Beach" },
  { id: "culture", labelPt: "Cultura", labelEn: "Culture" },
  { id: "food", labelPt: "Gastronomia", labelEn: "Food" },
  { id: "nature", labelPt: "Natureza", labelEn: "Nature" },
  { id: "community", labelPt: "Comunidade", labelEn: "Community" },
  { id: "adventure", labelPt: "Aventura", labelEn: "Adventure" },
];

interface ExperienceFilters {
  category: ExperienceCategory | "all";
  /** Only the saved provinces (on by default when there are preferences). */
  onlyMine: boolean;
}

function ExperiencesPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { requireAccount } = useAuthGate();
  const navigate = useNavigate();
  const backTarget = useBackTarget();
  // Filters start from the saved preferences (provinces and first matching interest); changing
  // them never changes the preferences.
  const personalPrefs = usePersonalPrefs();
  const { provinces } = useProvinces();
  const expFilters = usePrefilledFilters<ExperienceFilters>(
    personalPrefs.hasPrefs
      ? {
          category:
            firstOffered(
              personalPrefs.interests,
              CATEGORIES.map((c) => c.id),
            ) ?? "all",
          onlyMine: true,
        }
      : null,
    { category: "all", onlyMine: false },
  );
  const filter = expFilters.value.category;
  const setFilter = (category: ExperienceFilters["category"]) =>
    expFilters.set((cur) => ({ ...cur, category }));
  const hasProvincePrefs = personalPrefs.hasPrefs;
  const showAllDestinations = !expFilters.value.onlyMine;
  const toggleAllDestinations = () =>
    expFilters.set((cur) => ({ ...cur, onlyMine: !cur.onlyMine }));
  // Sponsored cards of the first saved province (the organic list below keeps its own order).
  const sponsoredProvinceId = provinces.find((p) => p.code === personalPrefs.provinces[0])?.id;
  const myProvinceNames = personalPrefs.provinces
    .map((code) => provinces.find((p) => p.code === code)?.name[lang] ?? code)
    .join(", ");

  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [openExp, setOpenExp] = useState<Experience | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [form, setForm] = useState({
    date: "",
    time: "",
    people: 2,
    name: user?.displayName ?? user?.username ?? "",
    phone: "",
    email: user?.email ?? "",
    notes: "",
  });

  const { experiences, loading, error, isEmpty, reload } = useExperiences();
  const { book: bookId } = Route.useSearch();

  const filtered = useMemo(() => {
    let list = experiences;
    if (hasProvincePrefs && !showAllDestinations)
      list = list.filter((e) => inPreferredProvinces(e.province, personalPrefs));
    if (filter !== "all") list = list.filter((e) => e.category === filter);
    return list;
  }, [experiences, filter, hasProvincePrefs, showAllDestinations, personalPrefs]);

  const {
    slots,
    loading: loadingSlots,
    error: slotsError,
  } = useAvailability(openExp?.id ?? null, form.date || null);

  const selectedSlot = slots.find((s) => s.startTime === form.time) ?? null;
  const maxPeople = selectedSlot
    ? Math.max(1, selectedSlot.remainingCapacity)
    : (openExp?.capacity ?? 20);

  // Keep the party size within what the chosen slot still has free.
  useEffect(() => {
    if (selectedSlot && form.people > maxPeople) {
      setForm((f) => ({ ...f, people: maxPeople }));
    }
  }, [selectedSlot, maxPeople, form.people]);

  // Which weekdays this experience actually runs on, from the availability table.
  useEffect(() => {
    if (!openExp) {
      setWeekdays([]);
      return;
    }
    let active = true;
    fetchAvailableWeekdays(openExp.id)
      .then((days) => active && setWeekdays(days.sort()))
      .catch(() => active && setWeekdays([]));
    return () => {
      active = false;
    };
  }, [openExp]);

  const handleDateChange = (value: string) => {
    if (value && weekdays.length > 0) {
      const day = new Date(`${value}T00:00:00`).getDay();
      if (!weekdays.includes(day)) {
        toast.error(
          lang === "pt"
            ? "Esta experiência não tem horários nesse dia."
            : "This experience has no times on that day.",
        );
        return;
      }
    }
    setForm((f) => ({ ...f, date: value, time: "" }));
  };

  // Deep link from an experience detail page: open that experience's booking form once.
  const [bookHandled, setBookHandled] = useState(false);
  useEffect(() => {
    if (!bookId || bookHandled || loading) return;
    const exp = experiences.find((e) => e.id === bookId);
    setBookHandled(true);
    if (exp) openBookingModal(exp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, bookHandled, loading, experiences]);

  const openBookingModal = (exp: Experience) => {
    if (booked.has(exp.id)) return;
    if (!requireAccount(lang === "pt" ? "reservar" : "book")) return;
    setForm({
      date: "",
      time: "",
      people: 2,
      name: user?.displayName ?? user?.username ?? "",
      phone: "",
      email: user?.email ?? "",
      notes: "",
    });
    setOpenExp(exp);
  };

  const submitBooking = async () => {
    if (!openExp || submitting) return;
    if (!form.date || !form.time || !form.name || !form.phone) {
      toast.error(
        lang === "pt"
          ? "Preenche data, horário, nome e telefone"
          : "Fill in date, time, name and phone",
      );
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createBooking({
        experienceId: openExp.id,
        date: form.date,
        time: form.time,
        people: form.people,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email || undefined,
        notes: form.notes || undefined,
      });
      setBooked((s) => new Set(s).add(openExp.id));
      setOpenExp(null);
      setConfirmedBooking(booking);
      toast.success(t("bookingConfirmed"), {
        description: booking.experienceTitle[lang],
        icon: <Sparkles className="size-4" />,
      });
    } catch (e) {
      toast.error(translateBookingError(e instanceof Error ? e.message : "", lang));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <button
              onClick={() => navigate({ to: backTarget })}
              className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors ml-2"
            >
              <ArrowLeft className="size-4" /> {t("backToDashboard")}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Largest element of the page: shown at once (no entrance fade) so it paints with the first render. */}
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Compass className="size-8 text-primary" /> {t("expTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("expSub")}</p>
        </motion.div>

        {hasProvincePrefs && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-accent px-4 py-3 flex-wrap">
            <p className="text-sm">
              <Sparkles className="inline size-4 text-primary mr-1" />
              {showAllDestinations
                ? lang === "pt"
                  ? "A mostrar experiências de todos os destinos"
                  : "Showing experiences from all destinations"
                : lang === "pt"
                  ? `A mostrar apenas experiências em ${myProvinceNames}`
                  : `Showing only experiences in ${myProvinceNames}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {expFilters.canReset && <ResetPrefsButton onClick={expFilters.reset} />}
              <Button size="sm" variant="outline" onClick={toggleAllDestinations}>
                {showAllDestinations
                  ? lang === "pt"
                    ? "Filtrar pelo meu destino"
                    : "Filter by my destination"
                  : lang === "pt"
                    ? "Ver todos os destinos"
                    : "Show all destinations"}
              </Button>
            </div>
          </div>
        )}

        {sponsoredProvinceId && (
          <Suspense fallback={null}>
            <SponsoredStrip scope="province" provinceId={sponsoredProvinceId} className="mb-6" />
          </Suspense>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === c.id
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "bg-background border border-border hover:border-primary/40"
              }`}
            >
              <InterestIcon id={c.id} className="mr-1.5" />
              {lang === "pt" ? c.labelPt : c.labelEn}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[0, 1, 2].map((i) => (
              <Card
                key={i}
                className="h-72 animate-pulse border-0 shadow-[var(--shadow-soft)] bg-muted/40"
              />
            ))}
          </div>
        )}

        {error && (
          <Card className="border-0 shadow-[var(--shadow-soft)] p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {lang === "pt"
                ? "Não foi possível carregar as experiências. Verifica a ligação e tenta novamente."
                : "We couldn't load the experiences. Check your connection and try again."}
            </p>
            <Button size="sm" variant="outline" onClick={() => void reload()}>
              {lang === "pt" ? "Tentar novamente" : "Try again"}
            </Button>
          </Card>
        )}

        {isEmpty && <JoinEkayaCard message={CONTENT_TXT[lang].emptyExperiences} />}

        {!loading && !error && !isEmpty && filtered.length === 0 && (
          <Card className="border-0 shadow-[var(--shadow-soft)] p-6 text-center text-sm text-muted-foreground">
            {lang === "pt"
              ? "Nenhuma experiência corresponde a estes filtros."
              : "No experience matches these filters."}
          </Card>
        )}

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
                    <img
                      src={exp.image}
                      alt={exp.title[lang]}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                    <PhotoCredit src={exp.image} />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-background/95 text-foreground backdrop-blur">
                        <Star className="size-3 mr-1 fill-warning text-warning" />
                        {exp.rating.toFixed(1)} · {exp.reviews}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground border-0">
                        <InterestIcon id={exp.category} className="mr-1" />
                        {lang === "pt"
                          ? CATEGORIES.find((c) => c.id === exp.category)?.labelPt
                          : CATEGORIES.find((c) => c.id === exp.category)?.labelEn}
                      </Badge>
                      <FavoriteButton itemId={exp.id} itemType="experience" size="sm" />
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <MapPin className="size-3" /> {exp.location}
                    </div>
                    <h3 className="font-bold text-lg leading-tight">{exp.title[lang]}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">
                      {exp.description[lang]}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {exp.durationHours}{" "}
                        {exp.durationHours === 1 ? t("hour") : t("hours")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" /> {exp.host}
                      </span>
                    </div>

                    <div className="flex items-end justify-between mt-5 pt-4 border-t">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {exp.priceMzn === 0 ? (
                            formatPrice(0, lang)
                          ) : (
                            <>
                              {exp.priceMzn.toLocaleString(lang === "pt" ? "pt-PT" : "en-GB")}{" "}
                              <span className="text-xs font-normal text-muted-foreground">MZN</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t("perPerson")}</p>
                      </div>
                      <Button
                        onClick={() => openBookingModal(exp)}
                        disabled={isBooked}
                        className={
                          isBooked
                            ? ""
                            : "bg-primary text-primary-foreground border-0 hover:opacity-90"
                        }
                        variant={isBooked ? "outline" : "default"}
                      >
                        {isBooked ? (
                          <>
                            <Check className="size-4" /> {t("booked")}
                          </>
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
                <DialogDescription>
                  {openExp.title[lang]} — {openExp.host}
                </DialogDescription>
              </DialogHeader>

              <div className="relative rounded-lg overflow-hidden border mb-2">
                <img
                  src={openExp.image}
                  alt=""
                  className="w-full h-32 object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <PhotoCredit src={openExp.image} />
                <div className="p-3 bg-muted/30 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="size-3" />
                    {openExp.location}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" />
                    {openExp.durationHours}h
                  </span>
                  <span className="font-semibold text-primary">
                    {formatPrice(openExp.priceMzn, lang)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>{lang === "pt" ? "Data" : "Date"} *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                  {weekdays.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {lang === "pt" ? "Dias com horários: " : "Days with times: "}
                      {weekdays.map((d) => WEEKDAY_LABEL[d][lang]).join(", ")}
                    </p>
                  )}
                </div>

                {form.date && (
                  <div className="col-span-2 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      {lang === "pt" ? "Escolhe o horário" : "Choose a time"} *
                    </p>
                    {loadingSlots && (
                      <p className="text-xs text-muted-foreground animate-pulse">
                        {lang === "pt"
                          ? "A verificar disponibilidade..."
                          : "Checking availability..."}
                      </p>
                    )}
                    {slotsError && (
                      <p className="text-xs text-muted-foreground">
                        {lang === "pt"
                          ? "Não foi possível verificar a disponibilidade. Tenta novamente."
                          : "We couldn't check availability. Please try again."}
                      </p>
                    )}
                    {!loadingSlots && !slotsError && slots.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {lang === "pt" ? "Sem horários nesta data." : "No times on this date."}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setForm((f) => ({ ...f, time: slot.startTime }))}
                          className={`rounded-full border px-3 py-1.5 text-xs transition ${
                            form.time === slot.startTime
                              ? "border-primary bg-primary/10 font-semibold"
                              : "bg-background hover:bg-muted/60"
                          } ${slot.available ? "" : "opacity-50 cursor-not-allowed"}`}
                        >
                          {slot.startTime}–{slot.endTime} ·{" "}
                          {slot.available
                            ? `${slot.remainingCapacity} ${lang === "pt" ? "lugares" : "seats"}`
                            : lang === "pt"
                              ? "sem lugares"
                              : "no seats"}
                        </button>
                      ))}
                    </div>
                    {selectedSlot && !selectedSlot.available && (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                        {lang === "pt"
                          ? "Sem lugares disponíveis para este horário."
                          : "No seats available for this time."}
                      </p>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <Label>{lang === "pt" ? "Número de pessoas" : "Number of people"}</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setForm((f) => ({ ...f, people: Math.max(1, f.people - 1) }))}
                      disabled={form.people <= 1}
                      aria-label={lang === "pt" ? "Menos pessoas" : "Fewer people"}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="min-w-8 text-center text-lg font-semibold">{form.people}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        setForm((f) => ({ ...f, people: Math.min(maxPeople, f.people + 1) }))
                      }
                      disabled={form.people >= maxPeople}
                      aria-label={lang === "pt" ? "Mais pessoas" : "More people"}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedSlot
                        ? `${lang === "pt" ? "Máximo agora" : "Max now"}: ${maxPeople}`
                        : openExp.capacity
                          ? `${lang === "pt" ? "Capacidade" : "Capacity"}: ${openExp.capacity}`
                          : ""}
                    </span>
                  </div>
                </div>

                <div>
                  <Label>{lang === "pt" ? "Nome" : "Name"} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{lang === "pt" ? "Telefone" : "Phone"} *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+258..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label>{lang === "pt" ? "Notas (opcional)" : "Notes (optional)"}</Label>
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-lg bg-accent p-3">
                <span className="text-sm text-muted-foreground">
                  {lang === "pt" ? "Total estimado" : "Estimated total"}
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(openExp.priceMzn * form.people, lang)}
                </span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenExp(null)}>
                  {t("back")}
                </Button>
                <Button
                  className="bg-primary text-primary-foreground border-0"
                  onClick={() => void submitBooking()}
                  disabled={submitting || !form.date || !form.time || !selectedSlot?.available}
                >
                  {submitting
                    ? lang === "pt"
                      ? "A reservar..."
                      : "Booking..."
                    : lang === "pt"
                      ? "Enviar pedido de reserva"
                      : "Send booking request"}
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
                <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-6" />
                  {lang === "pt" ? "Pedido enviado!" : "Request sent!"}
                </DialogTitle>
                <DialogDescription>
                  {lang === "pt"
                    ? "O anfitrião foi notificado e vai confirmar em breve."
                    : "The host has been notified and will confirm shortly."}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {lang === "pt" ? "Código" : "Code"}
                  </span>
                  <span className="font-mono font-bold text-primary">{confirmedBooking.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {lang === "pt" ? "Estado" : "Status"}
                  </span>
                  <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-0">
                    {lang === "pt" ? "Aguarda confirmação" : "Awaiting confirmation"}
                  </Badge>
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <DetailRow
                    icon={<Compass className="size-4" />}
                    label={lang === "pt" ? "Experiência" : "Experience"}
                    value={confirmedBooking.experienceTitle[lang]}
                  />
                  <DetailRow
                    icon={<Store className="size-4" />}
                    label={lang === "pt" ? "Anfitrião" : "Host"}
                    value={confirmedBooking.host}
                  />
                  <DetailRow
                    icon={<MapPin className="size-4" />}
                    label={lang === "pt" ? "Local" : "Location"}
                    value={confirmedBooking.location}
                  />
                  <DetailRow
                    icon={<Calendar className="size-4" />}
                    label={lang === "pt" ? "Data e hora" : "Date & time"}
                    value={`${confirmedBooking.date} · ${confirmedBooking.time}`}
                  />
                  <DetailRow
                    icon={<Users className="size-4" />}
                    label={lang === "pt" ? "Pessoas" : "People"}
                    value={String(confirmedBooking.people)}
                  />
                  <DetailRow
                    icon={<Clock className="size-4" />}
                    label={lang === "pt" ? "Duração" : "Duration"}
                    value={`${confirmedBooking.durationHours}h`}
                  />
                  <DetailRow
                    icon={<UserIcon className="size-4" />}
                    label={lang === "pt" ? "Reservado por" : "Booked by"}
                    value={confirmedBooking.customerName}
                  />
                  <DetailRow
                    icon={<Phone className="size-4" />}
                    label={lang === "pt" ? "Contacto" : "Phone"}
                    value={confirmedBooking.customerPhone ?? "—"}
                  />
                  {confirmedBooking.customerEmail && (
                    <DetailRow
                      icon={<Mail className="size-4" />}
                      label="Email"
                      value={confirmedBooking.customerEmail}
                    />
                  )}
                  {confirmedBooking.notes && (
                    <DetailRow
                      icon={<FileText className="size-4" />}
                      label={lang === "pt" ? "Notas" : "Notes"}
                      value={confirmedBooking.notes}
                    />
                  )}
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {lang === "pt" ? "Total" : "Total"}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {confirmedBooking.totalMzn.toLocaleString()} MZN
                  </span>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setConfirmedBooking(null)}>
                  {lang === "pt" ? "Continuar a explorar" : "Keep exploring"}
                </Button>
                <Button
                  className="bg-primary text-primary-foreground border-0"
                  onClick={() => {
                    setConfirmedBooking(null);
                    navigate({ to: "/bookings" });
                  }}
                >
                  <Calendar className="size-4" />{" "}
                  {lang === "pt" ? "Ver as minhas reservas" : "See my bookings"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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
