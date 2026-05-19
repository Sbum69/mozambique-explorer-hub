import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowLeft, Compass, Clock, Star, MapPin, Users, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { EXPERIENCES, type Experience, type ExperienceCategory } from "@/data/experiences";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Experiências — Ekaya Explore" },
      { name: "description", content: "Reserva experiências comunitárias autênticas em Moçambique." },
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
  const { addXP } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ExperienceCategory | "all">("all");
  const [booked, setBooked] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => (filter === "all" ? EXPERIENCES : EXPERIENCES.filter((e) => e.category === filter)),
    [filter],
  );

  const handleBook = (exp: Experience) => {
    if (booked.has(exp.id)) return;
    setBooked((s) => new Set(s).add(exp.id));
    const result = addXP(50);
    toast.success(t("bookingConfirmed"), {
      description: `${exp.title[lang]} — +50 XP`,
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
          <button onClick={() => navigate({ to: "/dashboard" })} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <ArrowLeft className="size-4" /> {t("backToDashboard")}
          </button>
          <LanguageToggle />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Compass className="size-8 text-primary" /> {t("expTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("expSub")}</p>
        </motion.div>

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
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-gradient-to-r from-warning to-primary text-white border-0">
                        {CATEGORIES.find((c) => c.id === exp.category)?.emoji}{" "}
                        {lang === "pt"
                          ? CATEGORIES.find((c) => c.id === exp.category)?.labelPt
                          : CATEGORIES.find((c) => c.id === exp.category)?.labelEn}
                      </Badge>
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
                        onClick={() => handleBook(exp)}
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
    </div>
  );
}
