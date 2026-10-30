import { requireAuthenticatedUser } from "@/lib/auth";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, lazy, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast as sonner } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLang, type DictKey } from "@/contexts/LanguageContext";
import { GAMES_TXT } from "@/lib/page-texts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import {
  fetchAchievements,
  isUnlocked,
  submitGameStep,
  uploadGameProof,
  startQuiz,
  answerQuiz,
  finishQuiz,
  gameErrorText,
  BADGES,
  badgeStatus,
  type GameState,
  type QuizQuestion,
  type StepResult,
} from "@/lib/games";
import { badgeIcon } from "@/lib/badge-icons";
import {
  ArrowLeft,
  Zap,
  Lock,
  CheckCircle,
  X,
  Trophy,
  Award,
  MapPin,
  Camera,
  Users,
  Brain,
  Clock,
  Heart,
  AlertCircle,
  type LucideIcon,
  CheckCircle2,
  Hourglass,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getGameTask } from "@/data/game-tasks";
import { LOCATION_PROMPT_TEXT, requestPreciseLocation } from "@/lib/geo";

// Challenge fields only show inside the challenge dialog, after a tap: loaded on demand.
const loadTaskFields = () => import("@/components/GameTaskFields");
const WordTask = lazy(() => loadTaskFields().then((m) => ({ default: m.WordTask })));
const ExperienceTask = lazy(() => loadTaskFields().then((m) => ({ default: m.ExperienceTask })));
const ItineraryTask = lazy(() => loadTaskFields().then((m) => ({ default: m.ItineraryTask })));
const TimeOfDayTask = lazy(() => loadTaskFields().then((m) => ({ default: m.TimeOfDayTask })));
const EventTask = lazy(() => loadTaskFields().then((m) => ({ default: m.EventTask })));
const ShareTask = lazy(() => loadTaskFields().then((m) => ({ default: m.ShareTask })));
const TreasureStopPicker = lazy(() =>
  import("@/components/TreasureStopPicker").then((m) => ({ default: m.TreasureStopPicker })),
);
const PhotoChallengeCapture = lazy(() =>
  import("@/components/PhotoChallengeCapture").then((m) => ({ default: m.PhotoChallengeCapture })),
);

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Jogos & Desafios — Ekaya Explore" },
      {
        name: "description",
        content: "Joga, ganha pontos e desbloqueia selos pela tua viagem em Moçambique.",
      },
      { property: "og:title", content: "Jogos & Desafios — Ekaya Explore" },
      {
        property: "og:description",
        content: "Joga, ganha pontos e desbloqueia selos pela tua viagem em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: GamesPage,
});

type GameStatus = "locked" | "available" | "in_progress" | "completed";
type Difficulty = "easy" | "medium" | "hard";

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  points: number;
  difficulty: Difficulty;
  status: GameStatus;
  progress: number;
  total: number;
  badge: string;
  action: string;
  detail: string;
  special?: "aprende-palavra" | "conta-historia" | "quiz";
}

const CATEGORIES = [
  { id: "all", label: "Todos", icon: Trophy },
  { id: "tesouro", label: "Caça ao Tesouro", icon: MapPin },
  { id: "foto", label: "Fotografia", icon: Camera },
  { id: "experiencia", label: "Experiências", icon: Heart },
  {
    id: "conhecimento",
    label: "Conhecimento",
    icon: Brain,
  },
  { id: "tempo", label: "Tempo", icon: Clock },
  { id: "social", label: "Sociais", icon: Users },
];

/** Game texts (title, description, badge, detail) live in the PT/EN dictionary: gameTitle_<id> etc. */
type GameBase = Omit<Game, "title" | "description" | "badge" | "detail">;

