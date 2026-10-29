import { supabase } from "@/integrations/supabase/client";
import type { PreciseLocation } from "@/lib/geo";
import { maputoToday } from "@/lib/rewards";

/**
 * Games ↔ achievements bridge. The database is the only authority:
 * steps/quiz answers go through RPCs, completions award XP via trigger,
 * badges are derived from server rows (never stored or set by the client).
 */
export const GAME_PROOFS_BUCKET = "game-proofs";
export const QUIZ_PASS_RATIO = 0.7;

export interface CatalogGame {
  key: string;
  category: string;
  xp: number;
  total: number;
  verification: "quiz" | "photo" | "record";
  unlockAfter: string | null;
}

export interface GameState {
  catalog: CatalogGame[];
  progress: Record<string, number>;
  completed: Record<string, string>; // key -> completed_at
  quizAttempts: {
    gameKey: string;
    correct: number;
    total: number;
    passed: boolean | null;
    finishedAt: string | null;
  }[];
  steps: { gameKey: string; stepRef: string; hasPhoto: boolean; createdAt: string }[];
}

export async function fetchGameState(): Promise<GameState> {
  const [cat, steps, comps, quiz] = await Promise.all([
    supabase
      .from("game_catalog")
      .select("key, category, xp, total, verification, unlock_after")
      .order("sort_order"),
    supabase
      .from("game_steps")
      .select("game_key, step_ref, proof_path, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("game_completions").select("game_key, completed_at"),
    supabase
      .from("game_quiz_attempts")
      .select("game_key, correct_count, question_ids, passed, finished_at")
      .order("started_at", { ascending: false })
      .limit(200),
  ]);
  for (const r of [cat, steps, comps, quiz]) if (r.error) throw new Error(r.error.message);
  const progress: Record<string, number> = {};
  for (const s of steps.data ?? []) progress[s.game_key] = (progress[s.game_key] ?? 0) + 1;
  const completed: Record<string, string> = {};
  for (const c of comps.data ?? []) completed[c.game_key] = c.completed_at;
  return {
    catalog: (cat.data ?? []).map((g) => ({
      key: g.key,
      category: g.category,
      xp: g.xp,
      total: g.total,
      verification: g.verification as CatalogGame["verification"],
      unlockAfter: g.unlock_after,
    })),
    progress,
    completed,
    quizAttempts: (quiz.data ?? []).map((a) => ({
      gameKey: a.game_key,
      correct: a.correct_count,
      total: a.question_ids.length,
      passed: a.passed,
      finishedAt: a.finished_at,
    })),
    steps: (steps.data ?? []).map((s) => ({
      gameKey: s.game_key,
      stepRef: s.step_ref,
      hasPhoto: !!s.proof_path,
      createdAt: s.created_at,
    })),
  };
}

export async function uploadGameProof(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  if (!blob.type.startsWith("image/")) throw new Error("invalid_type");
  if (blob.size > 8 * 1024 * 1024) throw new Error("too_large");
  const ext = blob.type.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(GAME_PROOFS_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export interface StepResult {
  progress: number;
  total: number;
  completed: boolean;
  xp_awarded: number;
  /** Server location check for photo steps; null while game places have no reference coordinates. */
  location_verified: boolean | null;
}

/** The position (when allowed) only feeds the server's distance check; it is never stored. */
export async function submitGameStep(
  gameKey: string,
  stepRef: string | null,
  proofPath: string | null,
  details: Record<string, string>,
  location: PreciseLocation | null = null,
) {
  const { data, error } = await supabase.rpc("submit_game_step", {
    _game_key: gameKey,
    _step_ref: stepRef ?? "",
    _proof_path: proofPath ?? "",
    _details: details,
    _lat: location?.lat,
    _lng: location?.lng,
    _accuracy_m: location?.accuracy,
  });
  if (error) throw new Error(error.message);
  return data as unknown as StepResult;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}
export async function startQuiz(gameKey: string) {
  const { data, error } = await supabase.rpc("start_game_quiz", { _game_key: gameKey });
  if (error) throw new Error(error.message);
  return data as unknown as { attempt_id: string; questions: QuizQuestion[] };
}
export async function answerQuiz(attemptId: string, questionId: string, choice: number) {
  const { data, error } = await supabase.rpc("answer_game_quiz", {
    _attempt_id: attemptId,
    _question_id: questionId,
    _choice: choice,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { correct: boolean; correct_index: number; explanation: string };
}
export async function finishQuiz(attemptId: string) {
  const { data, error } = await supabase.rpc("finish_game_quiz", { _attempt_id: attemptId });
  if (error) throw new Error(error.message);
  return data as unknown as { correct: number; total: number; passed: boolean; xp_awarded: number };
}

/** Same rule as finish_game_quiz: pass at 70%. */
export function quizPassed(correct: number, total: number) {
  return total > 0 && correct * 10 >= total * 7;
}

export function isUnlocked(g: CatalogGame, completed: Record<string, string>) {
  return !g.unlockAfter || !!completed[g.unlockAfter];
}

/** Translate server error codes into user-facing PT/EN text. */
export function gameErrorText(msg: string, pt: boolean): string {
  const map: Record<string, [string, string]> = {
    proof_required: ["É preciso uma foto de prova.", "A proof photo is required."],
    step_already_done: ["Este passo já foi registado.", "This step was already recorded."],
    already_completed: ["Este jogo já está concluído.", "This game is already completed."],
    game_locked: ["Este jogo ainda está bloqueado.", "This game is still locked."],
    already_answered: ["Pergunta já respondida.", "Question already answered."],
    insufficient_balance: ["Saldo de pontos insuficiente.", "Not enough points."],
    out_of_stock: ["Recompensa esgotada.", "Reward out of stock."],
    reward_unavailable: ["Recompensa indisponível.", "Reward unavailable."],
    reward_expired: ["Esta recompensa já expirou.", "This reward has expired."],
    own_reward: [
      "Não podes resgatar uma recompensa do teu próprio negócio.",
      "You can't redeem a reward from your own business.",
    ],
  };
  const hit = Object.keys(map).find((k) => msg.includes(k));
  return hit
    ? map[hit][pt ? 0 : 1]
    : pt
      ? "Não foi possível guardar. Tenta novamente."
      : "Could not save. Please try again.";
}

// ---------- Badges (selos), derived from verified server data ----------
export interface BadgeInput {
  completed: Record<string, string>;
  passedQuizzes: number;
  photoSteps: number;
  bookingsCompleted: number;
  routesCompleted: number;
}
export interface BadgeDef {
  id: string;
  emoji: string;
  name: { pt: string; en: string };
  requirement: { pt: string; en: string };
  progress: (i: BadgeInput) => [number, number];
}
const done = (i: BadgeInput, ...keys: string[]) => keys.filter((k) => i.completed[k]).length;

export const BADGES: BadgeDef[] = [
  {
    id: "s1",
    emoji: "🏖️",
    name: { pt: "Explorador de Praias", en: "Beach Explorer" },
    requirement: { pt: "Concluir «Rota das Praias»", en: "Complete “Beach Route”" },
    progress: (i) => [done(i, "g3"), 1],
  },
  {
    id: "s2",
    emoji: "🤝",
    name: { pt: "Amigo da Comunidade", en: "Community Friend" },
    requirement: { pt: "3 atividades reservadas concluídas", en: "3 completed booked activities" },
    progress: (i) => [i.bookingsCompleted, 3],
  },
  {
    id: "s3",
    emoji: "📜",
    name: { pt: "Historiador", en: "Historian" },
    requirement: { pt: "5 quizzes aprovados", en: "5 passed quizzes" },
    progress: (i) => [i.passedQuizzes, 5],
  },
  {
    id: "s4",
    emoji: "👑",
    name: { pt: "Ekaya Master", en: "Ekaya Master" },
    requirement: {
      pt: "1 roteiro concluído com todas as provas",
      en: "1 route completed with every proof",
    },
    progress: (i) => [i.routesCompleted, 1],
  },
  {
    id: "s5",
    emoji: "📸",
    name: { pt: "Fotógrafo Cultural", en: "Cultural Photographer" },
    requirement: { pt: "10 fotos de prova em jogos", en: "10 game proof photos" },
    progress: (i) => [i.photoSteps, 10],
  },
  {
    id: "s6",
    emoji: "🗺️",
    name: { pt: "Caçador de Tesouros", en: "Treasure Hunter" },
    requirement: { pt: "Concluir uma caça ao tesouro", en: "Complete a treasure hunt" },
    progress: (i) => [Math.min(1, done(i, "g1", "g2", "g3", "g4")), 1],
  },
  {
    id: "s7",
    emoji: "✍️",
    name: { pt: "Contador de Histórias", en: "Storyteller" },
    requirement: {
      pt: "Concluir «Retrato de Artesão» e «Mercado Vivo»",
      en: "Complete “Artisan Portrait” and “Living Market”",
    },
    progress: (i) => [done(i, "g8", "g10"), 2],
  },
  {
    id: "s8",
    emoji: "🌅",
    name: { pt: "Madrugador", en: "Early Bird" },
    requirement: { pt: "Concluir «Do Nascer ao Pôr-do-Sol»", en: "Complete “Sunrise to Sunset”" },
    progress: (i) => [done(i, "g17"), 1],
  },
];

export function badgeStatus(b: BadgeDef, i: BadgeInput) {
  const [have, need] = b.progress(i);
  return { have: Math.min(have, need), need, earned: have >= need };
}

// ---------- Leaderboard & rewards ----------
export async function fetchLeaderboard(limit = 20) {
  const { data, error } = await supabase.rpc("points_leaderboard", { _limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ rank: r.rank, name: r.display_name, xp: r.xp, isMe: r.is_me }));
}

export async function fetchRewards() {
  const [rw, rd] = await Promise.all([
    supabase
      .from("rewards")
      .select(
        "id, title_pt, title_en, description_pt, description_en, cost_points, stock, active, valid_until, business_id, businesses(name, status)",
      )
      .eq("active", true)
      .order("cost_points"),
    supabase
      .from("reward_redemptions")
      .select("id, reward_id, cost_points, code, created_at, rewards(title_pt, title_en)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (rw.error) throw new Error(rw.error.message);
  if (rd.error) throw new Error(rd.error.message);
  // Only rewards a tourist can actually redeem: in date and from an approved business (or the platform).
  const today = maputoToday();
  const rewards = (rw.data ?? []).filter((r) => {
    const biz = r.businesses as { name: string; status: string } | null;
    return (
      (r.valid_until === null || r.valid_until >= today) &&
      (r.business_id === null || biz?.status === "approved")
    );
  });
  return { rewards, redemptions: rd.data ?? [] };
}

export async function redeemReward(rewardId: string, requestId: string) {
  const { data, error } = await supabase.rpc("redeem_reward", {
    _reward_id: rewardId,
    _request_id: requestId,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { redemption_id: string; code: string; duplicate: boolean };
}

/** Inputs for badge criteria, all read from server rows the user owns. */
export async function fetchBadgeInput(state: GameState): Promise<BadgeInput> {
  const { data, error } = await supabase
    .from("points_ledger")
    .select("reason, kind")
    .in("reason", ["booking_completed", "route_completed"])
    .limit(1000);
  if (error) throw new Error(error.message);
  const net = (reason: string) =>
    (data ?? []).reduce(
      (n, r) =>
        r.reason !== reason ? n : r.kind === "award" ? n + 1 : r.kind === "reversal" ? n - 1 : n,
      0,
    );
  return {
    completed: state.completed,
    passedQuizzes: state.quizAttempts.filter((a) => a.passed).length,
    photoSteps: state.steps.filter((s) => s.hasPhoto).length,
    bookingsCompleted: Math.max(0, net("booking_completed")),
    routesCompleted: Math.max(0, net("route_completed")),
  };
}

export async function fetchAchievements() {
  const state = await fetchGameState();
  const badgeInput = await fetchBadgeInput(state);
  return { state, badgeInput };
}
