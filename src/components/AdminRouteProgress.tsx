import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ImageIcon,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  fetchAllRoutesAdmin,
  proofUrl,
  reviewStopProof,
  routeStopCount,
  type ItineraryRoute,
} from "@/lib/routes";
import { PROOF_STATUS_LABEL, type ProofReviewStatus } from "@/lib/geo";
import { useLang } from "@/contexts/LanguageContext";

interface StopDone {
  stopId: string;
  photoPath: string | null;
  completedAt: string;
  reviewStatus: ProofReviewStatus;
  locationVerified: boolean | null;
  distanceM: number | null;
  accuracyM: number | null;
}

interface ProgressRow {
  id: string;
  userName: string;
  route: ItineraryRoute;
  startedAt: string;
  lastUpdate: string;
  status: "not_started" | "in_progress" | "completed";
  done: Map<string, StopDone>;
  total: number;
}

const STATUS_VARIANT = {
  not_started: "outline",
  in_progress: "secondary",
  completed: "default",
} as const;
const fmtIn = (lang: "pt" | "en") => (d: string) =>
  new Date(d).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

const TXT = {
  pt: {
    status: { not_started: "Não iniciado", in_progress: "Em progresso", completed: "Concluído" },
    title: "Progresso e provas dos roteiros",
    desc: "Auditoria dos roteiros realizados pelos utilizadores. As fotografias são privadas e abertas com links temporários.",
    user: "Utilizador",
    searchUser: "Procurar utilizador",
    routeOrCode: "Roteiro ou código",
    searchRoute: "Procurar roteiro",
    province: "Província",
    allProvinces: "Todas as províncias",
    state: "Estado",
    allStates: "Todos os estados",
    loading: "A carregar…",
    error: "Não foi possível carregar o progresso.",
    retry: "Tentar novamente",
    empty: "Sem progresso registado.",
    noProvince: "Sem província",
    noName: "Utilizador sem nome",
    started: "Início",
    lastUpdate: "Última atualização",
    back: "Voltar à lista",
    stops: "paragens",
    unassigned: "Distribuição por dias a validar",
    day: (n: number) => `Dia ${n}`,
    completedOn: "Concluída em",
    viewProof: "Ver prova fotográfica",
    proofAlt: (s: string) => `Prova fotográfica — ${s}`,
    noProof: "Sem prova fotográfica",
    photoFailed: "Não foi possível abrir a fotografia.",
    notDone: "Não concluída",
  },
  en: {
    status: { not_started: "Not started", in_progress: "In progress", completed: "Completed" },
    title: "Route progress and proofs",
    desc: "Audit of the routes users have done. Photos are private and open through temporary links.",
    user: "User",
    searchUser: "Search user",
    routeOrCode: "Route or code",
    searchRoute: "Search route",
    province: "Province",
    allProvinces: "All provinces",
    state: "Status",
    allStates: "All statuses",
    loading: "Loading…",
    error: "Could not load progress.",
    retry: "Try again",
    empty: "No progress recorded.",
    noProvince: "No province",
    noName: "Unnamed user",
    started: "Started",
    lastUpdate: "Last update",
    back: "Back to list",
    stops: "stops",
    unassigned: "Day distribution to validate",
    day: (n: number) => `Day ${n}`,
    completedOn: "Completed on",
    viewProof: "View photo proof",
    proofAlt: (s: string) => `Photo proof — ${s}`,
    noProof: "No photo proof",
    photoFailed: "Could not open the photo.",
    notDone: "Not completed",
  },
} as const;