const INITIAL_GAMES: GameBase[] = [
  // Tesouro
  {
    id: "g1",
    category: "tesouro",
    icon: MapPin,
    points: 150,
    difficulty: "medium",
    status: "in_progress",
    progress: 2,
    total: 5,
    action: "Continuar",
  },
  {
    id: "g2",
    category: "tesouro",
    icon: MapPin,
    points: 200,
    difficulty: "hard",
    status: "available",
    progress: 0,
    total: 8,
    action: "Começar",
  },
  {
    id: "g3",
    category: "tesouro",
    icon: MapPin,
    points: 180,
    difficulty: "medium",
    status: "available",
    progress: 0,
    total: 3,
    action: "Começar",
  },
  {
    id: "g4",
    category: "tesouro",
    icon: MapPin,
    points: 250,
    difficulty: "hard",
    status: "locked",
    progress: 0,
    total: 4,
    action: "Bloqueado",
  },
  // Foto
  {
    id: "g5",
    category: "foto",
    icon: Camera,
    points: 100,
    difficulty: "easy",
    status: "in_progress",
    progress: 1,
    total: 3,
    action: "Continuar",
  },
  {
    id: "g6",
    category: "foto",
    icon: Camera,
    points: 120,
    difficulty: "easy",
    status: "available",
    progress: 0,
    total: 3,
    action: "Começar",
  },
  {
    id: "g7",
    category: "foto",
    icon: Camera,
    points: 140,
    difficulty: "medium",
    status: "available",
    progress: 0,
    total: 4,
    action: "Começar",
  },
  {
    id: "g8",
    category: "foto",
    icon: Camera,
    points: 90,
    difficulty: "easy",
    status: "available",
    progress: 0,
    total: 1,
    action: "Começar",
  },
  // Experiência
  {
    id: "g9",
    category: "experiencia",
    icon: Heart,
    points: 200,
    difficulty: "medium",
    status: "available",
    progress: 0,
    total: 1,
    action: "Começar",
  },
  {
    id: "g10",
    category: "experiencia",
    icon: Heart,
    points: 130,
    difficulty: "easy",
    status: "in_progress",
    progress: 0,
    total: 1,
    action: "Continuar",
  },
  {
    id: "g11",
    category: "experiencia",
    icon: Heart,
    points: 80,
    difficulty: "easy",
    status: "available",
    progress: 0,
    total: 3,
    action: "Começar",
    special: "aprende-palavra",
  },
  {
    id: "g12",
    category: "experiencia",
    icon: Heart,
    points: 220,
    difficulty: "hard",
    status: "locked",
    progress: 0,
    total: 1,
    action: "Bloqueado",
  },
  // Conhecimento
  {
    id: "g13",
    category: "conhecimento",
    icon: Brain,
    points: 50,
    difficulty: "medium",
    status: "available",
    progress: 0,
    total: 5,
    action: "Jogar Quiz",
    special: "quiz",
  },
  {
    id: "g14",
    category: "conhecimento",
    icon: Brain,
    points: 60,
    difficulty: "easy",
    status: "available",
    progress: 0,
    total: 5,
    action: "Jogar Quiz",
    special: "quiz",
  },
  {
    id: "g15",
    category: "conhecimento",
    icon: Brain,
    points: 70,
    difficulty: "hard",
    status: "locked",
    progress: 0,
    total: 5,
    action: "Bloqueado",
  },
  // Tempo
  {
    id: "g16",
    category: "tempo",
    icon: Clock,
    points: 300,
    difficulty: "hard",
    status: "available",
    progress: 0,
    total: 6,
    action: "Começar",
  },
  {
    id: "g17",
    category: "tempo",
    icon: Clock,
    points: 160,
    difficulty: "medium",
    status: "available",
    progress: 0,
    total: 2,
    action: "Começar",
  },
  {
    id: "g18",
    category: "tempo",
    icon: Clock,
    points: 240,
    difficulty: "hard",
    status: "locked",
    progress: 0,
    total: 3,
    action: "Bloqueado",
  },
  // Social
  {
    id: "g19",
    category: "social",
    icon: Users,
    points: 100,
    difficulty: "easy",
    status: "available",
    progress: 0,
    total: 1,
    action: "Começar",
  },
  {
    id: "g20",
    category: "social",
    icon: Users,
    points: 90,
    difficulty: "easy",
    status: "in_progress",
    progress: 1,
    total: 3,
    action: "Continuar",
    special: "conta-historia",
  },
  {
    id: "g21",
    category: "social",
    icon: Users,
    points: 250,
    difficulty: "medium",
    status: "available",
    progress: 0,
    total: 2,
    action: "Começar",
  },
];

