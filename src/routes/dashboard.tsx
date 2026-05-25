import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Map, BookOpen, Bookmark, Bell, Compass, Heart, Info, Trophy, Activity,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLang, type DictKey } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { DESTINATIONS } from "@/data/destinations";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — Ekaya Explore" },
      { name: "description", content: "Hub central com mapa, roteiros, experiências, gamificação e impacto." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ekaya.auth.user")) {
      throw redirect({ to: "/login" });
    }
  },
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
  { to: "/experiences", icon: Heart, titleKey: "modExperiences", descKey: "modExperiencesDesc", gradient: "from-success to-emerald-400" },
  { to: "/useful-info", icon: Info, titleKey: "modInfo", descKey: "modInfoDesc", gradient: "from-purple-500 to-violet-500" },
  { to: "/gamification", icon: Trophy, titleKey: "modAchievements", descKey: "modAchievementsDesc", gradient: "from-warning to-yellow-500" },
  { to: "/impact", icon: Activity, titleKey: "modImpact", descKey: "modImpactDesc", gradient: "from-pink-500 to-fuchsia-500" },
];

function DashboardPage() {
  const { user, logout } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  if (!user) return null;

  const province = DESTINATIONS.find((d) => d.id === user.preferences?.province);
  const xpToNext = (user.level + 1) * 1000;
  const xpProgress = Math.min(100, (user.xp / xpToNext) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 font-bold text-lg">
            <span className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground">
              🌍
            </span>
            Ekaya
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
              <span className="size-7 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center text-xs font-bold">
                {user.displayName.charAt(0)}
              </span>
              <span className="font-medium">{user.displayName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate({ to: "/login" }); }}>
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
                {province && (
                  <p className="mt-2 text-sm opacity-90">
                    📍 {province.name} · {user.preferences?.durationDays} {t("days")}
                  </p>
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
