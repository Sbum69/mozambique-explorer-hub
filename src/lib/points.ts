import { supabase } from "@/integrations/supabase/client";

/**
 * Bloco 10 — central gamification config.
 * Point VALUES are awarded only by database triggers (public.points_value); keep these in sync.
 * Levels are derived from the server-side total and are never stored or editable by the client.
 */
export const POINT_VALUES = {
  booking_completed: 100,
  route_stop_proof: 20,
  route_completed: 150,
} as const;

export type PointsReason = keyof typeof POINT_VALUES;

export const REASON_LABELS: Record<PointsReason, { pt: string; en: string }> = {
  booking_completed: { pt: "Atividade concluída", en: "Activity completed" },
  route_stop_proof: { pt: "Paragem de roteiro comprovada", en: "Route stop proven" },
  route_completed: { pt: "Roteiro concluído", en: "Route completed" },
};

export interface LevelDef {
  level: number;
  minPoints: number;
  emoji: string;
  name: { pt: string; en: string };
}

export const LEVELS: LevelDef[] = [
  { level: 1, minPoints: 0, emoji: "🌱", name: { pt: "Visitante Curioso", en: "Curious Visitor" } },
  { level: 2, minPoints: 100, emoji: "🧭", name: { pt: "Explorador", en: "Explorer" } },
  { level: 3, minPoints: 300, emoji: "🥾", name: { pt: "Viajante Comunitário", en: "Community Traveller" } },
  { level: 4, minPoints: 700, emoji: "🌍", name: { pt: "Guardião Local", en: "Local Guardian" } },
  { level: 5, minPoints: 1500, emoji: "🏆", name: { pt: "Embaixador Ekaya", en: "Ekaya Ambassador" } },
];

export function levelFor(total: number) {
  const safe = Math.max(0, Math.floor(total));
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (safe >= LEVELS[i].minPoints) idx = i;
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const toNext = next ? next.minPoints - safe : 0;
  const progress = next ? ((safe - current.minPoints) / (next.minPoints - current.minPoints)) * 100 : 100;
  return { current, next, toNext, progress: Math.min(100, Math.max(0, progress)) };
}

export interface PointsTx {
  id: string;
  points: number;
  kind: "award" | "reversal";
  reason: PointsReason;
  createdAt: string;
}

export async function fetchMyPoints(limit = 10): Promise<{ total: number; recent: PointsTx[] }> {
  const [totalRes, listRes] = await Promise.all([
    supabase.rpc("my_points_total"),
    supabase
      .from("points_ledger")
      .select("id, points, kind, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (totalRes.error) throw new Error(totalRes.error.message);
  if (listRes.error) throw new Error(listRes.error.message);
  return {
    total: Number(totalRes.data ?? 0),
    recent: (listRes.data ?? []).map((r) => ({
      id: r.id,
      points: r.points,
      kind: r.kind as PointsTx["kind"],
      reason: r.reason as PointsReason,
      createdAt: r.created_at,
    })),
  };
}
