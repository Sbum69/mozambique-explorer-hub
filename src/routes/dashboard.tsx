import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { motion } from "framer-motion";
import {
  Map,
  BookOpen,
  Bookmark,
  Bell,
  Compass,
  Heart,
  Info,
  Trophy,
  Activity,
  MapPin,
  Sun,
  ArrowRight,
  Store,
  Users as UsersIcon,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { PointsCard } from "@/components/PointsCard";
import { useLang, type DictKey } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useDestinations } from "@/hooks/useDestinations";
import { useRouteCatalogue } from "@/hooks/useRoutes";
import { usePersonalPrefs } from "@/hooks/usePersonalPrefs";
import { dayTitle, personalizeRoutes, routeTitle, stopTitle } from "@/lib/routes";
import { fetchMyVisits } from "@/lib/visits";

import { requireTravellerPanel } from "@/lib/auth";
import { useGuide } from "@/hooks/useGuide";
import { GUIDE_STEPS } from "@/lib/guide";

// Loaded only when the guide opens.
const OnboardingGuide = lazy(() => import("@/components/OnboardingGuide"));

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — EKAYA" },
      {
        name: "description",
        content: "Hub central com mapa, roteiros, experiências, gamificação e impacto.",
      },
      { property: "og:title", content: "Painel — EKAYA" },
      {
        property: "og:description",
        content: "Hub central com mapa, roteiros, experiências, gamificação e impacto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireTravellerPanel,
  component: DashboardPage,
});

interface ModuleDef {
  to: string;
  icon: LucideIcon;
  titleKey: DictKey;
  descKey: DictKey;
  /** Only for a module whose page does not exist yet; every module below links to a live page. */
  inDevelopment?: boolean;
}

const MODULES: ModuleDef[] = [
  {
    to: "/map",
    icon: Map,
    titleKey: "modMap",
    descKey: "modMapDesc",
  },
  {
    to: "/culture-history",
    icon: BookOpen,
    titleKey: "modCulture",
    descKey: "modCultureDesc",
  },
  {
    to: "/favorites",
    icon: Bookmark,
    titleKey: "modFavorites",
    descKey: "modFavoritesDesc",
  },
  {
    to: "/news-alerts",
    icon: Bell,
    titleKey: "modNews",
    descKey: "modNewsDesc",
  },
  {
    to: "/itineraries",
    icon: Compass,
    titleKey: "modItineraries",
    descKey: "modItinerariesDesc",
  },
  {
    to: "/community-experiences",
    icon: UsersIcon,
    titleKey: "modCommunityExp",
    descKey: "modCommunityExpDesc",
  },
  {
    to: "/businesses",
    icon: Store,
    titleKey: "modBusinesses",
    descKey: "modBusinessesDesc",
  },
  {
    to: "/experiences",
    icon: Heart,
    titleKey: "modExperiences",
    descKey: "modExperiencesDesc",
  },
  {
    to: "/useful-info",
    icon: Info,
    titleKey: "modInfo",
    descKey: "modInfoDesc",
  },
  {
    to: "/gamification",
    icon: Trophy,
    titleKey: "modAchievements",
    descKey: "modAchievementsDesc",
  },
  {
    to: "/games",
    icon: Gamepad2,
    titleKey: "modGames",
    descKey: "modGamesDesc",
  },
  {
    to: "/impact",
    icon: Activity,
    titleKey: "modImpact",
    descKey: "modImpactDesc",
  },
];

/** Modules the guide points at. */
const GUIDE_TARGET_BY_MODULE: Record<string, string | undefined> = {
  "/itineraries": "routes",
  "/experiences": "book",
};

