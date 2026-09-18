import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Compass,
  Download,
  WifiOff,
  Heart,
  Star,
  Clock,
  Newspaper,
  LayoutDashboard,

} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLang, type Lang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { OnboardingModal } from "@/components/OnboardingModal";

import { useDestinations } from "@/hooks/useDestinations";
import { type ExperienceCategory } from "@/lib/experiences";
import { useExperiences } from "@/hooks/useExperiences";
import { useRecommendations } from "@/hooks/useRecommendations";
import { SAMPLE_ITINERARIES } from "@/data/itineraries";
import { MOCK_NEWS, newsCategoryLabel } from "@/data/news";

import hero from "@/assets/hero-mozambique.jpg";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Ekaya — Explora Moçambique para além da superfície" },
      {
        name: "description",
        content:
          "Escolhe destino, dias e tipo de experiência. Ekaya recomenda roteiros, atividades e locais únicos em Moçambique.",
      },
      { property: "og:title", content: "Ekaya — Explora Moçambique para além da superfície" },
      { property: "og:description", content: "Escolhe destino, dias e tipo de experiência. Ekaya recomenda roteiros, atividades e locais únicos em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: HomePage,
});

// ---- Filter model ----
type DayBucket = "1" | "2-3" | "4-7" | "7+";
type Interest = ExperienceCategory | "heritage";

const INTEREST_OPTIONS: { id: Interest; label: { pt: string; en: string }; emoji: string }[] = [
  { id: "beach", label: { pt: "Praias e natureza", en: "Beaches & nature" }, emoji: "🏖️" },
  { id: "culture", label: { pt: "Cultura e história", en: "Culture & history" }, emoji: "🎭" },
  { id: "community", label: { pt: "Experiências comunitárias", en: "Community experiences" }, emoji: "👥" },
  { id: "food", label: { pt: "Gastronomia", en: "Food & cuisine" }, emoji: "🍽️" },
  { id: "nature", label: { pt: "Vida selvagem / safaris", en: "Wildlife & safaris" }, emoji: "🦁" },
  { id: "adventure", label: { pt: "Aventura", en: "Adventure" }, emoji: "🚣" },
];

const DAY_OPTIONS: { id: DayBucket; label: { pt: string; en: string } }[] = [
  { id: "1", label: { pt: "1 dia", en: "1 day" } },
  { id: "2-3", label: { pt: "2 a 3 dias", en: "2–3 days" } },
  { id: "4-7", label: { pt: "4 a 7 dias", en: "4–7 days" } },
  { id: "7+", label: { pt: "Mais de 7 dias", en: "7+ days" } },
];