/** Admin-only audit of route progress + private photo proofs (RLS grants admins read; photos via signed URLs). */
async function loadProgress(): Promise<ProgressRow[]> {
  const [routes, res] = await Promise.all([
    fetchAllRoutesAdmin(),
    supabase
      .from("route_progress")
      .select(
        "id, route_id, status, started_at, completed_at, profiles:user_id(display_name), route_stop_progress(route_stop_id, photo_path, completed_at, review_status, location_verified, location_distance_m, location_accuracy_m)",
      )
      .order("started_at", { ascending: false }),
  ]);
  if (res.error) throw new Error(res.error.message);
  const byId = new Map(routes.map((r) => [r.id, r]));
  const rows: ProgressRow[] = [];
  for (const p of (res.data ?? []) as never as Array<{
    id: string;
    route_id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    profiles: { display_name: string | null } | null;
    route_stop_progress: {
      route_stop_id: string;
      photo_path: string | null;
      completed_at: string;
      review_status: string;
      location_verified: boolean | null;
      location_distance_m: number | null;
      location_accuracy_m: number | null;
    }[];
  }>) {
    const route = byId.get(p.route_id);
    if (!route) continue;
    const done = new Map<string, StopDone>(
      (p.route_stop_progress ?? []).map((s) => [
        s.route_stop_id,
        {
          stopId: s.route_stop_id,
          photoPath: s.photo_path,
          completedAt: s.completed_at,
          reviewStatus: s.review_status as ProofReviewStatus,
          locationVerified: s.location_verified,
          distanceM: s.location_distance_m,
          accuracyM: s.location_accuracy_m,
        },
      ]),
    );
    const total = routeStopCount(route);
    const dates = [
      p.started_at,
      p.completed_at,
      ...[...done.values()].map((d) => d.completedAt),
    ].filter(Boolean) as string[];
    const status =
      p.status === "completed" || (total > 0 && done.size >= total)
        ? "completed"
        : done.size === 0
          ? "not_started"
          : "in_progress";
    rows.push({
      id: p.id,
      userName: p.profiles?.display_name || "",
      route,
      startedAt: p.started_at,
      lastUpdate: dates.sort().at(-1) ?? p.started_at,
      status,
      done,
      total,
    });
  }
  return rows;
}

