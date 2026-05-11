import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, lazy, Suspense } from "react";
import { ArrowLeft, MapPin, Users, Award, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { DESTINATIONS, type Destination } from "@/data/destinations";

// Leaflet must be client-only (uses window)
const InteractiveMap = lazy(() =>
  import("@/components/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Mapa Interativo — Ekaya Explore" },
      { name: "description", content: "Mapa interativo de Moçambique com destinos comunitários autênticos." },
    ],
  }),
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ekaya.auth.user")) {
      throw redirect({ to: "/login" });
    }
  },
  component: MapPage,
});

function MapPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Destination | null>(DESTINATIONS[0]);

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <MapPin className="size-8 text-primary" /> {t("mapTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("mapSub")}</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Map */}
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-elegant)] h-[500px] lg:h-[640px] p-0">
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <div className="animate-pulse text-muted-foreground">{lang === "pt" ? "A carregar mapa..." : "Loading map..."}</div>
              </div>
            }>
              <InteractiveMap onSelect={setSelected} />
            </Suspense>
          </Card>

          {/* Sidebar list */}
          <div className="space-y-3 lg:max-h-[640px] lg:overflow-y-auto pr-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {DESTINATIONS.length} {lang === "pt" ? "destinos" : "destinations"}
            </h2>
            {DESTINATIONS.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  onClick={() => setSelected(d)}
                  className={`overflow-hidden border-0 cursor-pointer transition-all ${selected?.id === d.id ? "ring-2 ring-primary shadow-[var(--shadow-elegant)]" : "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)]"}`}
                >
                  <div className="flex">
                    <img src={d.image} alt={d.name} className="size-24 object-cover" />
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold truncate">{d.name}</h3>
                        <span className="text-[10px] text-muted-foreground shrink-0">{d.region[lang]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.description[lang]}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {d.badges.includes("most-visited") && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0"><Users className="size-2.5 mr-1" />{t("mostVisited")}</Badge>
                        )}
                        {d.badges.includes("most-recommended") && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-success text-white"><Award className="size-2.5 mr-1" />{t("mostRecommended")}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Selected detail */}
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card className="overflow-hidden border-0 shadow-[var(--shadow-elegant)]">
              <div className="grid md:grid-cols-2">
                <img src={selected.image} alt={selected.name} className="w-full h-64 md:h-full object-cover" />
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold">{selected.region[lang]}</p>
                  <h2 className="text-2xl font-bold mt-1">{selected.name}</h2>
                  <p className="text-muted-foreground mt-2">{selected.description[lang]}</p>

                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Users className="size-4 text-primary" />
                    <span className="font-semibold">{selected.visitorsK}k</span>
                    <span className="text-muted-foreground">{t("visitorsYear")}</span>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      {lang === "pt" ? "Destaques" : "Highlights"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.highlights.map((h, i) => (
                        <Badge key={i} variant="outline">{h[lang]}</Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="mt-6 w-full sm:w-auto" onClick={() => navigate({ to: "/experiences" })}>
                    {lang === "pt" ? "Ver experiências" : "See experiences"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
