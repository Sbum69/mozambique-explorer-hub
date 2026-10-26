import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Coins,
  Store,
  MapPin,
  Circle,
  CheckCircle2,
  Play,
  Download,
  Compass,
  Loader2,
  Share2,
  Copy,
  ShieldCheck,
  Lock,
  RotateCcw,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ClientOnly } from "@tanstack/react-router";
const ItineraryMap = lazy(() =>
  import("@/components/ItineraryMap").then((m) => ({ default: m.ItineraryMap })),
);
import { useLang } from "@/contexts/LanguageContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { useRoute } from "@/hooks/useRoutes";
import {
  fetchRouteProgress,
  finishRouteProgress,
  importRouteByCode,
  resetRouteProgress,
  routeAllStops,
  routeCover,
  routePriceMzn,
  setProgressDay,
  startRouteProgress,
  toggleStopCompleted,
  uploadStopProof,
  proofUrl,
  routeTitle,
  routeSubtitle,
  routeDescription,
  stopTitle,
  type RouteProgress,
  type RouteStop,
  routeInterestMeta,
} from "@/lib/routes";
import { ShareButton } from "@/components/ShareButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DirectionsButtons } from "@/components/DirectionsButtons";
import { Camera, Users, Image as ImageIcon } from "lucide-react";
import { LOCATION_PROMPT_TEXT, PROOF_STATUS_LABEL, requestPreciseLocation } from "@/lib/geo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/itinerary/$id")({
  head: () => {
    const title = "Roteiro — Ekaya Explore";
    const description =
      "Segue o roteiro dia a dia com destinos e experiências reais de Moçambique.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ItineraryDetailPage,
});

function ItineraryDetailPage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const [askConfirm, confirmDialog] = useConfirm();
  const { authUser, user } = useAuth();
  const navigate = useNavigate();
  const userId = authUser?.id ?? null;
  const isGuest = !user || user.role === "guest" || !userId;
  const { requireAccount } = useAuthGate();

  const { route, loading, error: routeError, reload } = useRoute(id, userId);
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [progressError, setProgressError] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proofStop, setProofStop] = useState<RouteStop | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofSaving, setProofSaving] = useState(false);

  useEffect(() => {
    setProgress(null);
    setProgressError(false);
    if (!route || !userId) {
      setProgressLoading(false);
      return;
    }
    setProgressLoading(true);
    let active = true;
    fetchRouteProgress(route.id, userId)
      .then((p) => {
        if (active) setProgress(p);
      })
      .catch(() => {
        if (active) setProgressError(true);
      })
      .finally(() => {
        if (active) setProgressLoading(false);
      });
    return () => {
      active = false;
    };
  }, [route, userId]);

  const stops = useMemo(() => (route ? routeAllStops(route) : []), [route]);
  const completed =
    progress?.routeId === id
      ? progress.completedStopIds.filter((stopId) => stops.some((stop) => stop.id === stopId))
      : [];
  const progressValue = stops.length === 0 ? 0 : (completed.length / stops.length) * 100;
  const isMine = !!userId && route?.ownerId === userId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {lang === "pt" ? "A carregar roteiro..." : "Loading itinerary..."}
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {routeError
              ? lang === "pt"
                ? "Não foi possível carregar o roteiro"
                : "Could not load itinerary"
              : lang === "pt"
                ? "Roteiro não encontrado"
                : "Itinerary not found"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            {lang === "pt"
              ? "Este roteiro não existe, é privado ou foi desativado."
              : "This itinerary does not exist, is private or has been disabled."}
          </p>
          {routeError && (
            <Button variant="outline" onClick={() => void reload()}>
              {lang === "pt" ? "Tentar novamente" : "Try again"}
            </Button>
          )}
          <Link to="/itineraries" className="text-primary hover:underline mt-4 inline-block">
            {lang === "pt" ? "Voltar aos roteiros" : "Back to itineraries"}
          </Link>
        </div>
      </div>
    );
  }

  const cover = routeCover(route);
  const price = routePriceMzn(route);
  const currentDay = progress?.currentDay ?? 1;

  const start = async () => {
    if (!requireAccount(lang === "pt" ? "Progresso de rotas" : "Route progress") || !userId) return;
    setBusy(true);
    try {
      setProgress(await startRouteProgress(route.id, userId));
      toast.success(lang === "pt" ? "Rota iniciada!" : "Route started!");
    } catch {
      toast.error(lang === "pt" ? "Não foi possível iniciar" : "Could not start");
    } finally {
      setBusy(false);
    }
  };

  const refreshProgress = async () => {
    if (!userId) return;
    setProgress(await fetchRouteProgress(route.id, userId));
    await queryClient.invalidateQueries({
      predicate: (q) =>
        ["my-points", "achievements", "leaderboard", "game-state"].includes(String(q.queryKey[0])),
    });
  };

  const toggle = async (stop: RouteStop) => {
    if (!progress) {
      toast.info(
        lang === "pt" ? "Começa a rota para marcar paragens" : "Start the route to tick stops",
      );
      return;
    }
    if (!completed.includes(stop.id)) {
      // completing requires a photo proof
      setProofFile(null);
      setProofStop(stop);
      return;
    }
    if (
      !(await askConfirm({
        title:
          lang === "pt"
            ? "Desmarcar esta paragem? A prova fotográfica deixa de contar."
            : "Unmark this stop? The photo proof will no longer count.",
        confirmLabel: lang === "pt" ? "Desmarcar" : "Unmark",
        destructive: true,
      }))
    )
      return;
    try {
      await toggleStopCompleted(progress.id, stop.id, false);
      await refreshProgress();
    } catch {
      toast.error(
        lang === "pt" ? "Não foi possível guardar o progresso" : "Could not save progress",
      );
    }
  };

  const goToDay = async (day: number) => {
    if (!progress || busy) return;
    setBusy(true);
    try {
      await setProgressDay(progress.id, day);
      await refreshProgress();
    } catch {
      toast.error(lang === "pt" ? "Não foi possível guardar o dia." : "Could not save the day.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!progress || busy) return;
    setBusy(true);
    try {
      await finishRouteProgress(progress.id);
      await refreshProgress();
      toast.success(lang === "pt" ? "Rota concluída!" : "Route completed!");
    } catch {
      toast.error(
        lang === "pt"
          ? "Conclui todas as paragens com fotografia antes de terminar. Se já o fizeste, tenta novamente."
          : "Complete every stop with a photo before finishing. If already done, try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    if (
      !progress ||
      busy ||
      !(await askConfirm({
        title:
          lang === "pt"
            ? "Reiniciar as visitas? Os pontos já ganhos não serão atribuídos novamente."
            : "Restart visits? Previously earned points will not be awarded again.",
        confirmLabel: lang === "pt" ? "Reiniciar" : "Restart",
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    try {
      await resetRouteProgress(progress.id);
      await refreshProgress();
      toast.success(lang === "pt" ? "Progresso reiniciado" : "Progress reset");
    } catch {
      toast.error(lang === "pt" ? "Não foi possível reiniciar." : "Could not restart.");
    } finally {
      setBusy(false);
    }
  };

  const saveProof = async () => {
    if (!progress || !proofStop || !userId) return;
    if (!proofFile) {
      toast.error(
        lang === "pt"
          ? "A fotografia é obrigatória para concluir."
          : "A photo is required to complete.",
      );
      return;
    }
    setProofSaving(true);
    try {
      const path = await uploadStopProof(userId, proofFile);
      // Location is only sent to the server's distance check; refusing it leaves the proof pending.
      const location = await requestPreciseLocation();
      const result = await toggleStopCompleted(progress.id, proofStop.id, true, {
        photoPath: path,
        location,
      });
      await refreshProgress();
      setProofStop(null);
      if (result?.review_status === "verified") {
        toast.success(
          lang === "pt"
            ? "Paragem concluída e prova verificada!"
            : "Stop completed and proof verified!",
        );
      } else {
        toast.success(
          lang === "pt"
            ? "Prova enviada. Fica pendente de verificação; os pontos são atribuídos quando for aprovada."
            : "Proof sent. It is pending verification; points are awarded once it is approved.",
        );
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(
        m === "too_large"
          ? lang === "pt"
            ? "Máximo 8 MB."
            : "Max 8 MB."
          : m === "invalid_type"
            ? lang === "pt"
              ? "Escolhe uma imagem."
              : "Choose an image."
            : lang === "pt"
              ? "Não foi possível guardar a prova."
              : "Could not save the proof.",
      );
    } finally {
      setProofSaving(false);
    }
  };

  const openProof = async (path: string) => {
    const url = await proofUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else
      toast.error(
        lang === "pt" ? "Não foi possível abrir a fotografia." : "Couldn't open the photo.",
      );
  };

  const importThis = async () => {
    if (!requireAccount(lang === "pt" ? "Importar roteiros" : "Import itineraries") || !userId)
      return;
    setBusy(true);
    try {
      const copy = await importRouteByCode(route.code, userId);
      toast.success(lang === "pt" ? "Roteiro importado!" : "Itinerary imported!");
      navigate({ to: "/itinerary/$id", params: { id: copy.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      toast.error(
        message === "ALREADY_OWN"
          ? lang === "pt"
            ? "Este roteiro já é teu"
            : "Already yours"
          : message === "ALREADY_IMPORTED"
            ? lang === "pt"
              ? "Este roteiro já está nos teus roteiros."
              : "This itinerary is already in your itineraries."
            : lang === "pt"
              ? "Não foi possível importar"
              : "Import failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {confirmDialog}
      {/* Hero */}
      <div className="relative h-96 overflow-hidden bg-muted">
        {cover ? (
          <img src={cover} alt={routeTitle(route, lang)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Compass className="size-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <Link
          to="/itineraries"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-md text-sm backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" /> {lang === "pt" ? "Roteiros" : "Itineraries"}
        </Link>
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <div className="rounded-md bg-background/80 backdrop-blur">
            <ThemeToggle />
            <LanguageToggle />
          </div>
          <FavoriteButton itemId={route.id} itemType="itinerary" size="md" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
          <div className="container mx-auto">
            <div className="flex gap-2 mb-3 flex-wrap">
              {route.isCurated && (
                <Badge className="bg-primary text-primary-foreground border-0 gap-1">
                  <ShieldCheck className="size-3" />{" "}
                  {lang === "pt" ? "Roteiro oficial" : "Official itinerary"}
                </Badge>
              )}
              {!route.isPublic && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur gap-1">
                  <Lock className="size-3" /> {lang === "pt" ? "Privado" : "Private"}
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                {stops.length} {lang === "pt" ? "paragens" : "stops"}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur font-mono">
                {route.code}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{routeTitle(route, lang)}</h1>
            {routeSubtitle(route, lang) && (
              <p className="text-xl text-white/90 mb-2">{routeSubtitle(route, lang)}</p>
            )}
            {routeDescription(route, lang) && (
              <p className="text-lg text-white/90 max-w-2xl mb-3">
                {routeDescription(route, lang)}
              </p>
            )}
            {route.interests.length > 0 && (
              <p className="text-sm text-white/90 mb-2">
                {route.interests
                  .map((i) => `${routeInterestMeta(i).emoji} ${routeInterestMeta(i).label[lang]}`)
                  .join(" · ")}
                {route.intensity
                  ? ` · ${lang === "pt" ? { low: "Leve", medium: "Moderada", high: "Exigente" }[route.intensity] : { low: "Low", medium: "Medium", high: "High" }[route.intensity]}`
                  : ""}
              </p>
            )}
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {route.durationDays} {lang === "pt" ? "dias" : "days"}
              </span>
              {route.province && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />{" "}
                  {lang === "pt" ? route.province.name.pt : route.province.name.en}
                </span>
              )}
              {price > 0 && (
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4" /> {price.toLocaleString("pt-PT")} MZN
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isMine && route.isPublic && route.reviewStatus !== "approved" && (
          <Card
            className={`p-4 mb-6 text-sm ${route.reviewStatus === "pending" ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200" : "bg-destructive/10 border-destructive/30"}`}
          >
            {route.reviewStatus === "pending"
              ? lang === "pt"
                ? "Este roteiro está pendente de aprovação do Admin. Só tu e o Admin o conseguem ver."
                : "This itinerary is pending admin approval. Only you and the admin can see it."
              : `${lang === "pt" ? "Roteiro rejeitado" : "Itinerary rejected"}${route.rejectionReason ? ` — ${lang === "pt" ? "Motivo" : "Reason"}: ${route.rejectionReason}` : ""}`}
          </Card>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {lang === "pt" ? "Mapa do Roteiro" : "Itinerary Map"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {lang === "pt"
                      ? "Coordenadas reais dos destinos incluídos"
                      : "Real coordinates of the included destinations"}
                  </p>
                </div>
                <Compass className="h-5 w-5 text-muted-foreground" />
              </div>
              <ClientOnly fallback={<div className="h-[480px] rounded-xl border bg-muted" />}>
                <Suspense fallback={<div className="h-[480px] rounded-xl border bg-muted" />}>
                  <ItineraryMap stops={stops} lang={lang} />
                </Suspense>
              </ClientOnly>
            </Card>

            {/* Days */}
            {route.days.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground">
                {lang === "pt"
                  ? "Este roteiro ainda não tem dias definidos."
                  : "This itinerary has no days yet."}
              </Card>
            )}

            {route.requiresValidation &&
              (route.catalogNotes.pt || route.communityCandidates.length > 0) && (
                <div className="rounded-lg border border-dashed p-4 text-sm space-y-1">
                  <p className="font-semibold">
                    {lang === "pt"
                      ? "Catálogo-base — requer validação"
                      : "Base catalogue — requires validation"}
                  </p>
                  {(lang === "en"
                    ? (route.catalogNotes.en ?? route.catalogNotes.pt)
                    : route.catalogNotes.pt) && (
                    <p className="text-muted-foreground">
                      {lang === "en"
                        ? (route.catalogNotes.en ?? route.catalogNotes.pt)
                        : route.catalogNotes.pt}
                    </p>
                  )}
                  {route.communityCandidates.length > 0 && (
                    <p className="text-muted-foreground">
                      {lang === "pt"
                        ? "Candidaturas comunitárias (por validar): "
                        : "Community candidates (to validate): "}
                      {route.communityCandidates.join(" · ")}
                    </p>
                  )}
                </div>
              )}

            {route.days.map((day) => {
              const active = progress?.status === "in_progress" && day.dayNumber === currentDay;
              return (
                <div key={day.id} className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg">
                      {day.isUnassigned ? (
                        lang === "pt" ? (
                          "Paragens — distribuição por dias a validar"
                        ) : (
                          "Stops — day-by-day split to be validated"
                        )
                      ) : (
                        <>
                          {lang === "pt" ? "Dia" : "Day"} {day.dayNumber}
                        </>
                      )}
                      {!day.isUnassigned && (lang === "en" && day.titleEn ? day.titleEn : day.title)
                        ? ` — ${lang === "en" && day.titleEn ? day.titleEn : day.title}`
                        : ""}
                    </h3>
                    {active && (
                      <Badge className="bg-primary text-primary-foreground">
                        {lang === "pt" ? "Dia atual" : "Current day"}
                      </Badge>
                    )}
                    {progress && !active && !day.isUnassigned && (
                      <Button variant="ghost" size="sm" onClick={() => void goToDay(day.dayNumber)}>
                        {lang === "pt" ? "Ir para este dia" : "Go to this day"}
                      </Button>
                    )}
                  </div>
                  {day.description && (
                    <p className="text-sm text-muted-foreground">{day.description}</p>
                  )}
                  {day.stops.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {lang === "pt" ? "Sem paragens neste dia." : "No stops on this day."}
                    </p>
                  )}
                  {day.stops.map((stop, index) => {
                    const done = completed.includes(stop.id);
                    return (
                      <Card
                        key={stop.id}
                        className={`p-5 transition-colors ${done ? "bg-success/10 border-success/30" : ""}`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-full ${
                              stop.kind === "experience" ? "bg-blue-500" : "bg-purple-500"
                            } text-white flex items-center justify-center shrink-0 font-bold`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0 break-words">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase">
                              {stop.kind === "experience" ? (
                                <>
                                  <Store className="size-3" />{" "}
                                  {lang === "pt" ? "Atividade" : "Activity"}
                                </>
                              ) : stop.kind === "community" ? (
                                <>
                                  <Users className="size-3" />{" "}
                                  {lang === "pt"
                                    ? "Experiência comunitária · grátis"
                                    : "Community experience · free"}
                                </>
                              ) : stop.kind === "custom" ? (
                                <>
                                  <MapPin className="size-3" /> {lang === "pt" ? "Paragem" : "Stop"}
                                </>
                              ) : (
                                <>
                                  <MapPin className="size-3" />{" "}
                                  {lang === "pt" ? "Destino" : "Destination"}
                                </>
                              )}
                            </span>
                            <h4 className="font-bold text-lg">{stopTitle(stop, lang)}</h4>
                            {(stop.pendingValidation || stop.communityCandidate) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {stop.pendingValidation && (
                                  <Badge variant="outline" className="text-xs">
                                    {lang === "pt"
                                      ? "Por validar no terreno"
                                      : "To be validated on site"}
                                  </Badge>
                                )}
                                {stop.communityCandidate && (
                                  <Badge variant="outline" className="text-xs">
                                    {lang === "pt"
                                      ? "Potencial comunitário (não confirmado)"
                                      : "Community potential (not confirmed)"}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {stop.destinationName && stop.kind === "experience" && (
                              <p className="text-sm text-muted-foreground">
                                {stop.destinationName}
                              </p>
                            )}
                            {stop.location && (
                              <p className="text-sm text-muted-foreground">{stop.location}</p>
                            )}
                            {(lang === "en"
                              ? (stop.description.en ?? stop.description.pt)
                              : stop.description.pt) && (
                              <p className="text-sm mt-2">
                                {lang === "en"
                                  ? (stop.description.en ?? stop.description.pt)
                                  : stop.description.pt}
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                              {stop.durationHours ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {stop.durationHours}h
                                </div>
                              ) : stop.estimatedDurationMinutes ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {stop.estimatedDurationMinutes} min
                                </div>
                              ) : null}
                              {stop.priceMzn != null && stop.priceMzn > 0 && (
                                <div className="flex items-center gap-1">
                                  <Coins className="h-4 w-4 text-muted-foreground" />
                                  {stop.priceMzn.toLocaleString("pt-PT")} MZN
                                </div>
                              )}
                            </div>
                            {stop.notes && (
                              <p className="text-sm mt-3 text-muted-foreground">{stop.notes}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {stop.kind === "experience" && (
                                <Button asChild variant="outline" size="sm">
                                  <Link to="/experience/$id" params={{ id: stop.refId }}>
                                    {lang === "pt" ? "Ver atividade" : "View activity"}
                                  </Link>
                                </Button>
                              )}
                              {stop.kind === "community" && (
                                <Button asChild variant="outline" size="sm">
                                  <Link to="/community-experiences" search={{ open: stop.refId }}>
                                    {lang === "pt" ? "Ver experiência" : "View experience"}
                                  </Link>
                                </Button>
                              )}
                              {stop.kind === "destination" && stop.slug && (
                                <Button asChild variant="outline" size="sm">
                                  <Link to="/map" search={{ destination: stop.slug }}>
                                    {lang === "pt" ? "Ver destino" : "View destination"}
                                  </Link>
                                </Button>
                              )}
                              <DirectionsButtons coords={stop.coords} />
                              {progress?.proofPaths[stop.id] && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void openProof(progress.proofPaths[stop.id])}
                                >
                                  <ImageIcon className="size-4 mr-1" />
                                  {lang === "pt" ? "Ver prova" : "View proof"}
                                </Button>
                              )}
                              {progress?.proofStatus[stop.id] && (
                                <Badge
                                  variant={
                                    progress.proofStatus[stop.id] === "rejected"
                                      ? "destructive"
                                      : progress.proofStatus[stop.id] === "pending"
                                        ? "secondary"
                                        : "default"
                                  }
                                >
                                  {lang === "pt" ? "Prova: " : "Proof: "}
                                  {PROOF_STATUS_LABEL[progress.proofStatus[stop.id]][lang]}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || proofSaving || progressLoading || progressError}
                            onClick={() => void toggle(stop)}
                            aria-label={
                              done
                                ? lang === "pt"
                                  ? "Desmarcar paragem"
                                  : "Unmark stop"
                                : lang === "pt"
                                  ? "Concluir paragem com fotografia"
                                  : "Complete stop with photo"
                            }
                            className="shrink-0"
                            title={
                              done
                                ? lang === "pt"
                                  ? "Concluído"
                                  : "Done"
                                : lang === "pt"
                                  ? "Marcar como concluído"
                                  : "Mark as done"
                            }
                          >
                            {done ? (
                              <CheckCircle2 className="h-7 w-7 text-green-700 dark:text-green-300" />
                            ) : progress ? (
                              <Camera className="h-7 w-7 text-muted-foreground hover:text-foreground" />
                            ) : (
                              <Circle className="h-7 w-7 text-muted-foreground hover:text-foreground" />
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <Card className="p-5">
                <h3 className="font-bold mb-3">{lang === "pt" ? "Progresso" : "Progress"}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {completed.length}/{stops.length}{" "}
                  {lang === "pt" ? "paragens concluídas" : "stops completed"}
                </p>
                <Progress value={progressValue} className="h-2 mb-4" />
                {progressLoading && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {lang === "pt" ? "A carregar progresso..." : "Loading progress..."}
                  </p>
                )}
                {progressError && (
                  <p role="alert" className="text-sm text-destructive mb-2">
                    {lang === "pt"
                      ? "Não foi possível consultar o progresso. Atualiza a página para tentar novamente."
                      : "Could not read progress. Refresh the page to retry."}
                  </p>
                )}

                {progress?.status === "completed" && (
                  <Badge className="mb-3 bg-green-700 text-white">
                    {lang === "pt" ? "Rota concluída" : "Route completed"}
                  </Badge>
                )}

                {!progress ? (
                  <Button
                    onClick={() => void start()}
                    disabled={busy || progressLoading || progressError || stops.length === 0}
                    className="w-full mb-2 bg-gradient-to-r from-primary to-orange-700 gap-2"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {lang === "pt" ? "Começar rota" : "Start route"}
                  </Button>
                ) : (
                  <>
                    <p className="text-sm mb-2">
                      {lang === "pt" ? "Dia atual" : "Current day"}: <strong>{currentDay}</strong>
                    </p>
                    <div className="flex gap-2 mb-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={currentDay <= 1}
                        onClick={() => void goToDay(currentDay - 1)}
                      >
                        ←
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={currentDay >= route.days.length}
                        onClick={() => void goToDay(currentDay + 1)}
                      >
                        →
                      </Button>
                    </div>
                    {progress.status === "in_progress" && (
                      <Button
                        disabled={busy || completed.length !== stops.length || stops.length === 0}
                        onClick={() => void finish()}
                        className="w-full mb-2 gap-2"
                      >
                        <Flag className="size-4" />{" "}
                        {lang === "pt" ? "Terminar rota" : "Finish route"}
                      </Button>
                    )}
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => void restart()}
                      className="w-full mb-2 gap-2"
                    >
                      <RotateCcw className="size-4" /> {lang === "pt" ? "Reiniciar" : "Restart"}
                    </Button>
                  </>
                )}

                {route.isPublic && route.reviewStatus === "approved" && (
                  <div className="mb-2 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <Share2 className="h-4 w-4" /> {lang === "pt" ? "Partilhar" : "Share"}
                    <ShareButton
                      className="ml-auto"
                      payload={{
                        title: `${routeTitle(route, lang)} · ${route.code}`,
                        description: routeDescription(route, lang) ?? undefined,
                        url: `${typeof window !== "undefined" ? window.location.origin : ""}/itinerary/${route.id}`,
                      }}
                    />
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(route.code);
                    toast.success(lang === "pt" ? "Código copiado!" : "Code copied!");
                  }}
                  className="w-full gap-2 mb-2"
                >
                  <Copy className="h-4 w-4" /> {lang === "pt" ? "Copiar código" : "Copy code"}
                </Button>
                {!isMine && route.isPublic && route.reviewStatus === "approved" && (
                  <Button
                    variant="outline"
                    onClick={() => void importThis()}
                    disabled={busy}
                    className="w-full gap-2"
                  >
                    <Download className="h-4 w-4" />{" "}
                    {lang === "pt" ? "Importar roteiro" : "Import itinerary"}
                  </Button>
                )}

                <p className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  {lang === "pt"
                    ? "O progresso fica guardado na tua conta e continua em qualquer dispositivo."
                    : "Progress is stored in your account and follows you across devices."}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!proofStop} onOpenChange={(o) => !o && !proofSaving && setProofStop(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Prova fotográfica" : "Photo proof"}</DialogTitle>
            <DialogDescription>
              {proofStop ? stopTitle(proofStop, lang) : ""} —{" "}
              {lang === "pt"
                ? "tira ou escolhe uma fotografia para concluir esta paragem. Fica privada na tua conta."
                : "take or choose a photo to complete this stop. It stays private to your account."}
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm cursor-pointer hover:bg-muted/50">
            {proofFile ? (
              <img
                src={URL.createObjectURL(proofFile)}
                alt=""
                className="max-h-48 rounded-md object-cover"
              />
            ) : (
              <Camera className="size-8 text-primary" />
            )}
            <span>
              {proofFile
                ? proofFile.name
                : lang === "pt"
                  ? "Tirar / escolher fotografia"
                  : "Take / choose photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={lang === "pt" ? "Fotografia da paragem" : "Stop photo"}
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="flex gap-2 text-xs text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            {LOCATION_PROMPT_TEXT[lang]}
          </p>
          <Button
            onClick={() => void saveProof()}
            disabled={!proofFile || proofSaving}
            className="w-full"
          >
            {proofSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            {lang === "pt" ? "Guardar e concluir" : "Save and complete"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