const DIFF_BADGE: Record<Difficulty, { label: string; cls: string }> = {
  easy: {
    label: "Fácil",
    cls: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  medium: {
    label: "Médio",
    cls: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  hard: {
    label: "Difícil",
    cls: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

function localizeGame(g: GameBase, t: (key: DictKey) => string): Game {
  const text = (kind: "Title" | "Desc" | "Badge" | "Detail") => t(`game${kind}_${g.id}` as DictKey);
  return {
    ...g,
    title: text("Title"),
    description: text("Desc"),
    badge: text("Badge"),
    detail: text("Detail"),
  };
}

function applyState(base: GameBase[], state: GameState | undefined): GameBase[] {
  if (!state) return base;
  const byKey = new Map(state.catalog.map((c) => [c.key, c]));
  return base.flatMap((g) => {
    const c = byKey.get(g.id);
    if (!c) return [];
    const done = !!state.completed[g.id];
    const progress = done ? c.total : Math.min(c.total, state.progress[g.id] ?? 0);
    const status: GameStatus = done
      ? "completed"
      : !isUnlocked(c, state.completed)
        ? "locked"
        : progress > 0
          ? "in_progress"
          : "available";
    return [
      {
        ...g,
        points: c.xp,
        total: c.total,
        progress,
        status,
        action:
          status === "in_progress" ? "Continuar" : g.special === "quiz" ? "Jogar Quiz" : "Começar",
      },
    ];
  });
}

function GamesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { authUser } = useAuth();
  const { lang, t } = useLang();
  const pt = lang === "pt";
  const uid = authUser?.id;
  const q = useQuery({
    queryKey: ["achievements", uid],
    queryFn: fetchAchievements,
    enabled: !!uid,
  });
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"jogos" | "selos">("jogos");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [quizGame, setQuizGame] = useState<Game | null>(null);

  const games = useMemo(
    () => applyState(INITIAL_GAMES, q.data?.state).map((g) => localizeGame(g, t)),
    [q.data, t],
  );
  const filteredGames = useMemo(
    () => (activeCategory === "all" ? games : games.filter((g) => g.category === activeCategory)),
    [games, activeCategory],
  );
  const completed = games.filter((g) => g.status === "completed").length;
  const inProgress = games.filter((g) => g.status === "in_progress").length;
  const badges = q.data ? BADGES.map((b) => ({ b, st: badgeStatus(b, q.data.badgeInput) })) : [];
  const earnedSelos = badges.filter((x) => x.st.earned).length;
  const xpEarned = q.data
    ? q.data.state.catalog
        .filter((c) => q.data.state.completed[c.key])
        .reduce((n, c) => n + c.xp, 0)
    : 0;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["achievements", uid] });
    qc.invalidateQueries({ queryKey: ["my-points", uid] });
    qc.invalidateQueries({ queryKey: ["leaderboard", uid] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />{" "}
            <span className="sr-only sm:not-sr-only">{pt ? "Voltar" : "Back"}</span>
          </button>
          <h1 className="min-w-0 truncate font-bold text-sm sm:text-base">
            {pt ? "Jogos & Desafios" : "Games & Challenges"}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/gamification">
                <Trophy className="size-4" />
                {/* Phones: icon only (name kept for screen readers). */}
                <span className="sr-only sm:not-sr-only">{pt ? "Conquistas" : "Achievements"}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {q.isError && (
          <div className="mb-4 rounded-xl border p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="size-5 text-destructive" />
            <span className="flex-1">
              {pt
                ? "Não foi possível carregar o teu progresso."
                : "We couldn't load your progress."}
            </span>
            <Button size="sm" variant="outline" onClick={() => q.refetch()}>
              {pt ? "Tentar novamente" : "Try again"}
            </Button>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[10px] border border-border bg-card p-6 pt-8 sm:p-8 sm:pt-10"
        >
          <div className="capulana-band absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: pt ? "XP de jogos" : "Game XP",
                value: q.isLoading ? "…" : xpEarned,
                icon: Zap,
              },
              {
                label: pt ? "Concluídos" : "Completed",
                value: q.isLoading ? "…" : completed,
                icon: CheckCircle2,
              },
              {
                label: pt ? "Em progresso" : "In progress",
                value: q.isLoading ? "…" : inProgress,
                icon: Hourglass,
              },
              {
                label: pt ? "Selos" : "Badges",
                value: q.isLoading ? "…" : `${earnedSelos}/${BADGES.length}`,
                icon: Medal,
              },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border p-4">
                <s.icon className="size-5 text-primary" aria-hidden="true" />
                <p className="font-display text-3xl font-bold mt-1 tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {pt
              ? "O progresso fica guardado na tua conta. O XP só é atribuído por jogos verificados (quiz corrigido no servidor ou foto de prova)."
              : "Progress is saved to your account. XP is only awarded for verified games (server-scored quiz or proof photo)."}
          </p>
        </motion.div>

        <div className="mt-8 flex gap-2 border-b">
          {(["jogos", "selos"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-semibold text-sm transition-colors relative ${
                activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "jogos" ? (pt ? "Jogos" : "Games") : pt ? "Selos" : "Badges"}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === "jogos" && (
          <>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow"
                        : "bg-card hover:bg-muted border-border text-foreground"
                    }`}
                  >
                    <cat.icon className="size-4" />
                    {GAMES_TXT[lang].category[
                      cat.id as keyof (typeof GAMES_TXT)["pt"]["category"]
                    ] ?? cat.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGames.map((game, i) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={i}
                  onOpen={() => {
                    if (game.status === "locked" || game.status === "completed" || !q.data) return;
                    if (game.special === "quiz") setQuizGame(game);
                    else setSelectedGame(game);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === "selos" && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map(({ b, st }) => (
              <div
                key={b.id}
                className={`rounded-[10px] p-5 text-center border ${st.earned ? "bg-accent border-primary" : "bg-muted/30 border-dashed border-input"}`}
              >
                <div
                  className={`mx-auto size-20 rounded-full flex items-center justify-center ${st.earned ? "bg-card text-primary" : "bg-muted"}`}
                >
                  {st.earned ? (
                    (() => {
                      const I = badgeIcon(b.id);
                      return <I className="size-9" aria-hidden="true" />;
                    })()
                  ) : (
                    <Lock className="size-7 text-muted-foreground" />
                  )}
                </div>
                <h3 className="mt-3 font-bold text-sm">{b.name[lang]}</h3>
                <p className="text-xs text-muted-foreground mt-1">{b.requirement[lang]}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {st.have}/{st.need}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedGame && q.data && uid && (
          <Suspense fallback={null}>
            <GameDetailModal
              game={selectedGame}
              userId={uid}
              doneRefs={q.data.state.steps
                .filter((s) => s.gameKey === selectedGame.id)
                .map((s) => s.stepRef)}
              history={q.data.state.steps
                .filter((s) => s.gameKey === selectedGame.id)
                .map((s) => s.createdAt)}
              onClose={() => setSelectedGame(null)}
              onSaved={(r) => {
                refresh();
                sonner.success(
                  r.completed
                    ? r.xp_awarded > 0
                      ? pt
                        ? `Jogo concluído! +${r.xp_awarded} XP`
                        : `Game completed! +${r.xp_awarded} XP`
                      : pt
                        ? "Jogo concluído (sem XP)"
                        : "Game completed (no XP)"
                    : pt
                      ? `Progresso guardado: ${r.progress}/${r.total}`
                      : `Progress saved: ${r.progress}/${r.total}`,
                );
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quizGame && (
          <QuizModal
            game={quizGame}
            attempts={
              q.data?.state.quizAttempts.filter((a) => a.gameKey === quizGame.id && a.finishedAt)
                .length ?? 0
            }
            onClose={() => setQuizGame(null)}
            onFinished={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GameCard({ game, index, onOpen }: { game: Game; index: number; onOpen: () => void }) {
  const { lang } = useLang();
  const locked = game.status === "locked";
  const completed = game.status === "completed";
  const pct = (game.progress / game.total) * 100;
  const diff = DIFF_BADGE[game.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-[10px] border overflow-hidden shadow-sm ${locked ? "border-dashed" : ""}`}
    >
      <div className="capulana-band h-1.5" aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="size-12 rounded-md bg-accent text-accent-foreground flex items-center justify-center">
            <game.icon className="size-5" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[10px] ${diff.cls}`}>
              {GAMES_TXT[lang].difficulty[
                game.difficulty as keyof (typeof GAMES_TXT)["pt"]["difficulty"]
              ] ?? diff.label}
            </Badge>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Zap className="size-3" /> {game.points}
            </div>
          </div>
        </div>
        <h3 className="font-bold text-base">{game.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
          {game.description}
        </p>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>
              {game.progress}/{game.total}
            </span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="h-full bg-primary"
            />
          </div>
        </div>

        <Button
          onClick={onOpen}
          disabled={locked}
          className={`w-full mt-4 ${
            completed
              ? "bg-success text-success-foreground hover:bg-success/90"
              : locked
                ? "bg-muted text-muted-foreground"
                : ""
          }`}
        >
          {locked ? (
            <>
              <Lock className="size-4" /> {GAMES_TXT[lang].locked}
            </>
          ) : completed ? (
            <>
              <CheckCircle className="size-4" /> {GAMES_TXT[lang].completed}
            </>
          ) : (
            (GAMES_TXT[lang].action[game.action as keyof (typeof GAMES_TXT)["pt"]["action"]] ??
            game.action)
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function GameDetailModal({
  game,
  userId,
  doneRefs,
  history,
  onClose,
  onSaved,
}: {
  game: Game;
  userId: string;
  doneRefs: string[];
  history: string[];
  onClose: () => void;
  onSaved: (r: StepResult) => void;
}) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const [success, setSuccess] = useState<StepResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const task = getGameTask(game.id);
  const isTreasure = !!task.stops;
  const doneStops = doneRefs;
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [itinerarySel, setItinerarySel] = useState<{ itineraryId: string; stopId: number } | null>(
    null,
  );
  const [timeOfDay, setTimeOfDay] = useState<{ moment: "sunrise" | "sunset"; time: string } | null>(
    null,
  );
  const [eventInfo, setEventInfo] = useState<{ name: string; date: string } | null>(null);
  const [shared, setShared] = useState(false);
  const [word, setWord] = useState<{ word: string; meaning: string } | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const pct = (game.progress / game.total) * 100;
  const requiresPhoto = !!task.photo;

  const setLabel = (k: string, v?: string) => setLabels((p) => ({ ...p, [k]: v ?? "" }));

  const miss = GAMES_TXT[lang].missing;
  const missing: string | null = (() => {
    if (task.stops && !selectedStop) return miss.stop;
    if (task.experience && !experienceId) return miss.experience;
    if (task.itinerary && !itinerarySel) return miss.itinerary;
    if (task.timeOfDay && !timeOfDay) return miss.timeOfDay;
    if (task.event && !eventInfo) return miss.event;
    if (task.word && !word) return miss.word;
    if (task.note && note.trim().length < task.note) return miss.note(task.note);
    if (task.share && !shared) return miss.share;
    if (requiresPhoto && !photo) return miss.photo;
    return null;
  })();

  const handleConfirm = async () => {
    if (missing || saving) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const proofPath = requiresPhoto && photo ? await uploadGameProof(userId, photo) : null;
      const location = proofPath ? await requestPreciseLocation() : null;
      const stepRef = isTreasure
        ? selectedStop
        : task.timeOfDay && timeOfDay
          ? timeOfDay.moment
          : null;
      const details: Record<string, string> = {};
      for (const [k, v] of Object.entries(labels)) if (v) details[k] = v.slice(0, 200);
      if (note.trim()) details.note = note.trim().slice(0, 1000);
      const r = await submitGameStep(game.id, stepRef, proofPath, details, location);
      setSuccess(r);
      onSaved(r);
      setTimeout(onClose, 1500);
    } catch (e) {
      setSaveErr(gameErrorText((e as Error).message, pt));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-[10px] w-full max-w-lg shadow-[var(--shadow-overlay)] overflow-hidden"
      >
        <div className="border-b border-border p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-8 rounded-md flex items-center justify-center hover:bg-accent"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-md bg-accent text-accent-foreground flex items-center justify-center">
              <game.icon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{game.title}</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Zap className="size-3" /> {game.points} pts
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {success ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="py-8 text-center">
              <CheckCircle className="size-20 text-green-700 dark:text-green-300 mx-auto mb-3" />
              <p className="font-bold text-lg">
                {success.completed
                  ? pt
                    ? "Jogo concluído!"
                    : "Game completed!"
                  : pt
                    ? "Progresso guardado"
                    : "Progress saved"}
              </p>
              <p className="text-sm text-muted-foreground">
                {success.progress}/{success.total}
                {success.xp_awarded > 0 ? ` · +${success.xp_awarded} XP` : ""}
              </p>
            </motion.div>
          ) : (
            <>
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-xs font-bold uppercase mb-1 text-muted-foreground">
                  Como funciona
                </p>
                <p className="text-sm">{game.detail}</p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>
                    {game.progress}/{game.total}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <Award className="size-5 text-amber-700 dark:text-amber-300" />
                <p className="text-sm">
                  <span className="text-muted-foreground">Selo:</span> <strong>{game.badge}</strong>
                </p>
              </div>

              {game.points === 0 && (
                <p className="text-xs rounded-xl border p-3 text-muted-foreground">
                  {pt
                    ? "Este desafio não pode ser verificado pelo sistema: o progresso fica guardado, mas não dá XP."
                    : "This challenge can't be verified by the system: progress is saved but gives no XP."}
                </p>
              )}
              {history.length > 0 && (
                <div className="rounded-xl border p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                    {GAMES_TXT[lang].previousRecords}
                  </p>
                  <ul className="space-y-1">
                    {history.slice(0, 4).map((at, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="size-3 text-primary shrink-0" />{" "}
                        {new Date(at).toLocaleString(pt ? "pt-PT" : "en-GB")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {task.word && (
                <WordTask
                  value={word}
                  onChange={(v, label) => {
                    setWord(v);
                    setLabel("word", label);
                  }}
                />
              )}

              {task.experience && (
                <ExperienceTask
                  value={experienceId}
                  onChange={(id, label) => {
                    setExperienceId(id);
                    setLabel("experience", label);
                  }}
                />
              )}

              {task.itinerary && (
                <ItineraryTask
                  value={itinerarySel}
                  onChange={(v, label) => {
                    setItinerarySel(v);
                    setLabel("itinerary", label);
                  }}
                />
              )}

              {task.timeOfDay && (
                <TimeOfDayTask
                  value={timeOfDay}
                  onChange={(v, label) => {
                    setTimeOfDay(v);
                    setLabel("timeOfDay", label);
                  }}
                />
              )}

              {task.event && (
                <EventTask
                  value={eventInfo}
                  onChange={(v, label) => {
                    setEventInfo(v);
                    setLabel("event", label);
                  }}
                />
              )}

              {task.share && (
                <ShareTask
                  title={game.title}
                  text={`Estou a fazer o desafio "${game.title}" na Ekaya Explore!`}
                  done={shared}
                  onDone={() => setShared(true)}
                />
              )}

              {task.note && (
                <div>
                  <label className="text-sm font-medium">
                    {game.special === "conta-historia" ? "A tua história" : "Descreve o momento"}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Escreve aqui..."
                    rows={4}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.trim().length}/{task.note} caracteres
                  </p>
                </div>
              )}

              {isTreasure && (
                <TreasureStopPicker
                  gameId={game.id}
                  doneIds={doneStops}
                  selectedId={selectedStop}
                  onSelect={setSelectedStop}
                />
              )}

              {requiresPhoto && (!isTreasure || selectedStop) && (
                <>
                  <PhotoChallengeCapture onPhoto={setPhoto} />
                  <p className="flex gap-2 text-xs text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    {LOCATION_PROMPT_TEXT[lang]}{" "}
                    {pt
                      ? "Os desafios ainda não têm locais de referência, por isso a prova fica registada como não verificada, sem afetar os pontos."
                      : "Challenges have no reference places yet, so the proof is recorded as unverified, without affecting points."}
                  </p>
                </>
              )}

              {saveErr && <p className="text-sm text-destructive">{saveErr}</p>}
              <Button
                onClick={handleConfirm}
                disabled={!!missing || saving}
                className="w-full disabled:opacity-50"
              >
                {missing ??
                  (saving
                    ? pt
                      ? "A guardar…"
                      : "Saving…"
                    : pt
                      ? "Guardar progresso"
                      : "Save progress")}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuizModal({
  game,
  attempts,
  onClose,
  onFinished,
}: {
  game: Game;
  attempts: number;
  onClose: () => void;
  onFinished: () => void;
}) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const [session, setSession] = useState<{ id: string; questions: QuizQuestion[] } | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correct_index: number;
    explanation: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    passed: boolean;
    xp_awarded: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const begin = async () => {
    setBusy(true);
    setErr(null);
    try {
      const s = await startQuiz(game.id);
      setSession({ id: s.attempt_id, questions: s.questions });
      setCurrent(0);
      setSelected(null);
      setFeedback(null);
      setScore(0);
      setResult(null);
    } catch (e) {
      setErr(gameErrorText((e as Error).message, pt));
    } finally {
      setBusy(false);
    }
  };

  const q = session?.questions[current];
  const isLast = !!session && current === session.questions.length - 1;

  const choose = async (idx: number) => {
    if (!session || !q || selected !== null || busy) return;
    setSelected(idx);
    setBusy(true);
    try {
      const f = await answerQuiz(session.id, q.id, idx);
      setFeedback(f);
      if (f.correct) setScore((s) => s + 1);
    } catch (e) {
      setErr(gameErrorText((e as Error).message, pt));
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!session) return;
    if (!isLast) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setFeedback(null);
      return;
    }
    setBusy(true);
    try {
      setResult(await finishQuiz(session.id));
      onFinished();
    } catch (e) {
      setErr(gameErrorText((e as Error).message, pt));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-[10px] w-full max-w-xl shadow-[var(--shadow-overlay)] overflow-hidden"
        role="dialog"
        aria-label={game.title}
      >
        <div className="bg-primary text-primary-foreground p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="size-5" />
              <p className="font-bold">{game.title}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={pt ? "Fechar" : "Close"}
              className="size-8 rounded-full bg-background/20 flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>
          {session && !result && (
            <>
              <div className="flex justify-between text-xs opacity-90 mb-1">
                <span>
                  {pt ? "Pergunta" : "Question"} {current + 1} / {session.questions.length}
                </span>
                <span>
                  {pt ? "Certas" : "Correct"}: {score}
                </span>
              </div>
              <div className="h-2 bg-background/20 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${((current + 1) / session.questions.length) * 100}%` }}
                  className="h-full bg-background"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6">
          {err && (
            <p className="mb-3 text-sm text-destructive flex gap-2">
              <AlertCircle className="size-4 shrink-0" />
              {err}
            </p>
          )}
          {!session ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{pt ? "Regras" : "Rules"}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  {pt ? "7 perguntas sorteadas pelo servidor." : "7 questions drawn by the server."}
                </li>
                <li>
                  {pt
                    ? "Cada resposta é final e corrigida no servidor."
                    : "Each answer is final and scored on the server."}
                </li>
                <li>
                  {pt
                    ? "Aprovas com 70% (5 de 7). Podes repetir até aprovar."
                    : "Pass with 70% (5 of 7). You can retry until you pass."}
                </li>
                <li>
                  {pt
                    ? `Ao aprovar: +${game.points} XP, uma única vez.`
                    : `On passing: +${game.points} XP, once.`}
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                {pt ? `Tentativas anteriores: ${attempts}` : `Previous attempts: ${attempts}`}
              </p>
              <Button className="w-full" disabled={busy} onClick={begin}>
                {pt ? "Começar quiz" : "Start quiz"}
              </Button>
            </div>
          ) : result ? (
            <div className="text-center py-6">
              <Trophy
                className={`size-20 mx-auto ${result.passed ? "text-primary" : "text-muted-foreground"}`}
              />
              <h3 className="text-2xl font-bold mt-3">
                {result.passed ? (pt ? "Aprovado!" : "Passed!") : pt ? "Ainda não" : "Not yet"}
              </h3>
              <p className="text-muted-foreground">
                {pt
                  ? `Acertaste ${result.correct} de ${result.total}`
                  : `You got ${result.correct} of ${result.total}`}
              </p>
              <p className="text-sm font-semibold mt-1 text-primary">
                {result.xp_awarded > 0
                  ? `+${result.xp_awarded} XP`
                  : result.passed
                    ? pt
                      ? "Já concluído antes"
                      : "Already completed"
                    : pt
                      ? "Precisas de 70% para aprovar"
                      : "You need 70% to pass"}
              </p>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  {pt ? "Fechar" : "Close"}
                </Button>
                {!result.passed && (
                  <Button className="flex-1" disabled={busy} onClick={begin}>
                    {pt ? "Tentar novamente" : "Try again"}
                  </Button>
                )}
              </div>
            </div>
          ) : q ? (
            <>
              <h3 className="font-bold text-lg mb-4">{q.question}</h3>
              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  let cls = "border-border hover:bg-muted/50";
                  if (feedback) {
                    if (idx === feedback.correct_index) cls = "border-primary bg-primary/10";
                    else if (idx === selected) cls = "border-destructive bg-destructive/10";
                    else cls = "border-border bg-muted/30 text-muted-foreground";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => choose(idx)}
                      disabled={selected !== null}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${cls}`}
                    >
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {feedback && (
                <div
                  className={`mt-4 p-3 rounded-xl flex items-start gap-2 text-sm ${feedback.correct ? "bg-primary/10" : "bg-destructive/10"}`}
                >
                  {feedback.correct ? (
                    <CheckCircle className="size-5 shrink-0 text-primary" />
                  ) : (
                    <AlertCircle className="size-5 shrink-0 text-destructive" />
                  )}
                  <p>{feedback.explanation}</p>
                </div>
              )}
              <Button disabled={!feedback || busy} onClick={next} className="w-full mt-4">
                {isLast
                  ? pt
                    ? "Ver resultado"
                    : "See result"
                  : pt
                    ? "Próxima pergunta"
                    : "Next question"}
              </Button>
            </>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