function DashboardPage() {
  const { user, authUser, needsOnboarding } = useAuth();
  const { t, lang } = useLang();
  // First-entry guide: after the onboarding (preferences) is done.
  const guide = useGuide("tourist", { enabled: !!user && !needsOnboarding, lang });
  const [showChangeDest, setShowChangeDest] = useState(false);
  const { destinations } = useDestinations();
  const { publicRoutes } = useRouteCatalogue(null);
  const personalPrefs = usePersonalPrefs();
  const userId = authUser?.id ?? null;
  // Visited count comes from destination_visits (RLS: own rows only), keyed by user identity.
  const visits = useQuery({
    queryKey: ["destination-visits", userId],
    queryFn: () => fetchMyVisits(userId as string),
    enabled: !!userId,
  });
  const visitedValue = visits.isError ? "—" : visits.data ? visits.data.size : "…";

  // While the account loads: the real header (it does not depend on the user) and placeholders with
  // the size of the cards, so the page paints right after the JavaScript (PERF-4).
  if (!user)
    return (
      <div className="min-h-screen bg-background" aria-busy="true">
        <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <AppSidebar />
              <Link to="/home" className="flex min-w-0 items-center ml-1 h-8">
                <BrandLogo mark className="h-8 min-[375px]:hidden" />
                <BrandLogo className="hidden h-5 min-[375px]:block" />
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <Skeleton className="h-44 w-full rounded-[10px]" />
          <Skeleton className="h-96 sm:h-64 w-full rounded-[10px]" />
        </main>
      </div>
    );

  const province = destinations.find((d) => d.slug === user.preferences?.province);

  // Official itinerary of the chosen province, read from the database (no mock data).
  const personalized = personalPrefs.hasPrefs
    ? personalizeRoutes(publicRoutes, personalPrefs)
    : null;
  const recommendedItinerary = personalized
    ? (personalized.exact[0] ??
      personalized.otherDuration[0] ??
      personalized.otherInProvince[0] ??
      null)
    : null;
  const tripDays = user.preferences?.durationDays ?? 3;
  const daySlices = recommendedItinerary
    ? recommendedItinerary.days
        .slice(0, Math.min(tripDays, recommendedItinerary.days.length))
        .map((day) => ({
          day: day.dayNumber,
          title: dayTitle(day, lang),
          stops: day.stops,
        }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <AppSidebar />
            <Link to="/home" className="flex min-w-0 items-center ml-1 h-8">
              <BrandLogo mark className="h-8 min-[375px]:hidden" />
              <BrandLogo className="hidden h-5 min-[375px]:block" />
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsBell />
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Greeting card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-soft)] p-6 sm:p-8 pt-8 sm:pt-10">
            <div className="capulana-band absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-primary">
                  {t("hello")}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {user.displayName}
                </h1>
                {province ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {lang === "pt" ? "A explorar" : "Exploring"} <strong>{province.name}</strong>{" "}
                      · {tripDays} {t("days")}
                      {user.preferences?.interests?.length
                        ? ` · ${user.preferences.interests.slice(0, 3).join(", ")}`
                        : ""}
                    </p>
                    <button
                      data-guide="prefs"
                      onClick={() => setShowChangeDest(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary border border-input hover:bg-accent px-3 py-1.5 rounded-md transition-colors"
                    >
                      <MapPin className="size-3.5" />{" "}
                      {lang === "pt" ? "Mudar destino" : "Change destination"}
                    </button>
                  </>
                ) : (
                  <button
                    data-guide="prefs"
                    onClick={() => setShowChangeDest(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary border border-input hover:bg-accent px-3 py-1.5 rounded-md transition-colors"
                  >
                    <MapPin className="size-3.5" />{" "}
                    {lang === "pt" ? "Escolher destino" : "Choose destination"}
                  </button>
                )}
              </div>

              <div className="grid gap-4 text-center">
                <Stat label={t("visited")} value={visitedValue} />
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="mt-8" data-guide="points">
          <PointsCard />
        </div>

        {/* Personalized itinerary */}
        {!recommendedItinerary && (
          <Card
            data-guide="reco"
            className="mt-8 p-5 flex flex-wrap items-center justify-between gap-3 border-0 shadow-[var(--shadow-soft)]"
          >
            <p className="text-sm text-muted-foreground">
              {!personalPrefs.hasPrefs
                ? lang === "pt"
                  ? "Configura as tuas preferências para veres roteiros para ti."
                  : "Set your preferences to see itineraries for you."
                : lang === "pt"
                  ? "Ainda não existem roteiros para a tua província. Vê sugestões noutras regiões."
                  : "No itineraries for your province yet. See suggestions in other regions."}
            </p>
            <Button asChild variant="outline" className="gap-2">
              {personalPrefs.hasPrefs ? (
                <Link to="/itineraries" search={{ personal: true }}>
                  {lang === "pt" ? "Ver completo" : "View full"} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Link to="/preferences">
                  {lang === "pt" ? "Configurar preferências" : "Set preferences"}{" "}
                  <ArrowRight className="size-4" />
                </Link>
              )}
            </Button>
          </Card>
        )}
        {recommendedItinerary && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8"
            data-guide="reco"
          >
            <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {lang === "pt" ? "O Teu Itinerário" : "Your Itinerary"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {lang === "pt"
                    ? `${routeTitle(recommendedItinerary, lang)} · ${recommendedItinerary.durationDays} dias · ${recommendedItinerary.province?.name.pt ?? ""}`
                    : `${routeTitle(recommendedItinerary, lang)} · ${recommendedItinerary.durationDays} days · ${recommendedItinerary.province?.name.en ?? ""}`}
                  {user.preferences?.interests?.length
                    ? `${lang === "pt" ? " · baseado em " : " · based on "}${user.preferences.interests.slice(0, 3).join(", ")}`
                    : ""}
                </p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/itineraries" search={{ personal: true }}>
                  {lang === "pt" ? "Ver completo" : "View full"} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <Card className="p-5 sm:p-6 border-0 shadow-[var(--shadow-soft)]">
              <div className="space-y-4">
                {daySlices.map((d, i) => (
                  <motion.div
                    key={d.day}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4 relative"
                  >
                    <div className="flex flex-col items-center">
                      <div className="size-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0">
                        {d.day}
                      </div>
                      {i < daySlices.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 pb-4 space-y-1.5">
                      <p className="text-sm font-semibold">
                        {lang === "pt" ? "Dia" : "Day"} {d.day}
                        {d.title ? ` — ${d.title}` : ""}
                      </p>

                      {d.stops.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {lang === "pt" ? "Sem paragens definidas." : "No stops defined."}
                        </p>
                      )}
                      {d.stops.map((stop) => (
                        <div key={stop.id} className="flex items-start gap-2 text-sm">
                          {stop.kind === "experience" ? (
                            <Sun className="size-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                          ) : (
                            <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
                          )}
                          <span>{stopTitle(stop, lang)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.section>
        )}

        {/* Modules grid */}
        <h2 className="mt-10 mb-5 text-2xl font-bold tracking-tight">{t("modules")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={m.to as never} data-guide={GUIDE_TARGET_BY_MODULE[m.to]}>
                <Card className="group relative overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300 cursor-pointer h-full p-6 bg-card">
                  <div className="size-11 rounded-md bg-accent text-accent-foreground flex items-center justify-center">
                    <m.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg">{t(m.titleKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(m.descKey)}</p>
                  {m.inDevelopment && (
                    <span className="mt-3 inline-block text-xs text-muted-foreground">
                      {lang === "pt" ? "Em desenvolvimento" : "In development"}
                    </span>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      <OnboardingModal
        open={showChangeDest || needsOnboarding}
        onComplete={() => setShowChangeDest(false)}
      />
      {guide.open && (
        <Suspense fallback={null}>
          <OnboardingGuide steps={GUIDE_STEPS.tourist} lang={lang} onClose={guide.close} />
        </Suspense>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border px-4 py-2 min-w-[70px]">
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
