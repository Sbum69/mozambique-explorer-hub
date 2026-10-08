import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, ImageIcon, MapPin, RefreshCw, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchAllRoutesAdmin, proofUrl, routeStopCount, type ItineraryRoute } from "@/lib/routes";

interface StopDone {
  stopId: string;
  photoPath: string | null;
  completedAt: string;
  lat: number | null;
  lng: number | null;
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

const STATUS_LABEL = { not_started: "Não iniciado", in_progress: "Em progresso", completed: "Concluído" } as const;
const STATUS_VARIANT = { not_started: "outline", in_progress: "secondary", completed: "default" } as const;
const fmt = (d: string) => new Date(d).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });

/** Admin-only audit of route progress + private photo proofs (RLS grants admins read; photos via signed URLs). */
async function loadProgress(): Promise<ProgressRow[]> {
  const [routes, res] = await Promise.all([
    fetchAllRoutesAdmin(),
    supabase
      .from("route_progress")
      .select("id, route_id, status, started_at, completed_at, profiles:user_id(display_name), route_stop_progress(route_stop_id, photo_path, completed_at, lat, lng)")
      .order("started_at", { ascending: false }),
  ]);
  if (res.error) throw new Error(res.error.message);
  const byId = new Map(routes.map((r) => [r.id, r]));
  const rows: ProgressRow[] = [];
  for (const p of (res.data ?? []) as never as Array<{
    id: string; route_id: string; status: string; started_at: string; completed_at: string | null;
    profiles: { display_name: string | null } | null;
    route_stop_progress: { route_stop_id: string; photo_path: string | null; completed_at: string; lat: number | null; lng: number | null }[];
  }>) {
    const route = byId.get(p.route_id);
    if (!route) continue;
    const done = new Map<string, StopDone>(
      (p.route_stop_progress ?? []).map((s) => [s.route_stop_id, { stopId: s.route_stop_id, photoPath: s.photo_path, completedAt: s.completed_at, lat: s.lat, lng: s.lng }]),
    );
    const total = routeStopCount(route);
    const dates = [p.started_at, p.completed_at, ...[...done.values()].map((d) => d.completedAt)].filter(Boolean) as string[];
    const status = p.status === "completed" || (total > 0 && done.size >= total) ? "completed" : done.size === 0 ? "not_started" : "in_progress";
    rows.push({
      id: p.id,
      userName: p.profiles?.display_name || "Utilizador sem nome",
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
    loadProgress().then(setRows).catch((e: unknown) => setError(e instanceof Error ? e.message : "error")).finally(() => setLoading(false));
  }, [tick]);

  const provinces = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.route.province && m.set(r.route.province.code, r.route.province.name.pt));
    return [...m.entries()];
  }, [rows]);

  const filtered = rows.filter((r) => {
    const rq = routeQ.trim().toLowerCase();
    return (
      r.userName.toLowerCase().includes(userQ.trim().toLowerCase()) &&
      (!rq || r.route.title.toLowerCase().includes(rq) || r.route.code.toLowerCase().includes(rq)) &&
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
              <DialogTitle>Progresso e provas dos roteiros</DialogTitle>
              <DialogDescription>Auditoria dos roteiros realizados pelos utilizadores. As fotografias são privadas e abertas com links temporários.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="relative">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Utilizador" aria-label="Procurar utilizador" value={userQ} onChange={(e) => setUserQ(e.target.value)} />
              </div>
              <Input placeholder="Roteiro ou código" aria-label="Procurar roteiro" value={routeQ} onChange={(e) => setRouteQ(e.target.value)} />
              <select aria-label="Província" className="h-9 rounded-md border bg-background px-2 text-sm" value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="all">Todas as províncias</option>
                {provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
              <select aria-label="Estado" className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="all">Todos os estados</option>
                <option value="in_progress">Em progresso</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">A carregar…</p>
            ) : error ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-destructive">Não foi possível carregar o progresso.</p>
                <Button size="sm" variant="outline" onClick={() => setTick((t) => t + 1)}><RefreshCw className="size-4" />Tentar novamente</Button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem progresso registado.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((r) => {
                  const pct = r.total ? Math.round((r.done.size / r.total) * 100) : 0;
                  return (
                    <button key={r.id} onClick={() => setOpen(r)} className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.userName}</p>
                          <p className="text-sm text-muted-foreground truncate">{r.route.title} · {r.route.code} · {r.route.province?.name.pt ?? "Sem província"}</p>
                        </div>
                        <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-medium whitespace-nowrap">{r.done.size}/{r.total} · {pct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Início: {fmt(r.startedAt)} · Última atualização: {fmt(r.lastUpdate)}</p>
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
  const pct = row.total ? Math.round((row.done.size / row.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="size-4" />Voltar à lista</Button>
      <DialogHeader>
        <DialogTitle>{row.route.title}</DialogTitle>
        <DialogDescription>{row.route.code} · {row.route.province?.name.pt ?? "Sem província"}</DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border p-3 space-y-2 text-sm">
        <p><span className="text-muted-foreground">Utilizador:</span> <strong>{row.userName}</strong></p>
        <p><span className="text-muted-foreground">Estado:</span> {STATUS_LABEL[row.status]} · Início {fmt(row.startedAt)}</p>
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2.5 flex-1" />
          <span className="font-medium">{row.done.size}/{row.total} paragens · {pct}%</span>
        </div>
      </div>
      {row.route.days.map((day) => (
        <div key={day.id} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {day.isUnassigned ? "Distribuição por dias a validar" : `Dia ${day.dayNumber}${day.title ? ` — ${day.title}` : ""}`}
          </h3>
          {day.stops.map((stop) => <StopLine key={stop.id} title={stop.title} done={row.done.get(stop.id)} />)}
        </div>
      ))}
    </div>
  );
}

function StopLine({ title, done }: { title: string; done?: StopDone }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const show = async () => {
    if (!done?.photoPath) return;
    const u = await proofUrl(done.photoPath);
    if (u) setUrl(u); else setFailed(true);
  };
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-start gap-2">
        {done ? <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" /> : <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{title}</p>
          {done ? (
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              <p>Concluída em {fmt(done.completedAt)}</p>
              {done.lat != null && done.lng != null ? (
                <p className="flex items-center gap-1"><MapPin className="size-3" />{Number(done.lat).toFixed(5)}, {Number(done.lng).toFixed(5)} (fornecida pelo dispositivo)</p>
              ) : (
                <p>Localização não fornecida</p>
              )}
              {done.photoPath ? (
                url ? (
                  <img src={url} alt={`Prova fotográfica — ${title}`} className="mt-2 max-h-64 rounded-md border object-contain" />
                ) : (
                  <Button size="sm" variant="outline" className="mt-1" onClick={show}><ImageIcon className="size-4" />Ver prova fotográfica</Button>
                )
              ) : (
                <p>Sem prova fotográfica</p>
              )}
              {failed && <p className="text-destructive">Não foi possível abrir a fotografia.</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Não concluída</p>
          )}
        </div>
      </div>
    </div>
  );
}
