import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
import { interestIcon } from "@/lib/interest-icons";
import { BrandMark } from "@/components/BrandMark";
import { PhotoCredit } from "@/components/PhotoCredit";
import { PHOTOS_TXT } from "@/lib/page-texts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyChoiceSelect } from "@/components/LazyChoiceSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useLang, type Lang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";

import { useDestinations } from "@/hooks/useDestinations";
import { type ExperienceCategory } from "@/lib/experiences";
import { useExperiences } from "@/hooks/useExperiences";
import { useRecommendations } from "@/hooks/useRecommendations";
import {
  CommunityExperienceCard,
  CommunityExperienceDialog,
} from "@/components/CommunityExperienceCard";
import type { CommunityExperience } from "@/lib/community-experiences";
import { useRouteCatalogue } from "@/hooks/useRoutes";
import {
  routeCover,
  routeDescription,
  routePriceMzn,
  routeStopCount,
  routeTitle,
} from "@/lib/routes";
import { SAMPLE_ITINERARIES } from "@/data/itineraries";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLiveNews } from "@/lib/news.functions";

import { HERO_AVIF_SRCSET, HERO_PHOTO, HeroImage } from "@/components/HeroImage";

// Same colours as NotificationsBell variant="onDark": the top bar sits on the dark hero photo.
const ON_HERO = "text-white hover:bg-white/10 hover:text-white";

const OnboardingModal = lazy(() =>
  import("@/components/OnboardingModal").then((m) => ({ default: m.OnboardingModal })),
);
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
      {
        property: "og:description",
        content:
          "Escolhe destino, dias e tipo de experiência. Ekaya recomenda roteiros, atividades e locais únicos em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    // The hero photo is the largest element: start fetching it with the HTML, not after the JS.
    links: [
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        imageSrcSet: HERO_AVIF_SRCSET,
        imageSizes: "100vw",
        fetchPriority: "high",
      },
    ],
  }),
  component: HomePage,
});

// ---- Filter model ----
type DayBucket = "1" | "2-3" | "4-7" | "7+";
type Interest = ExperienceCategory | "heritage";