export function AdminRouteProgressModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = TXT[lang];
  const fmt = fmtIn(lang);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userQ, setUserQ] = useState("");
  const [routeQ, setRouteQ] = useState("");
  const [province, setProvince] = useState("all");
  const [status, setStatus] = useState<"all" | "in_progress" | "completed">("all");
  const [open, setOpen] = useState<ProgressRow | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadProgress()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "error"))
      .finally(() => setLoading(false));
  }, [tick]);

  const provinces = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach(
      (r) => r.route.province && m.set(r.route.province.code, r.route.province.name[lang]),
    );
    return [...m.entries()];
  }, [rows, lang]);

  const filtered = rows.filter((r) => {
    const rq = routeQ.trim().toLowerCase();
    return (
      r.userName.toLowerCase().includes(userQ.trim().toLowerCase()) &&
      (!rq ||
        r.route.title.toLowerCase().includes(rq) ||
        r.route.code.toLowerCase().includes(rq)) &&
      (province === "all" || r.route.province?.code === province) &&
      (status === "all" || r.status === status)
    );
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {open ? (
          <ProgressDetail row={open} onBack={() => setOpen(null)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.title}</DialogTitle>
              <DialogDescription>{t.desc}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="relative">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={t.user}
                  aria-label={t.searchUser}
                  value={userQ}
                  onChange={(e) => setUserQ(e.target.value)}
                />
              </div>
              <Input
                placeholder={t.routeOrCode}
                aria-label={t.searchRoute}
                value={routeQ}
                onChange={(e) => setRouteQ(e.target.value)}
              />
              <select
                aria-label={t.province}
                className="h-9 rounded-md border border-input bg-background text-foreground px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                <option value="all">{t.allProvinces}</option>
                {provinces.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label={t.state}
                className="h-9 rounded-md border border-input bg-background text-foreground px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="all">{t.allStates}</option>
                <option value="in_progress">{t.status.in_progress}</option>
                <option value="completed">{t.status.completed}</option>
              </select>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center" aria-busy="true">
                {t.loading}
              </p>
            ) : error ? (
              <div className="text-center py-6 space-y-2" role="alert">
                <p className="text-sm text-destructive">{t.error}</p>
                <Button size="sm" variant="outline" onClick={() => setTick((n) => n + 1)}>
                  <RefreshCw className="size-4" />
                  {t.retry}
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t.empty}</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((r) => {
                  const pct = r.total ? Math.round((r.done.size / r.total) * 100) : 0;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setOpen(r)}
                      className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.userName || t.noName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {r.route.title} · {r.route.code} ·{" "}
                            {r.route.province?.name[lang] ?? t.noProvince}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[r.status]}>{t.status[r.status]}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-medium whitespace-nowrap">
                          {r.done.size}/{r.total} · {pct}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.started}: {fmt(r.startedAt)} · {t.lastUpdate}: {fmt(r.lastUpdate)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProgressDetail({ row, onBack }: { row: ProgressRow; onBack: () => void }) {
  const { lang } = useLang();
  const t = TXT[lang];
  const fmt = fmtIn(lang);
  const pct = row.total ? Math.round((row.done.size / row.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {t.back}
      </Button>
      <DialogHeader>
        <DialogTitle>{row.route.title}</DialogTitle>
        <DialogDescription>
          {row.route.code} · {row.route.province?.name[lang] ?? t.noProvince}
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border p-3 space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">{t.user}:</span>{" "}
          <strong>{row.userName || t.noName}</strong>
        </p>
        <p>
          <span className="text-muted-foreground">{t.state}:</span> {t.status[row.status]} ·{" "}
          {t.started} {fmt(row.startedAt)}
        </p>
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2.5 flex-1" />
          <span className="font-medium">
            {row.done.size}/{row.total} {t.stops} · {pct}%
          </span>
        </div>
      </div>
      {row.route.days.map((day) => (
        <div key={day.id} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {day.isUnassigned
              ? t.unassigned
              : `${t.day(day.dayNumber)}${day.title ? ` — ${day.title}` : ""}`}
          </h3>
          {day.stops.map((stop) => (
            <StopLine
              key={stop.id}
              progressId={row.id}
              title={stop.title}
              done={row.done.get(stop.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** What the server's location check concluded, in plain words (the tourist's coordinates are never stored). */
function locationText(done: StopDone, pt: boolean): string {
  if (done.locationVerified === null) {
    return pt
      ? "Paragem sem coordenadas de referência: revisão manual."
      : "Stop without reference coordinates: manual review.";
  }
  const dist = done.distanceM != null ? `${Math.round(done.distanceM)} m` : "—";
  const acc =
    done.accuracyM != null
      ? `±${Math.round(done.accuracyM)} m`
      : pt
        ? "sem localização"
        : "no location";
  return done.locationVerified
    ? pt
      ? `Localização verificada: a ${dist} do local (${acc}).`
      : `Location verified: ${dist} from the place (${acc}).`
    : pt
      ? `Localização não verificada: distância ${dist}, precisão ${acc}.`
      : `Location not verified: distance ${dist}, accuracy ${acc}.`;
}

function StopLine({
  progressId,
  title,
  done,
}: {
  progressId: string;
  title: string;
  done?: StopDone;
}) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const t = TXT[lang];
  const fmt = fmtIn(lang);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<ProofReviewStatus | undefined>(done?.reviewStatus);
  const [deciding, setDeciding] = useState(false);
  const decide = async (approve: boolean) => {
    if (!done) return;
    setDeciding(true);
    try {
      setStatus(await reviewStopProof(progressId, done.stopId, approve));
      toast.success(
        approve
          ? pt
            ? "Prova aprovada."
            : "Proof approved."
          : pt
            ? "Prova rejeitada."
            : "Proof rejected.",
      );
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(
        m.includes("NOT_PENDING")
          ? pt
            ? "Esta prova já foi revista."
            : "This proof was already reviewed."
          : pt
            ? "Não foi possível rever a prova."
            : "Could not review the proof.",
      );
    } finally {
      setDeciding(false);
    }
  };
  const show = async () => {
    if (!done?.photoPath) return;
    const u = await proofUrl(done.photoPath);
    if (u) setUrl(u);
    else setFailed(true);
  };
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-start gap-2">
        {done ? (
          <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
        ) : (
          <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{title}</p>
          {done ? (
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              <p>
                {t.completedOn} {fmt(done.completedAt)}
              </p>
              <p className="flex items-center gap-1">
                <MapPin className="size-3" />
                {locationText(done, pt)}
              </p>
              {status && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      status === "rejected"
                        ? "destructive"
                        : status === "pending"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {pt ? "Prova: " : "Proof: "}
                    {PROOF_STATUS_LABEL[status][lang]}
                  </Badge>
                  {status === "pending" && (
                    <>
                      <Button size="sm" disabled={deciding} onClick={() => void decide(true)}>
                        {pt ? "Aprovar" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deciding}
                        onClick={() => void decide(false)}
                      >
                        {pt ? "Rejeitar" : "Reject"}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {done.photoPath ? (
                url ? (
                  <img
                    src={url}
                    alt={t.proofAlt(title)}
                    className="mt-2 max-h-64 rounded-md border object-contain"
                  />
                ) : (
                  <Button size="sm" variant="outline" className="mt-1" onClick={show}>
                    <ImageIcon className="size-4" />
                    {t.viewProof}
                  </Button>
                )
              ) : (
                <p>{t.noProof}</p>
              )}
              {failed && <p className="text-destructive">{t.photoFailed}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t.notDone}</p>
          )}
        </div>
      </div>
    </div>
  );
}
