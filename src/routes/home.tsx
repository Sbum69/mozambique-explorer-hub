import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Heart, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { OnboardingModal } from "@/components/OnboardingModal";

import hero from "@/assets/hero-mozambique.jpg";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Início — Ekaya Explore" },
      { name: "description", content: "Bem-vindo ao hub de turismo comunitário de Moçambique." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ekaya.auth.user")) {
      throw redirect({ to: "/login" });
    }
  },
  component: HomePage,
});

function HomePage() {
  const { user, needsOnboarding, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (needsOnboarding) setShowOnboarding(true);
  }, [needsOnboarding]);

  if (!user) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero background */}
      <div className="absolute inset-0">
        <img src={hero} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/40 to-background" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 text-white">
        <div className="flex items-center gap-2 font-bold text-xl">
          <span className="size-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            🌍
          </span>
          Ekaya Explore
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" onClick={() => { logout(); navigate({ to: "/login" }); }}>
            {t("logout")}
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 sm:px-10 pt-12 pb-32 max-w-6xl mx-auto text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 text-sm">
            <Sparkles className="size-3.5" />
            {t("hello")}, {user.displayName}
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight max-w-3xl leading-[1.05]">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-2xl">{t("heroSub")}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-7 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95 gap-2">
              <Link to="/dashboard">
                {t("exploreProto")} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Quick stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-xl">
            {[
              { icon: MapPin, label: t("visited"), value: user.visitedPlaces },
              { icon: Sparkles, label: t("xp"), value: user.xp },
              { icon: Heart, label: t("itineraries"), value: user.completedItineraries },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4"
              >
                <s.icon className="size-5 text-warning mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/70">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </div>
  );
}