const INTEREST_OPTIONS: { id: Interest; label: { pt: string; en: string } }[] = [
  { id: "beach", label: { pt: "Praias e natureza", en: "Beaches & nature" } },
  { id: "culture", label: { pt: "Cultura e história", en: "Culture & history" } },
  {
    id: "community",
    label: { pt: "Experiências comunitárias", en: "Community experiences" },
  },
  { id: "food", label: { pt: "Gastronomia", en: "Food & cuisine" } },
  { id: "nature", label: { pt: "Vida selvagem / safaris", en: "Wildlife & safaris" } },
  { id: "adventure", label: { pt: "Aventura", en: "Adventure" } },
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

/** Legacy sample stories: not validated yet, so not shown (decision I18N-2). */
const SHOW_STORY_STOPS = false;

// Story Stops extracted from itineraries
const STORY_STOPS = SAMPLE_ITINERARIES.flatMap((it) =>
  it.route
    .filter((s) => s.type === "story")
    .map((s) => ({
      id: `${it.id}-${s.id}`,
      routeId: it.routeId,
      title: { pt: s.title ?? "", en: s.titleEn ?? s.title ?? "" },
      location: { pt: s.location ?? "", en: s.locationEn ?? s.location ?? "" },
      story: { pt: s.story ?? "", en: s.storyEn ?? s.story ?? "" },
    })),
);

function HomePage() {
  const { user, needsOnboarding, isGuest: guestRole, isAuthenticated } = useAuth();
  const isGuest = guestRole || !isAuthenticated;
  const { t, lang } = useLang();

  const [showOnboarding, setShowOnboarding] = useState(false);
  // Loaded only for accounts that still need it; kept mounted once opened so it can animate closed.
  const [onboardingMounted, setOnboardingMounted] = useState(false);
  useEffect(() => {
    if (showOnboarding) setOnboardingMounted(true);
  }, [showOnboarding]);
  const {
    destinations,
    loading: loadingDestinations,
    error: destinationsError,
  } = useDestinations();
  const { experiences, loading: loadingExperiences, error: experiencesError } = useExperiences();
  const { publicRoutes } = useRouteCatalogue(null);
  const [destId, setDestId] = useState<string>("any");
  const [days, setDays] = useState<DayBucket>("2-3");
  const [interests, setInterests] = useState<Interest[]>(["beach", "community"]);
  const [applied, setApplied] = useState({
    destId: "any",
    days: "2-3" as DayBucket,
    interests: ["beach", "community"] as Interest[],
  });

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
    return publicRoutes.filter((r) => r.durationDays <= maxDays + 1).slice(0, 4);
  }, [maxDays, publicRoutes]);

  const recoExperiences = useMemo(() => {
    const pool = experiences.filter((e) => {
      const matchDest = applied.destId === "any" || e.destinationId === applied.destId;
      const matchInt =
        applied.interests.length === 0 || applied.interests.includes(e.category as Interest);
      return matchDest && matchInt;
    });
    return (pool.length ? pool : experiences).slice(0, 4);
  }, [applied, experiences]);

  const recoStories = STORY_STOPS.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <HeroImage alt="" className="size-full object-cover" priority />
          {/* Fixed dark overlay (not a theme token) so the white hero text always reads, in both themes. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-background" />
          <PhotoCredit photo={HERO_PHOTO} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between gap-2 px-4 sm:px-10 py-5 text-white">
          <div className="flex min-w-0 items-center gap-1">
            <div className="text-white">
              <AppSidebar />
            </div>
            <div className="flex min-w-0 items-center gap-2 font-bold text-xl ml-1">
              <BrandMark className="size-9" />
              <span className="sr-only min-[390px]:not-sr-only truncate">Ekaya</span>
            </div>
          </div>
          {/* Phones: tighter spacing, logo without the wordmark below 390px; the second action stays in the side menu. */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsBell variant="onDark" />
            <ThemeToggle className={ON_HERO} />
            <LanguageToggle className={ON_HERO} />
            <UserMenu />
            {isGuest ? (
              <>
                <Button
                  asChild
                  size="sm"
                  className="bg-card text-foreground hover:bg-card/90 font-semibold shadow-lg gap-1.5"
                >
                  <Link to="/login">{lang === "pt" ? "Entrar" : "Sign in"}</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/signup">{lang === "pt" ? "Criar conta" : "Create account"}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  size="sm"
                  className="bg-card text-foreground hover:bg-card/90 font-semibold shadow-lg gap-1.5"
                >
                  <Link to="/dashboard">
                    <LayoutDashboard className="size-4" />
                    <span className="sr-only sm:not-sr-only">{t("dashboard")}</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Hero copy + selector */}
        <section className="relative z-10 px-6 sm:px-10 pt-8 pb-20 max-w-6xl mx-auto text-white">
          {/* Largest element of the page: shown at once (no entrance fade) so it paints with the first render. */}
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 text-sm">
              <Sparkles className="size-3.5" />
              {lang === "pt"
                ? `Olá, ${user?.displayName ?? "Convidado"}`
                : `Hi, ${user?.displayName ?? "Guest"}`}
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
            className="mt-8 rounded-[10px] bg-card text-card-foreground border border-border shadow-[var(--shadow-overlay)] p-5 sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
              {/* Destination */}
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <MapPin className="size-3.5" />
                  {lang === "pt" ? "Destino" : "Destination"}
                </label>
                <LazyChoiceSelect
                  value={destId}
                  onValueChange={setDestId}
                  className="h-11"
                  options={[
                    { value: "any", label: lang === "pt" ? "Qualquer destino" : "Any destination" },
                    ...destinations.map((d) => ({ value: d.slug, label: d.name })),
                  ]}
                />
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
                <LazyChoiceSelect
                  value={days}
                  onValueChange={(v) => setDays(v as DayBucket)}
                  className="h-11"
                  options={DAY_OPTIONS.map((d) => ({ value: d.id, label: d.label[lang as Lang] }))}
                />
              </div>

              <Button size="lg" onClick={applyFilters} className="h-11 gap-2">
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
                  const InterestIcon = interestIcon(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInterest(opt.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-input hover:bg-accent"
                      }`}
                    >
                      <InterestIcon className="size-4" aria-hidden="true" />
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
                  <img
                    src={routeCover(it)}
                    alt={routeTitle(it, lang)}
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <PhotoCredit src={routeCover(it)} label={PHOTOS_TXT[lang].provinceImage} />
                  {it.province && (
                    <Badge className="absolute top-3 left-3">{it.province.name[lang]}</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-1.5">{it.code}</p>
                  <h3 className="font-semibold leading-tight">{routeTitle(it, lang)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {routeDescription(it, lang)}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {it.durationDays}{" "}
                      {lang === "pt" ? "dias" : "days"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {routeStopCount(it)}{" "}
                      {lang === "pt" ? "paragens" : "stops"}
                    </span>
                    {routePriceMzn(it) > 0 && (
                      <span className="ml-auto font-semibold text-foreground">
                        {routePriceMzn(it).toLocaleString("pt-MZ")} MZN
                      </span>
                    )}
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
                  <img
                    src={e.image}
                    alt={e.title[lang as Lang]}
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <PhotoCredit src={e.image} />
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
                    <span className="ml-auto font-semibold text-foreground">{e.priceMzn} MZN</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                    <Link to="/experiences">{lang === "pt" ? "Ver detalhes" : "View details"}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {loadingExperiences && <Card className="h-56 animate-pulse bg-muted/40" />}
          {experiencesError && (
            <Card className="p-5 text-sm text-muted-foreground">
              {lang === "pt"
                ? "Não foi possível carregar as experiências agora."
                : "We couldn't load the experiences right now."}
            </Card>
          )}
          {!loadingExperiences && !experiencesError && recoExperiences.length === 0 && (
            <Card className="p-5 text-sm text-muted-foreground">
              {lang === "pt"
                ? "Ainda não existem experiências disponíveis."
                : "No experiences available yet."}
            </Card>
          )}
        </RecoRow>

        {/* Story stops: hidden until the legends are validated (translations stay in src/data). */}
        {SHOW_STORY_STOPS && (
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
                    <h3 className="mt-3 font-semibold leading-tight">{s.title[lang]}</h3>
                    <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {s.location[lang]}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                      {s.story[lang]}
                    </p>
                    {/* Only stories whose itinerary exists in the database link to it. */}
                    {s.routeId && (
                      <Button asChild size="sm" variant="ghost" className="mt-3 -ml-2">
                        <Link to="/itinerary/$id" params={{ id: s.routeId }}>
                          {lang === "pt" ? "Explorar roteiro" : "Explore itinerary"}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </RecoRow>
        )}
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
                title: lang === "pt" ? "Explora e ganha pontos" : "Explore and earn points",
                desc:
                  lang === "pt"
                    ? "Conclui atividades e roteiros com prova para subir de nível."
                    : "Complete activities and proven routes to level up.",
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
                ? "Últimas notícias sobre Moçambique · Fonte: Google News"
                : "Latest news about Mozambique · Source: Google News"}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/news-alerts">
              {lang === "pt" ? "Ver todas" : "View all"}
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <HomeLiveNews lang={lang} />
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

      {onboardingMounted && (
        <Suspense fallback={null}>
          <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      )}
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
    recommendedCommunity,
    loading,
    error,
  } = useRecommendations(4);
  const [openCommunity, setOpenCommunity] = useState<CommunityExperience | null>(null);

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
            <Card
              key={item.id}
              className="overflow-hidden h-full hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[16/10]">
                <img
                  src={item.image}
                  alt={item.title[lang]}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <PhotoCredit src={item.image} />
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
                <PhotoCredit src={item.image} />
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

      {!loading && !error && personalised && recommendedCommunity.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">
              {lang === "pt" ? "Grátis e sem reserva" : "Free, no booking"}
            </h3>
            <Link to="/community-experiences" className="text-sm text-primary hover:underline">
              {lang === "pt" ? "Ver todas" : "See all"}
            </Link>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedCommunity.map(({ item }) => (
              <CommunityExperienceCard
                key={item.id}
                item={item}
                onOpen={() => setOpenCommunity(item)}
              />
            ))}
          </div>
          <CommunityExperienceDialog item={openCommunity} onClose={() => setOpenCommunity(null)} />
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

/** The 3 latest headlines of the same live feed as /news-alerts (Google News RSS, cached on the server). */
function HomeLiveNews({ lang }: { lang: Lang }) {
  const pt = lang === "pt";
  const fetchNews = useServerFn(getLiveNews);
  const q = useQuery({
    queryKey: ["live-news", lang],
    queryFn: () => fetchNews({ data: { lang } }),
    staleTime: 10 * 60 * 1000,
  });
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(pt ? "pt-PT" : "en-GB", { day: "2-digit", month: "short" });

  if (q.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((k) => (
          <div key={k} className="h-40 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
    );
  }
  const items = q.data?.status === "ok" ? q.data.items.slice(0, 3) : [];
  if (!items.length) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"
      >
        {pt
          ? "Não foi possível carregar as notícias agora. Tenta novamente mais tarde."
          : "Couldn't load the news right now. Please try again later."}
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((n) => (
        <Card
          key={n.link}
          className="h-full flex flex-col p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge variant="secondary" className="text-[10px] uppercase truncate max-w-[60%]">
              {n.source}
            </Badge>
            <span className="text-xs text-muted-foreground">{fmt(n.pubDate)}</span>
          </div>
          <h3 className="font-bold text-base leading-tight mb-2 flex-1 line-clamp-4">{n.title}</h3>
          <Button asChild variant="link" size="sm" className="self-start mt-3 p-0">
            <a href={n.link} target="_blank" rel="noopener noreferrer">
              {pt ? "Ler notícia →" : "Read story →"}
              <span className="sr-only">
                {pt ? " (abre noutra janela)" : " (opens in a new window)"}
              </span>
            </a>
          </Button>
        </Card>
      ))}
    </div>
  );
}
