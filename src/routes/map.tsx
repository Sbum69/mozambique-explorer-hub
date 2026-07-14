import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, lazy, Suspense } from "react";
import { ArrowLeft, MapPin, Users, Award, Check, Sparkles, Navigation, Car, Bike, Footprints, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { DESTINATIONS, type Destination } from "@/data/destinations";
import { FavoriteButton } from "@/components/FavoriteButton";

const InteractiveMap = lazy(() =>
  import("@/components/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);

type TravelMode = "car" | "bike" | "foot";
const OSRM_PROFILE: Record<TravelMode, string> = { car: "driving", bike: "cycling", foot: "walking" };

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

const BADGE_THRESHOLDS = [100, 500, 750, 1000, 1500, 2500, 4000, 5000];

function MapPage() {
  const { t, lang } = useLang();
  const { user, visitDestination } = useAuth();
  const navigate = useNavigate();
  const preferredId = user?.preferences?.province;
  const initialDest = DESTINATIONS.find((d) => d.id === preferredId) ?? DESTINATIONS[0];
  const [selected, setSelected] = useState<Destination | null>(initialDest);

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeStats, setRouteStats] = useState<Record<TravelMode, { distance: number; duration: number } | null>>({ car: null, bike: null, foot: null });
  const [mode, setMode] = useState<TravelMode>("car");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);

  const isVisited = (id: string) => user?.visitedIds?.includes(id) ?? false;

  const locateUser = (): Promise<[number, number]> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("no-geo"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => reject(new Error("denied")),
        { timeout: 8000 },
      );
    });

  const fetchRoute = async (from: [number, number], to: [number, number], m: TravelMode) => {
    const url = `https://router.project-osrm.org/route/v1/${OSRM_PROFILE[m]}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("route");
    const data = await res.json();
    const r = data.routes?.[0];
    if (!r) throw new Error("route");
    return {
      coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]),
      distance: r.distance as number,
      duration: r.duration as number,
    };
  };

  const computeDirections = async (d: Destination) => {
    setDirectionsOpen(true);
    setLoadingRoute(true);
    setSelected(d);
    try {
      let from = origin;
      if (!from) {
        from = await locateUser();
        setOrigin(from);
      }
      const [carR, bikeR, footR] = await Promise.allSettled([
        fetchRoute(from, d.coords, "car"),
        fetchRoute(from, d.coords, "bike"),
        fetchRoute(from, d.coords, "foot"),
      ]);
      const pick = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchRoute>>>) =>
        r.status === "fulfilled" ? { distance: r.value.distance, duration: r.value.duration } : null;
      setRouteStats({ car: pick(carR), bike: pick(bikeR), foot: pick(footR) });
      const active = mode === "car" ? carR : mode === "bike" ? bikeR : footR;
      const fallback = [carR, bikeR, footR].find((r) => r.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchRoute>>> | undefined;
      if (active.status === "fulfilled") setRouteCoords(active.value.coords);
      else if (fallback) setRouteCoords(fallback.value.coords);
      else throw new Error("route");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message === "denied" || err.message === "no-geo" ? t("locationError") : t("routeError"));
    } finally {
      setLoadingRoute(false);
    }
  };

  const switchMode = async (m: TravelMode) => {
    setMode(m);
    if (!origin || !selected) return;
    setLoadingRoute(true);
    try {
      const r = await fetchRoute(origin, selected.coords, m);
      setRouteCoords(r.coords);
      setRouteStats((s) => ({ ...s, [m]: { distance: r.distance, duration: r.duration } }));
    } catch {
      toast.error(t("routeError"));
    } finally {
      setLoadingRoute(false);
    }
  };

  const clearRoute = () => {
    setRouteCoords(null);
    setDirectionsOpen(false);
  };

  const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600);
    const min = Math.round((s % 3600) / 60);
    return h > 0 ? `${h}h ${min}min` : `${min} min`;
  };

  const handleVisit = (d: Destination) => {
    const prevXp = user?.xp ?? 0;
    const result = visitDestination(d.id, 25);
    if (!result) return;
    if (result.alreadyVisited) {
      toast.info(t("alreadyVisited"), { description: d.name });
      return;
    }
    toast.success(`+${result.gained} ${t("xpGained")}`, {
      description: d.name,
      icon: <Sparkles className="size-4" />,
    });
    if (result.leveledUp) {
      setTimeout(() => {
        toast.success(`${t("levelUp")} Lv ${result.newLevel}`, { icon: <Award className="size-4" /> });
      }, 400);
    }
    const newXp = prevXp + result.gained;
    const unlockedNow = BADGE_THRESHOLDS.filter((x) => prevXp < x && newXp >= x).length;
    if (unlockedNow > 0) {
      setTimeout(() => {
        toast.success(`${unlockedNow} × ${t("newBadgesUnlocked")}`, { icon: <Sparkles className="size-4" /> });
      }, 800);
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
              <InteractiveMap onSelect={setSelected} routeCoords={routeCoords} origin={origin} />
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
                        {isVisited(d.id) && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-success text-white"><Check className="size-2.5 mr-1" />{t("alreadyVisited")}</Badge>
                        )}
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
                <div className="relative">
                  <img src={selected.image} alt={selected.name} className="w-full h-64 md:h-full object-cover" />
                  <div className="absolute top-3 right-3">
                    <FavoriteButton
                      itemId={selected.id}
                      itemType="place"
                      itemData={{
                        name: selected.name,
                        description: selected.description,
                        image: selected.image,
                        location: selected.region[lang],
                        region: selected.region,
                      }}
                      size="md"
                    />
                  </div>
                </div>
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

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleVisit(selected)}
                      disabled={isVisited(selected.id)}
                      className="bg-gradient-to-r from-warning to-primary text-white border-0 hover:opacity-90"
                    >
                      {isVisited(selected.id) ? (
                        <><Check className="size-4" /> {t("alreadyVisited")}</>
                      ) : (
                        <><Sparkles className="size-4" /> {t("visitHere")} (+150 XP)</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => computeDirections(selected)}
                      disabled={loadingRoute}
                    >
                      {loadingRoute ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
                      {t("getDirections")}
                    </Button>
                    <Button variant="outline" onClick={() => navigate({ to: "/experiences" })}>
                      {lang === "pt" ? "Ver experiências" : "See experiences"}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {directionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 overflow-hidden"
                      >
                        <div className="rounded-xl border bg-accent/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Navigation className="size-4 text-primary" /> {t("directions")}
                            </h3>
                            <Button size="sm" variant="ghost" onClick={clearRoute}>
                              <X className="size-4" /> {t("clearRoute")}
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { id: "car" as const, icon: Car, label: t("byCar") },
                              { id: "bike" as const, icon: Bike, label: t("byBike") },
                              { id: "foot" as const, icon: Footprints, label: t("onFoot") },
                            ]).map(({ id, icon: Icon, label }) => {
                              const stats = routeStats[id];
                              const active = mode === id;
                              return (
                                <button
                                  key={id}
                                  onClick={() => switchMode(id)}
                                  disabled={loadingRoute}
                                  className={`text-left rounded-lg border p-3 transition-all ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon className="size-4" />
                                    <span className="text-xs font-semibold">{label}</span>
                                  </div>
                                  {stats ? (
                                    <>
                                      <div className="text-sm font-bold">{fmtDur(stats.duration)}</div>
                                      <div className="text-[11px] text-muted-foreground">{fmtDist(stats.distance)}</div>
                                    </>
                                  ) : (
                                    <div className="text-[11px] text-muted-foreground">—</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {loadingRoute && (
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                              <Loader2 className="size-3 animate-spin" /> {t("locating")}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