// Itinerary duration -> max days
function itineraryDays(it: { duration: string }): number {
  const m = it.duration.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function bucketMax(b: DayBucket): number {
  if (b === "1") return 1;
  if (b === "2-3") return 3;
  if (b === "4-7") return 7;
  return 99;
}

// Story Stops extracted from itineraries
const STORY_STOPS = SAMPLE_ITINERARIES.flatMap((it) =>
  it.route
    .filter((s) => s.type === "story")
    .map((s) => ({
      id: `${it.id}-${s.id}`,
      itineraryId: it.id,
      title: s.title ?? "",
      location: s.location ?? "",
      story: s.story ?? "",
      category: s.culturalContext ?? "",
    })),
);

function HomePage() {
  const { user, needsOnboarding, logout } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const { destinations, loading: loadingDestinations, error: destinationsError } = useDestinations();
  const { experiences, loading: loadingExperiences, error: experiencesError } = useExperiences();
  const [destId, setDestId] = useState<string>("any");
  const [days, setDays] = useState<DayBucket>("2-3");
  const [interests, setInterests] = useState<Interest[]>(["beach", "community"]);
  const [applied, setApplied] = useState({ destId: "any", days: "2-3" as DayBucket, interests: ["beach", "community"] as Interest[] });

  useEffect(() => {
    if (needsOnboarding) setShowOnboarding(true);
  }, [needsOnboarding]);

  function toggleInterest(id: Interest) {
    setInterests((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  function applyFilters() {
    setApplied({ destId, days, interests });
    const el = document.getElementById("reco");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- Filtered recommendations ----
  const maxDays = bucketMax(applied.days);

  const recoItineraries = useMemo(() => {
    return SAMPLE_ITINERARIES.filter((it) => itineraryDays(it) <= maxDays + 1).slice(0, 4);
  }, [maxDays]);

  const recoExperiences = useMemo(() => {
    const pool = experiences.filter((e) => {
      const matchDest = applied.destId === "any" || e.destinationId === applied.destId;
      const matchInt =
        applied.interests.length === 0 ||
        applied.interests.includes(e.category as Interest);
      return matchDest && matchInt;
    });
    return (pool.length ? pool : experiences).slice(0, 4);
  }, [applied, experiences]);

  const recoStories = STORY_STOPS.slice(0, 3);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={hero} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/75 via-foreground/55 to-background" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 text-white">
          <div className="flex items-center gap-1">
            <div className="text-white">
              <AppSidebar />
            </div>
            <div className="flex items-center gap-2 font-bold text-xl ml-1">
              <span className="size-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                🌍
              </span>
              Ekaya
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell variant="onDark" />
            <LanguageToggle />
            <Button
              asChild
              size="sm"
              className="bg-white text-foreground hover:bg-white/90 font-semibold shadow-lg gap-1.5"
            >
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" />
                {t("dashboard")}
              </Link>
            </Button>
            <Button

              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                void logout().then(() => navigate({ to: "/login", replace: true }));
              }}
            >
              {t("logout")}
            </Button>
          </div>
        </nav>

        {/* Hero copy + selector */}
        <section className="relative z-10 px-6 sm:px-10 pt-8 pb-20 max-w-6xl mx-auto text-white">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 text-sm">
              <Sparkles className="size-3.5" />
              {lang === "pt" ? `Olá, ${user.displayName}` : `Hi, ${user.displayName}`}
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-[1.05]">
              {lang === "pt"
                ? "Explora Moçambique para além da superfície."
                : "Explore Mozambique beyond the surface."}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/85 max-w-2xl">
              {lang === "pt"
                ? "Escolhe o destino, os dias e o tipo de experiência. Nós tratamos do resto."
                : "Pick a destination, your days and the kind of experience you want. We handle the rest."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2 shadow-xl">
                <Link to="/dashboard">
                  <LayoutDashboard className="size-5" />
                  {lang === "pt" ? "Abrir o meu Painel" : "Open my Dashboard"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>


          {/* Quick selector card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 rounded-2xl bg-background/95 backdrop-blur-md text-foreground border border-border shadow-2xl p-5 sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
              {/* Destination */}
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <MapPin className="size-3.5" />
                  {lang === "pt" ? "Destino" : "Destination"}
                </label>
                <Select value={destId} onValueChange={setDestId}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">
                      {lang === "pt" ? "Qualquer destino" : "Any destination"}
                    </SelectItem>
                    {destinations.map((d) => (
                      <SelectItem key={d.id} value={d.slug}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingDestinations && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {lang === "pt" ? "A carregar destinos..." : "Loading destinations..."}
                  </p>
                )}
                {destinationsError && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {lang === "pt"
                      ? "Não foi possível carregar os destinos. Tenta novamente mais tarde."
                      : "We couldn't load the destinations. Please try again later."}
                  </p>
                )}
              </div>

              {/* Days */}
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Calendar className="size-3.5" />
                  {lang === "pt" ? "Quantos dias?" : "How many days?"}
                </label>
                <Select value={days} onValueChange={(v) => setDays(v as DayBucket)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label[lang as Lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="lg"
                onClick={applyFilters}
                className="h-11 gap-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95"
              >
                {lang === "pt" ? "Ver recomendações" : "Show recommendations"}
                <ArrowRight className="size-4" />
              </Button>
            </div>

            {/* Interests pills */}
            <div className="mt-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {lang === "pt" ? "O que procuras?" : "What are you looking for?"}
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => {
                  const active = interests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInterest(opt.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-foreground border-border hover:bg-accent"
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label[lang as Lang]}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </section>
      </div>

      {/* ============ PERSONALISED (from saved preferences) ============ */}
      <PersonalSection lang={lang as Lang} />

      {/* ============ RECOMMENDATIONS ============ */}
      <section id="reco" className="px-6 sm:px-10 py-16 max-w-6xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {lang === "pt" ? "Sugestões para a tua viagem" : "Suggestions for your trip"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {lang === "pt"
                ? "Roteiros, atividades e locais imperdíveis com base nas tuas escolhas."
                : "Itineraries, activities and unmissable places based on your choices."}
            </p>
          </div>
        </div>

        {/* Itineraries */}
        <RecoRow
          title={lang === "pt" ? "Roteiros recomendados" : "Recommended itineraries"}
          link={{ to: "/itineraries", label: lang === "pt" ? "Ver todos" : "View all" }}
        >
          {recoItineraries.map((it, i) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                <div className="relative aspect-[16/10]">
                  <img src={it.image} alt={it.name} className="size-full object-cover" loading="lazy" decoding="async" />
                  <Badge className="absolute top-3 left-3">{it.difficulty}</Badge>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1 text-xs text-warning mb-1.5">
                    <Star className="size-3.5 fill-current" />
                    <span className="font-semibold">{it.rating}</span>
                    <span className="text-muted-foreground">({it.totalReviews})</span>
                  </div>
                  <h3 className="font-semibold leading-tight">{it.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {it.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {it.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {it.stops}{" "}
                      {lang === "pt" ? "paragens" : "stops"}
                    </span>
                    <span className="ml-auto font-semibold text-foreground">${it.cost}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                    <Link to="/itinerary/$id" params={{ id: it.id }}>
                      {lang === "pt" ? "Ver detalhes" : "View details"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </RecoRow>

        {/* Experiences */}
        <RecoRow
          title={lang === "pt" ? "Atividades em destaque" : "Featured activities"}
          link={{ to: "/experiences", label: lang === "pt" ? "Ver todas" : "View all" }}
        >
          {recoExperiences.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                <div className="relative aspect-[16/10]">
                  <img src={e.image} alt={e.title[lang as Lang]} className="size-full object-cover" loading="lazy" decoding="async" />
                  <Badge variant="secondary" className="absolute top-3 left-3 capitalize">
                    {e.category}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold leading-tight">{e.title[lang as Lang]}</h3>
                  <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {e.location}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {e.description[lang as Lang]}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {e.durationHours}h
                    </span>
                    <span className="ml-auto font-semibold text-foreground">
                      {e.priceMzn} MZN
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                    <Link to="/experiences">
                      {lang === "pt" ? "Ver detalhes" : "View details"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {loadingExperiences && (
            <Card className="h-56 animate-pulse bg-muted/40" />
          )}
          {experiencesError && (
            <Card className="p-5 text-sm text-muted-foreground">
              {lang === "pt"
                ? "Não foi possível carregar as experiências agora."
                : "We couldn't load the experiences right now."}
            </Card>
          )}
          {!loadingExperiences && !experiencesError && recoExperiences.length === 0 && (
            <Card className="p-5 text-sm text-muted-foreground">
              {lang === "pt" ? "Ainda não existem experiências disponíveis." : "No experiences available yet."}
            </Card>
          )}
        </RecoRow>

        {/* Story stops */}
        <RecoRow title={lang === "pt" ? "Locais imperdíveis" : "Unmissable places"}>
          {recoStories.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">
                    <Sparkles className="size-3" />
                    Story Stop
                  </div>
                  <h3 className="mt-3 font-semibold leading-tight">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {s.location}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{s.story}</p>
                  <Button asChild size="sm" variant="ghost" className="mt-3 -ml-2">
                    <Link to="/itinerary/$id" params={{ id: s.itineraryId }}>
                      {lang === "pt" ? "Explorar roteiro" : "Explore itinerary"}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </RecoRow>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="bg-muted/40 border-y border-border">
        <div className="px-6 sm:px-10 py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center">
            {lang === "pt" ? "Como funciona" : "How it works"}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Compass,
                title: lang === "pt" ? "Escolhe destino e dias" : "Pick destination and days",
                desc:
                  lang === "pt"
                    ? "Define o que queres viver e por quantos dias."
                    : "Tell us what you want to experience and for how long.",
              },
              {
                icon: Download,
                title: lang === "pt" ? "Descarrega os roteiros" : "Download your routes",
                desc:
                  lang === "pt"
                    ? "Guarda mapas, histórias e dicas no telefone."
                    : "Save maps, stories and tips on your phone.",
              },
              {
                icon: Sparkles,
                title: lang === "pt" ? "Explora e ganha XP" : "Explore and earn XP",
                desc:
                  lang === "pt"
                    ? "Visita locais offline e desbloqueia recompensas."
                    : "Visit places offline and unlock rewards.",
              },
            ].map((step, i) => (
              <Card key={i} className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto size-12 rounded-xl bg-primary/10 text-primary grid place-content-center">
                    <step.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NEWS & UPDATES ============ */}
      <section className="px-6 sm:px-10 py-16 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="size-6 text-primary" />
              {lang === "pt"
                ? "Notícias e atualizações de Moçambique"
                : "News & updates from Mozambique"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "pt"
                ? "Eventos, dicas e alertas para a tua próxima viagem."
                : "Events, tips and alerts for your next trip."}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/news-alerts">
              {lang === "pt" ? "Ver todas" : "View all"}
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_NEWS.slice(0, 3).map((n) => (
            <Card key={n.id} className="h-full flex flex-col p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {newsCategoryLabel(n.category, lang)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.date).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <h3 className="font-bold text-base leading-tight mb-2">{n.title[lang]}</h3>
              <p className="text-sm text-muted-foreground flex-1">{n.summary[lang]}</p>
              <Button asChild variant="link" size="sm" className="self-start mt-3 p-0">
                <Link to="/news-alerts">
                  {lang === "pt" ? "Ler mais →" : "Read more →"}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* ============ OFFLINE + IMPACT ============ */}
      <section className="px-6 sm:px-10 py-16 max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="size-11 rounded-xl bg-secondary text-secondary-foreground grid place-content-center">
              <WifiOff className="size-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              {lang === "pt" ? "Porquê offline-first?" : "Why offline-first?"}
            </h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              {lang === "pt"
                ? "Muitos destinos em Moçambique têm internet limitada. O Ekaya foi pensado para funcionar sem rede — mapas, roteiros, histórias e dicas continuam acessíveis quando mais precisas."
                : "Many destinations in Mozambique have limited internet. Ekaya is built to work offline — maps, routes, stories and tips stay available whenever you need them."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-content-center">
              <Heart className="size-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              {lang === "pt" ? "Impacto nas comunidades" : "Impact on communities"}
            </h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              {lang === "pt"
                ? "Cada experiência reservada liga-te diretamente a pequenos negócios, guias e cooperativas locais. Viajas melhor e a tua viagem deixa um rasto positivo."
                : "Every booked experience connects you directly with local businesses, guides and cooperatives. Travel better — and leave a positive footprint."}
            </p>
            <Button asChild variant="link" className="mt-2 px-0">
              <Link to="/impact">{lang === "pt" ? "Ver o nosso impacto" : "See our impact"}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </div>
  );
}

// ---- Helper row component ----
function RecoRow({
  title,
  link,
  children,
}: {
  title: string;
  link?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        {link && (
          <Button asChild variant="ghost" size="sm">
            <Link to={link.to}>
              {link.label}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

// ---- Personalised recommendations, built from the saved profile preferences ----
function PersonalSection({ lang }: { lang: Lang }) {
  const {
    personalised,
    preferences,
    preferredDestination,
    recommendedExperiences,
    recommendedDestinations,
    loading,
    error,
  } = useRecommendations(4);

  const interestLabel = (id: string) =>
    INTEREST_OPTIONS.find((opt) => opt.id === (id as Interest))?.label[lang] ?? id;

  return (
    <section className="px-6 sm:px-10 pt-14 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight inline-flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          {personalised
            ? lang === "pt"
              ? "Recomendado para ti"
              : "Recommended for you"
            : lang === "pt"
              ? "Explora o que Moçambique tem para oferecer"
              : "Explore what Mozambique has to offer"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {personalised ? (
            <>
              {lang === "pt" ? "Com base " : "Based on "}
              {preferredDestination
                ? `${lang === "pt" ? "no teu destino " : "on your destination "}${preferredDestination.name}`
                : lang === "pt"
                  ? "nas tuas preferências"
                  : "on your preferences"}
              {preferences.interests?.length
                ? ` · ${preferences.interests.map(interestLabel).slice(0, 3).join(", ")}`
                : ""}
              {" · "}
              <Link to="/preferences" className="underline hover:text-foreground">
                {lang === "pt" ? "editar preferências" : "edit preferences"}
              </Link>
            </>
          ) : (
            <>
              {lang === "pt"
                ? "Completa as tuas preferências para receberes sugestões à tua medida."
                : "Complete your preferences to get suggestions tailored to you."}{" "}
              <Link to="/preferences" className="underline hover:text-foreground">
                {lang === "pt" ? "definir preferências" : "set preferences"}
              </Link>
            </>
          )}
        </p>
      </div>

      {loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="mt-6 p-5 text-sm text-muted-foreground">
          {lang === "pt"
            ? "Não foi possível carregar as recomendações agora. Tenta novamente."
            : "We couldn't load the recommendations right now. Please try again."}
        </Card>
      )}

      {!loading && !error && personalised && recommendedExperiences.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedExperiences.map(({ item, reasons, matchesProvince }) => (
            <Card key={item.id} className="overflow-hidden h-full hover:shadow-lg transition-shadow">
              <div className="relative aspect-[16/10]">
                <img
                  src={item.image}
                  alt={item.title[lang]}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <Badge variant="secondary" className="absolute top-3 left-3 capitalize">
                  {item.category}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold leading-tight">{item.title[lang]}</h3>
                <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {item.location}
                </p>
                {(reasons.length > 0 || matchesProvince) && (
                  <p className="mt-2 text-xs text-primary font-medium">
                    {lang === "pt" ? "Combina com " : "Matches "}
                    {reasons.length > 0
                      ? reasons.map(interestLabel).slice(0, 2).join(" e ")
                      : (preferredDestination?.name ?? item.province ?? "")}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {item.durationHours}h
                  </span>
                  <span className="ml-auto font-semibold text-foreground">{item.priceMzn} MZN</span>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link to="/experiences">{lang === "pt" ? "Ver detalhes" : "View details"}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && personalised && recommendedDestinations.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {recommendedDestinations.map(({ item, reasons }) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-[16/9]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold leading-tight">{item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.region[lang]}</p>
                {reasons.length > 0 && (
                  <p className="mt-2 text-xs text-primary font-medium">
                    {lang === "pt" ? "Baseado nos teus interesses" : "Based on your interests"}
                  </p>
                )}
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link to="/map">{lang === "pt" ? "Ver no mapa" : "View on map"}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && personalised && recommendedExperiences.length === 0 && (
        <Card className="mt-6 p-5 text-sm text-muted-foreground">
          {lang === "pt"
            ? "Ainda não há experiências suficientes para recomendar. Explora tudo o que existe abaixo."
            : "There aren't enough experiences to recommend yet. Explore everything below."}
        </Card>
      )}
    </section>
  );
}
