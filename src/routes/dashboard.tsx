import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Map, BookOpen, Bookmark, Bell, Compass, Heart, Info, Trophy, Activity,
  MapPin, Sun, ArrowRight, Store,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLang, type DictKey } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useDestinations } from "@/hooks/useDestinations";
import { useRouteCatalogue } from "@/hooks/useRoutes";

import { requireAuthenticatedUser } from "@/lib/auth";


export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — Ekaya Explore" },
      { name: "description", content: "Hub central com mapa, roteiros, experiências, gamificação e impacto." },
      { property: "og:title", content: "Painel — Ekaya Explore" },
      { property: "og:description", content: "Hub central com mapa, roteiros, experiências, gamificação e impacto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: DashboardPage,
});

interface ModuleDef {
  to: string;
  icon: LucideIcon;
  titleKey: DictKey;
  descKey: DictKey;
  gradient: string;
}

const MODULES: ModuleDef[] = [
  { to: "/map", icon: Map, titleKey: "modMap", descKey: "modMapDesc", gradient: "from-secondary to-blue-400" },
  { to: "/culture-history", icon: BookOpen, titleKey: "modCulture", descKey: "modCultureDesc", gradient: "from-orange-500 to-red-500" },
  { to: "/favorites", icon: Bookmark, titleKey: "modFavorites", descKey: "modFavoritesDesc", gradient: "from-pink-500 to-rose-500" },
  { to: "/news-alerts", icon: Bell, titleKey: "modNews", descKey: "modNewsDesc", gradient: "from-red-500 to-orange-500" },
  { to: "/itineraries", icon: Compass, titleKey: "modItineraries", descKey: "modItinerariesDesc", gradient: "from-primary to-primary-glow" },
  { to: "/businesses", icon: Store, titleKey: "modBusinesses", descKey: "modBusinessesDesc", gradient: "from-amber-500 to-orange-500" },
  { to: "/experiences", icon: Heart, titleKey: "modExperiences", descKey: "modExperiencesDesc", gradient: "from-success to-emerald-400" },
  { to: "/useful-info", icon: Info, titleKey: "modInfo", descKey: "modInfoDesc", gradient: "from-purple-500 to-violet-500" },
  { to: "/gamification", icon: Trophy, titleKey: "modAchievements", descKey: "modAchievementsDesc", gradient: "from-warning to-yellow-500" },
  { to: "/impact", icon: Activity, titleKey: "modImpact", descKey: "modImpactDesc", gradient: "from-pink-500 to-fuchsia-500" },
];

function DashboardPage() {
  const { user, logout, needsOnboarding } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [showChangeDest, setShowChangeDest] = useState(false);
  const { destinations } = useDestinations();
  const { publicRoutes } = useRouteCatalogue(null);


  if (!user) return null;

  const province = destinations.find((d) => d.slug === user.preferences?.province);
  const xpToNext = (user.level + 1) * 1000;
  const xpProgress = Math.min(100, (user.xp / xpToNext) * 100);

  // Official itinerary of the chosen province, read from the database (no mock data).
  const recommendedItinerary = province
    ? publicRoutes.find((r) => r.province?.code === province.province) ?? null
    : null;
  const tripDays = user.preferences?.durationDays ?? 3;
  const daySlices = recommendedItinerary
    ? recommendedItinerary.days.slice(0, Math.min(tripDays, recommendedItinerary.days.length)).map((day) => ({
        day: day.dayNumber,
        title: day.title,
        stops: day.stops,
      }))
    : [];



  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <Link to="/home" className="flex items-center gap-2 font-bold text-lg ml-1">
              <span className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground">
                🌍
              </span>
              Ekaya
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <LanguageToggle />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
              <span className="size-7 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center text-xs font-bold">
                {user.displayName.charAt(0)}
              </span>
              <span className="font-medium">{user.displayName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { void logout().then(() => navigate({ to: "/login", replace: true })); }}>
              {t("logout")}
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Greeting card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-elegant)] bg-gradient-to-br from-primary via-primary-glow to-secondary text-primary-foreground p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-sm opacity-90">{t("hello")},</p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{user.displayName} 👋</h1>
                {province ? (
                  <>
                    <p className="mt-2 text-sm opacity-90">
                      {lang === "pt" ? "A explorar" : "Exploring"} <strong>{province.name}</strong> · {tripDays} {t("days")}
                      {user.preferences?.interests?.length ? ` · ${user.preferences.interests.slice(0, 3).join(", ")}` : ""}
                    </p>
                    <button
                      onClick={() => setShowChangeDest(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 rounded-full transition-colors"
                    >
                      <MapPin className="size-3.5" /> {lang === "pt" ? "Mudar destino" : "Change destination"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowChangeDest(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 rounded-full transition-colors"
                  >
                    <MapPin className="size-3.5" /> {lang === "pt" ? "Escolher destino" : "Choose destination"}
                  </button>
                )}

              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat label={t("level")} value={user.level} />
                <Stat label={t("visited")} value={user.visitedPlaces} />
                <Stat label={t("km")} value={user.kmExplored} />
              </div>
            </div>
            {user.role !== "guest" && (
              <div className="mt-6">
                <div className="flex justify-between text-xs mb-2 opacity-90">
                  <span>{t("xp")}: {user.xp}</span>
                  <span>{xpToNext}</span>
                </div>
                <Progress value={xpProgress} className="h-2 bg-white/20" />
              </div>
            )}
          </Card>
        </motion.div>

        {/* Personalized itinerary */}
        {recommendedItinerary && province && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8"
          >
            <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {lang === "pt" ? "O Teu Itinerário" : "Your Itinerary"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {lang === "pt"
                    ? `Itinerário para ${tripDays} dias em ${province.name}`
                    : `Itinerary for ${tripDays} days in ${province.name}`}
                  {user.preferences?.interests?.length
                    ? `${lang === "pt" ? " · baseado em " : " · based on "}${user.preferences.interests.slice(0, 3).join(", ")}`
                    : ""}
                </p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/itineraries">
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
                      <div className="size-10 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-bold flex items-center justify-center shadow-md shrink-0">
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
                            <Sun className="size-4 text-amber-500 mt-0.5 shrink-0" />
                          ) : (
                            <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
                          )}
                          <span>{stop.title}</span>
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
              whileHover={{ y: -4 }}
            >
              <Link to={m.to as never}>
                <Card className="group relative overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300 cursor-pointer h-full p-6 bg-card">
                  <div className={`size-12 rounded-xl bg-gradient-to-br ${m.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <m.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg">{t(m.titleKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(m.descKey)}</p>
                  <span className="mt-3 inline-block text-xs text-muted-foreground">
                    {lang === "pt" ? "Em desenvolvimento" : "In development"}
                  </span>
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
    </div>

  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2 min-w-[70px]">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
