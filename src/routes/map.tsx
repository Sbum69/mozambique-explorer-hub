import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { ArrowLeft, MapPin, Users, Award, Check, Navigation, X, Loader2, LocateFixed, Undo2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { type Destination } from "@/lib/destinations";
import { useDestinations } from "@/hooks/useDestinations";
import { useBackTarget } from "@/lib/nav";
import { FavoriteButton } from "@/components/FavoriteButton";
import { fetchCommunityExperiences, type CommunityExperience } from "@/lib/community-experiences";
import { addVisit, directionsUrls, fetchMyVisits, hasValidCoords, removeVisit } from "@/lib/visits";

const InteractiveMap = lazy(() =>
  import("@/components/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);


export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mapa Interativo — Ekaya Explore" },
      { name: "description", content: "Mapa interativo de Moçambique com destinos comunitários autênticos." },
      { property: "og:title", content: "Mapa Interativo — Ekaya Explore" },
      { property: "og:description", content: "Mapa interativo de Moçambique com destinos comunitários autênticos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { destination?: string; community?: string } => ({
    ...(typeof search.destination === "string" ? { destination: search.destination } : {}),
    ...(typeof search.community === "string" ? { community: search.community } : {}),
  }),
  component: MapPage,
});


function MapPage() {
  const { t, lang } = useLang();
  const { user, isAuthenticated, authUser } = useAuth();
  const { requireAccount } = useAuthGate();
  const navigate = useNavigate();
  const backTarget = useBackTarget();
  const { destination: linkedSlug, community: linkedCommunity } = Route.useSearch();
  const preferredId = user?.preferences?.province;
  const { destinations, loading: loadingDestinations, error: destinationsError, isEmpty, reload } = useDestinations();
  const [selected, setSelected] = useState<Destination | null>(null);
  const [showAllDestinations, setShowAllDestinations] = useState(!preferredId || !!linkedSlug);
  const visibleDestinations = preferredId && !showAllDestinations
    ? destinations.filter((d) => d.slug === preferredId)
    : destinations;

  const mappable = visibleDestinations.filter((d) => hasValidCoords(d.coords));

  useEffect(() => {
    if (!destinations.length) return;
    setSelected((current) =>
      current ??
      (linkedSlug ? destinations.find((d) => d.slug === linkedSlug) : undefined) ??
      destinations.find((d) => d.slug === preferredId) ??
      destinations[0]);
  }, [destinations, preferredId, linkedSlug]);

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [savingVisit, setSavingVisit] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const userId = isAuthenticated ? (authUser?.id ?? null) : null;
  const pt = lang === "pt";

  // Community (free) experiences: own layer and own marker, never mixed with destinations.
  const [communityItems, setCommunityItems] = useState<CommunityExperience[]>([]);
  const [showDestinations, setShowDestinations] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  useEffect(() => {
    fetchCommunityExperiences()
      .then((rows) => {
        setCommunityItems(rows);
        const linked = linkedCommunity ? rows.find((r) => r.id === linkedCommunity) : undefined;
        if (linked && linked.lat !== null && linked.lng !== null) setFocus([linked.lat, linked.lng]);
      })
      .catch(() => toast.error(pt ? "Não foi possível carregar as experiências comunitárias." : "Couldn't load community experiences."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedCommunity]);

  useEffect(() => {
    if (!userId) { setVisited(new Set()); return; }
    fetchMyVisits(userId).then(setVisited).catch(() => toast.error(pt ? "Não foi possível carregar as visitas." : "Couldn't load your visits."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isVisited = (id: string) => visited.has(id);

  const locateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(pt ? "Este dispositivo não suporta localização." : "This device doesn't support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setOrigin(c);
        setFocus(c);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        const msg = err.code === err.PERMISSION_DENIED
          ? (pt ? "Permissão recusada. Permite a localização nas definições do browser." : "Permission denied. Allow location in your browser settings.")
          : err.code === err.POSITION_UNAVAILABLE
            ? (pt ? "Localização indisponível." : "Location unavailable.")
            : err.code === err.TIMEOUT
              ? (pt ? "A localização demorou demasiado. Tenta novamente." : "Location timed out. Try again.")
              : (pt ? "Erro de localização." : "Location error.");
        toast.error(msg);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 },
    );
  };

  const showDetails = (d: Destination) => {
    setSelected(d);
    setDirectionsOpen(false);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const openDirections = (d: Destination) => {
    setSelected(d);
    if (!hasValidCoords(d.coords)) {
      toast.error(pt ? "Este local ainda não tem coordenadas disponíveis." : "This place has no coordinates yet.");
      return;
    }
    setDirectionsOpen(true);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const toggleVisit = async (d: Destination) => {
    if (!requireAccount(pt ? "Marcar como visitado" : "Mark as visited")) return;
    if (!userId) return;
    const was = isVisited(d.id);
    setSavingVisit(true);
    try {
      if (was) await removeVisit(userId, d.id);
      else await addVisit(userId, d.id);
      setVisited((prev) => {
        const next = new Set(prev);
        if (was) next.delete(d.id); else next.add(d.id);
        return next;
      });
      toast.success(was ? (pt ? "Visita removida" : "Visit removed") : (pt ? "Marcado como visitado" : "Marked as visited"), { description: d.name });
    } catch {
      toast.error(pt ? "Não foi possível guardar. Tenta novamente." : "Couldn't save. Try again.");
    } finally {
      setSavingVisit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <button onClick={() => navigate({ to: backTarget })} className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors ml-2">
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

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-label={pt ? "Legenda do mapa" : "Map legend"}>
          <button type="button" aria-pressed={showDestinations} onClick={() => setShowDestinations((v) => !v)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-opacity ${showDestinations ? "" : "opacity-50"}`}>
            <span className="size-3 rounded-full bg-primary" aria-hidden /> {pt ? "Destinos" : "Destinations"}
          </button>
          <button type="button" aria-pressed={showCommunity} onClick={() => setShowCommunity((v) => !v)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-opacity ${showCommunity ? "" : "opacity-50"}`}>
            <span className="size-3 rotate-45 rounded-[3px] bg-success" aria-hidden /> {pt ? "Experiências Comunitárias" : "Community Experiences"} ({communityItems.length})
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-muted-foreground">
            <span className="size-3 rounded-sm bg-warning" aria-hidden /> {pt ? "Negócios: ainda sem coordenadas registadas" : "Businesses: no coordinates registered yet"}
          </span>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Map */}
          <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-elegant)] h-[420px] sm:h-[500px] lg:h-[640px] p-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={locateMe}
              disabled={locating}
              className="absolute bottom-4 left-4 z-[500] shadow-md"
            >
              {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              {locating ? (pt ? "A localizar..." : "Locating...") : origin ? (pt ? "Atualizar localização" : "Update location") : (pt ? "A minha localização" : "My location")}
            </Button>
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <div className="animate-pulse text-muted-foreground">{lang === "pt" ? "A carregar mapa..." : "Loading map..."}</div>
              </div>
            }>
              <InteractiveMap destinations={showDestinations ? mappable : []} community={showCommunity ? communityItems : []} highlightCommunityId={linkedCommunity ?? null} onSelect={showDetails} onDirections={openDirections} origin={origin} visitedIds={visited} focus={focus} />
            </Suspense>
          </Card>

          {/* Sidebar list */}
          <div className="space-y-3 lg:max-h-[640px] lg:overflow-y-auto pr-1">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {visibleDestinations.length} {lang === "pt" ? "destinos" : "destinations"}
              </h2>
              {preferredId && (
                <button
                  onClick={() => setShowAllDestinations((s) => !s)}
                  className="text-xs text-primary hover:underline"
                >
                  {showAllDestinations
                    ? (lang === "pt" ? "Só o meu destino" : "Only my destination")
                    : (lang === "pt" ? "Ver todos" : "Show all")}
                </button>
              )}
            </div>
            {loadingDestinations && (
              <Card className="border-0 shadow-[var(--shadow-soft)] p-4 text-sm text-muted-foreground animate-pulse">
                {lang === "pt" ? "A carregar destinos..." : "Loading destinations..."}
              </Card>
            )}
            {destinationsError && (
              <Card className="border-0 shadow-[var(--shadow-soft)] p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {lang === "pt"
                    ? "Não foi possível carregar os destinos. Verifica a ligação e tenta novamente."
                    : "We couldn't load the destinations. Check your connection and try again."}
                </p>
                <Button size="sm" variant="outline" onClick={() => void reload()}>
                  {lang === "pt" ? "Tentar novamente" : "Try again"}
                </Button>
              </Card>
            )}
            {isEmpty && (
              <Card className="border-0 shadow-[var(--shadow-soft)] p-4 text-sm text-muted-foreground">
                {lang === "pt" ? "Ainda não existem destinos disponíveis." : "No destinations available yet."}
              </Card>
            )}
            {visibleDestinations.map((d, i) => (
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
                          <Badge className="text-[9px] px-1.5 py-0 bg-success text-white"><Check className="size-2.5 mr-1" />{pt ? "Visitado" : "Visited"}</Badge>
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
            ref={detailRef}
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
                      itemId={selected.slug}
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
                      onClick={() => void toggleVisit(selected)}
                      disabled={savingVisit}
                      variant={isVisited(selected.id) ? "outline" : "default"}
                      className={isVisited(selected.id) ? "" : "bg-gradient-to-r from-warning to-primary text-white border-0 hover:opacity-90"}
                    >
                      {savingVisit ? <Loader2 className="size-4 animate-spin" /> : isVisited(selected.id) ? <Undo2 className="size-4" /> : <Check className="size-4" />}
                      {isVisited(selected.id) ? (pt ? "Desmarcar visita" : "Unmark visit") : (pt ? "Marcar como visitado" : "Mark as visited")}
                    </Button>
                    <Button variant="outline" onClick={() => openDirections(selected)}>
                      <Navigation className="size-4" /> {pt ? "Como chegar" : "Get directions"}
                    </Button>
                    <Button variant="outline" onClick={() => navigate({ to: "/experiences" })}>
                      {pt ? "Ver experiências" : "See experiences"}
                    </Button>
                  </div>

                  {directionsOpen && hasValidCoords(selected.coords) && (
                    <div className="mt-6 rounded-xl border bg-accent/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Navigation className="size-4 text-primary" /> {pt ? "Abrir direções em" : "Open directions in"}
                        </h3>
                        <Button size="sm" variant="ghost" onClick={() => setDirectionsOpen(false)} aria-label={pt ? "Fechar" : "Close"}>
                          <X className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(() => { const u = directionsUrls(selected.coords); return ([["Google Maps", u.google], ["Apple Maps", u.apple], ["Waze", u.waze]] as const).map(([label, href]) => (
                          <Button key={label} asChild variant="outline" className="bg-background">
                            <a href={href} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> {label}</a>
                          </Button>
                        )); })()}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-3">
                        {pt ? "As direções abrem na aplicação de mapas do teu dispositivo." : "Directions open in your device's maps app."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
