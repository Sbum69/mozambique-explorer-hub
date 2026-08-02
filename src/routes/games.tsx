import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  ArrowLeft, Zap, Lock, CheckCircle, X, Trophy, Award,
  MapPin, Camera, Users, Brain, Clock, Heart, AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PhotoChallengeCapture } from "@/components/PhotoChallengeCapture";
import { TreasureStopPicker } from "@/components/TreasureStopPicker";
import { getCheckedStops, saveCheckedStops } from "@/data/treasure-stops";



export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Jogos & Desafios — Ekaya Explore" },
      { name: "description", content: "Joga, ganha pontos e desbloqueia selos pela tua viagem em Moçambique." },
    ],
  }),
  component: GamesPage,
});

type GameStatus = "locked" | "available" | "in_progress" | "completed";
type Difficulty = "easy" | "medium" | "hard";

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryColor: string;
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
  { id: "tesouro", label: "Caça ao Tesouro", icon: MapPin, color: "from-amber-500 to-orange-600" },
  { id: "foto", label: "Fotografia", icon: Camera, color: "from-pink-500 to-rose-600" },
  { id: "experiencia", label: "Experiências", icon: Heart, color: "from-green-500 to-emerald-600" },
  { id: "conhecimento", label: "Conhecimento", icon: Brain, color: "from-purple-500 to-violet-600" },
  { id: "tempo", label: "Tempo", icon: Clock, color: "from-blue-500 to-cyan-600" },
  { id: "social", label: "Sociais", icon: Users, color: "from-teal-500 to-green-600" },
];

const COLOR_MAP: Record<string, string> = {
  tesouro: "from-amber-500 to-orange-600",
  foto: "from-pink-500 to-rose-600",
  experiencia: "from-green-500 to-emerald-600",
  conhecimento: "from-purple-500 to-violet-600",
  tempo: "from-blue-500 to-cyan-600",
  social: "from-teal-500 to-green-600",
};

const INITIAL_GAMES: Game[] = [
  // Tesouro
  { id: "g1", title: "Explorador de Story Stops", description: "Visita 5 Story Stops na cidade.", category: "tesouro", categoryColor: COLOR_MAP.tesouro, icon: MapPin, points: 150, difficulty: "medium", status: "in_progress", progress: 2, total: 5, badge: "Caçador de Tesouros", action: "Continuar", detail: "Cada Story Stop revela uma história única do local. Visita pelo menos 5 para completar." },
  { id: "g2", title: "Bairro Completo", description: "Descobre todos os pontos de um bairro.", category: "tesouro", categoryColor: COLOR_MAP.tesouro, icon: MapPin, points: 200, difficulty: "hard", status: "available", progress: 0, total: 8, badge: "Explorador Urbano", action: "Começar", detail: "Visita os 8 pontos marcados num bairro à tua escolha." },
  { id: "g3", title: "Rota das Praias", description: "Conhece 3 praias diferentes.", category: "tesouro", categoryColor: COLOR_MAP.tesouro, icon: MapPin, points: 180, difficulty: "medium", status: "available", progress: 0, total: 3, badge: "Explorador de Praias", action: "Começar", detail: "Visita 3 praias distintas em Moçambique e regista a tua presença." },
  { id: "g4", title: "Aventura na Ilha", description: "Explora um arquipélago completo.", category: "tesouro", categoryColor: COLOR_MAP.tesouro, icon: MapPin, points: 250, difficulty: "hard", status: "locked", progress: 0, total: 4, badge: "Insular", action: "Bloqueado", detail: "Desbloqueia após completar 'Rota das Praias'." },
  // Foto
  { id: "g5", title: "Foto com História", description: "Tira fotos a 3 locais históricos.", category: "foto", categoryColor: COLOR_MAP.foto, icon: Camera, points: 100, difficulty: "easy", status: "in_progress", progress: 1, total: 3, badge: "Fotógrafo Cultural", action: "Continuar", detail: "Documenta locais com importância histórica." },
  { id: "g6", title: "Sabores de Moçambique", description: "Fotografa 3 pratos típicos.", category: "foto", categoryColor: COLOR_MAP.foto, icon: Camera, points: 120, difficulty: "easy", status: "available", progress: 0, total: 3, badge: "Foodie", action: "Começar", detail: "Matapa, caril de caranguejo, frango à zambeziana..." },
  { id: "g7", title: "Cores da Comunidade", description: "Captura 4 momentos comunitários.", category: "foto", categoryColor: COLOR_MAP.foto, icon: Camera, points: 140, difficulty: "medium", status: "available", progress: 0, total: 4, badge: "Olhar Atento", action: "Começar", detail: "Sempre com permissão das pessoas fotografadas." },
  { id: "g8", title: "Retrato de Artesão", description: "Conhece e fotografa um artesão.", category: "foto", categoryColor: COLOR_MAP.foto, icon: Camera, points: 90, difficulty: "easy", status: "available", progress: 0, total: 1, badge: "Embaixador", action: "Começar", detail: "Pede sempre permissão e oferece uma cópia da foto." },
  // Experiência
  { id: "g9", title: "Amigo da Comunidade", description: "Participa numa experiência comunitária.", category: "experiencia", categoryColor: COLOR_MAP.experiencia, icon: Heart, points: 200, difficulty: "medium", status: "available", progress: 0, total: 1, badge: "Amigo da Comunidade", action: "Começar", detail: "Reserva uma experiência local através da plataforma." },
  { id: "g10", title: "Mercado Vivo", description: "Compra algo direto a um produtor local.", category: "experiencia", categoryColor: COLOR_MAP.experiencia, icon: Heart, points: 130, difficulty: "easy", status: "in_progress", progress: 0, total: 1, badge: "Apoio Local", action: "Continuar", detail: "Visita um mercado tradicional e apoia produtores locais." },
  { id: "g11", title: "Aprende uma Palavra", description: "Aprende 3 palavras em línguas locais.", category: "experiencia", categoryColor: COLOR_MAP.experiencia, icon: Heart, points: 80, difficulty: "easy", status: "available", progress: 0, total: 3, badge: "Poliglota Local", action: "Começar", detail: "Escreve a palavra que aprendeste para registar a conquista.", special: "aprende-palavra" },
  { id: "g12", title: "Saída de Pesca", description: "Participa numa pescaria tradicional.", category: "experiencia", categoryColor: COLOR_MAP.experiencia, icon: Heart, points: 220, difficulty: "hard", status: "locked", progress: 0, total: 1, badge: "Pescador", action: "Bloqueado", detail: "Desbloqueia após 'Amigo da Comunidade'." },
  // Conhecimento
  { id: "g13", title: "Quiz do Destino", description: "Responde a 7 perguntas sobre Moçambique.", category: "conhecimento", categoryColor: COLOR_MAP.conhecimento, icon: Brain, points: 50, difficulty: "medium", status: "available", progress: 0, total: 5, badge: "Historiador", action: "Jogar Quiz", detail: "Quiz com 10 perguntas embaralhadas, 7 por sessão.", special: "quiz" },
  { id: "g14", title: "Curiosidades de Moçambique", description: "Descobre factos surpreendentes.", category: "conhecimento", categoryColor: COLOR_MAP.conhecimento, icon: Brain, points: 60, difficulty: "easy", status: "available", progress: 0, total: 5, badge: "Curioso", action: "Jogar Quiz", detail: "Quiz curto com factos surpreendentes.", special: "quiz" },
  { id: "g15", title: "Mestre das Línguas", description: "Aprende vocabulário avançado.", category: "conhecimento", categoryColor: COLOR_MAP.conhecimento, icon: Brain, points: 70, difficulty: "hard", status: "locked", progress: 0, total: 5, badge: "Linguista", action: "Bloqueado", detail: "Desbloqueia após 'Aprende uma Palavra'." },
  // Tempo
  { id: "g16", title: "Roteiro Completo", description: "Completa um roteiro de 6 paragens.", category: "tempo", categoryColor: COLOR_MAP.tempo, icon: Clock, points: 300, difficulty: "hard", status: "available", progress: 0, total: 6, badge: "Mestre dos Roteiros", action: "Começar", detail: "Conclui todas as paragens no tempo previsto." },
  { id: "g17", title: "Do Nascer ao Pôr-do-Sol", description: "Captura amanhecer e entardecer.", category: "tempo", categoryColor: COLOR_MAP.tempo, icon: Clock, points: 160, difficulty: "medium", status: "available", progress: 0, total: 2, badge: "Madrugador", action: "Começar", detail: "Regista dois momentos do mesmo dia." },
  { id: "g18", title: "Maratona Cultural", description: "3 eventos culturais em 7 dias.", category: "tempo", categoryColor: COLOR_MAP.tempo, icon: Clock, points: 240, difficulty: "hard", status: "locked", progress: 0, total: 3, badge: "Maratonista Cultural", action: "Bloqueado", detail: "Desbloqueia após completar um 'Roteiro Completo'." },
  // Social
  { id: "g19", title: "Leva Alguém Contigo", description: "Convida amigo a explorar.", category: "social", categoryColor: COLOR_MAP.social, icon: Users, points: 100, difficulty: "easy", status: "available", progress: 0, total: 1, badge: "Companheiro", action: "Começar", detail: "Partilha um roteiro com alguém e visita juntos." },
  { id: "g20", title: "Conta a Tua História", description: "Escreve 3 notas sobre lugares.", category: "social", categoryColor: COLOR_MAP.social, icon: Users, points: 90, difficulty: "easy", status: "in_progress", progress: 1, total: 3, badge: "Contador de Histórias", action: "Continuar", detail: "Escreve a tua nota para um lugar visitado.", special: "conta-historia" },
  { id: "g21", title: "Embaixador Ekaya", description: "Partilha 2 conquistas.", category: "social", categoryColor: COLOR_MAP.social, icon: Users, points: 250, difficulty: "medium", status: "available", progress: 0, total: 2, badge: "Embaixador", action: "Começar", detail: "Partilha conquistas e ajuda outros viajantes." },
];

interface SelloDef { id: string; name: string; emoji: string; description: string; requirement: string; earned: boolean; }
const SELLOS: SelloDef[] = [
  { id: "s1", name: "Explorador de Praias", emoji: "🏖️", description: "Visitou 5 praias", requirement: "5 praias diferentes", earned: false },
  { id: "s2", name: "Amigo da Comunidade", emoji: "🤝", description: "3 experiências locais", requirement: "3 experiências", earned: false },
  { id: "s3", name: "Historiador", emoji: "📜", description: "5 quizzes completados", requirement: "5 quizzes", earned: false },
  { id: "s4", name: "Ekaya Master", emoji: "👑", description: "Todos os roteiros de um destino", requirement: "100% de um destino", earned: false },
  { id: "s5", name: "Fotógrafo Cultural", emoji: "📸", description: "10 elementos com foto", requirement: "10 fotos", earned: false },
  { id: "s6", name: "Caçador de Tesouros", emoji: "🗺️", description: "Tesouros encontrados", requirement: "Story Stops", earned: true },
  { id: "s7", name: "Contador de Histórias", emoji: "✍️", description: "Notas em 10 lugares", requirement: "10 notas", earned: false },
  { id: "s8", name: "Madrugador", emoji: "🌅", description: "5 locais ao nascer do sol", requirement: "5 amanheceres", earned: false },
];

const POINT_SYSTEM = [
  { emoji: "🗺️", label: "Visitar Story Stop", pts: "+30 pts" },
  { emoji: "⏱️", label: "Completar roteiro", pts: "+300 pts" },
  { emoji: "🤝", label: "Experiência comunitária", pts: "+200 pts" },
  { emoji: "🧠", label: "Acertar quiz", pts: "+10 pts" },
  { emoji: "📸", label: "Desafio de fotografia", pts: "+100 pts" },
  { emoji: "👥", label: "Desafio social", pts: "+90 pts" },
];

interface QuizQ { question: string; options: string[]; correct: number; explanation: string; }
const QUIZ_BANK: QuizQ[] = [
  { question: "Em que ano Moçambique se tornou independente?", options: ["1965", "1975", "1980", "1992"], correct: 1, explanation: "Moçambique conquistou a independência a 25 de Junho de 1975." },
  { question: "Qual é a moeda oficial de Moçambique?", options: ["Kwanza", "Metical", "Rand", "Escudo"], correct: 1, explanation: "A moeda oficial é o Metical (MZN)." },
  { question: "Quem foi o primeiro Presidente de Moçambique?", options: ["Eduardo Mondlane", "Samora Machel", "Joaquim Chissano", "Armando Guebuza"], correct: 1, explanation: "Samora Machel foi o primeiro Presidente do país independente." },
  { question: "Qual é o prato nacional?", options: ["Cachupa", "Matapa com Xima", "Funje", "Muamba"], correct: 1, explanation: "Matapa com Xima é considerado o prato nacional." },
  { question: "Que animal está na bandeira de Moçambique?", options: ["Leão", "Águia", "Nenhum (tem um AK-47)", "Elefante"], correct: 2, explanation: "A bandeira não tem animais — tem um AK-47, único caso no mundo." },
  { question: "Qual é o género musical tradicional mais conhecido?", options: ["Kizomba", "Marrabenta", "Semba", "Kuduro"], correct: 1, explanation: "A Marrabenta é o género musical urbano mais emblemático." },
  { question: "Quantas províncias tem Moçambique?", options: ["9", "10", "11", "12"], correct: 2, explanation: "Moçambique tem 11 províncias, incluindo a Cidade de Maputo." },
  { question: "Qual a língua mais falada no norte de Moçambique?", options: ["Changana", "Sena", "Makhuwa", "Ronga"], correct: 2, explanation: "O Makhuwa é a língua bantu mais falada no norte." },
  { question: "Como se diz 'Obrigado' em Changana?", options: ["Asante", "Kanimambo", "Inkomu", "Obrigadu"], correct: 2, explanation: "Em Changana, 'Obrigado' diz-se 'Inkomu'." },
  { question: "Qual destas é uma praia no arquipélago de Bazaruto?", options: ["Tofo", "Wimbi", "Benguerra", "Ponta do Ouro"], correct: 2, explanation: "Benguerra é uma das ilhas do arquipélago de Bazaruto." },
];

const DIFF_BADGE: Record<Difficulty, { label: string; cls: string }> = {
  easy: { label: "Fácil", cls: "bg-green-100 text-green-700 border-green-200" },
  medium: { label: "Médio", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  hard: { label: "Difícil", cls: "bg-red-100 text-red-700 border-red-200" },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"jogos" | "selos">("jogos");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pointsKey, setPointsKey] = useState(0);

  const filteredGames = useMemo(
    () => (activeCategory === "all" ? games : games.filter((g) => g.category === activeCategory)),
    [games, activeCategory]
  );

  const completed = games.filter((g) => g.status === "completed").length;
  const inProgress = games.filter((g) => g.status === "in_progress").length;
  const earnedSelos = SELLOS.filter((s) => s.earned).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addPoints = (pts: number) => {
    setTotalPoints((p) => p + pts);
    setPointsKey((k) => k + 1);
  };

  const confirmGame = (game: Game) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== game.id) return g;
        const newProgress = Math.min(g.total, g.progress + 1);
        const newStatus: GameStatus = newProgress >= g.total ? "completed" : "in_progress";
        return { ...g, progress: newProgress, status: newStatus };
      })
    );
    addPoints(game.points);
    showToast(`+${game.points} pontos! 🎉`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-50/40">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>
          <h1 className="font-bold text-sm sm:text-base">🎮 Jogos & Desafios</h1>
          <motion.div
            key={pointsKey}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow"
          >
            <Zap className="size-4" /> {totalPoints}
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pontos Totais", value: totalPoints, icon: "⚡" },
              { label: "Concluídos", value: completed, icon: "✅" },
              { label: "Em Progresso", value: inProgress, icon: "⏳" },
              { label: "Selos", value: `${earnedSelos}/${SELLOS.length}`, icon: "🏅" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-white/15 backdrop-blur p-4"
              >
                <div className="text-2xl">{s.icon}</div>
                <p className="text-3xl font-bold mt-1">{s.value}</p>
                <p className="text-xs opacity-80">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b">
          {(["jogos", "selos"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-semibold text-sm capitalize transition-colors relative ${
                activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "jogos" ? "🎮 Jogos" : "🏅 Selos"}
              {activeTab === tab && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "jogos" && (
          <>
            {/* Categories filter */}
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
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} onOpen={() => {
                  if (game.status === "locked") return;
                  if (game.special === "quiz") setShowQuiz(true);
                  else setSelectedGame(game);
                }} />
              ))}
            </div>
          </>
        )}

        {activeTab === "selos" && (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {SELLOS.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl p-5 text-center border-2 ${
                    s.earned ? "bg-amber-50 border-amber-300" : "bg-muted/30 border-muted"
                  }`}
                >
                  <div className={`mx-auto size-20 rounded-full flex items-center justify-center text-4xl shadow-inner ${
                    s.earned ? "bg-gradient-to-br from-amber-200 to-orange-300" : "bg-muted"
                  }`}>
                    {s.earned ? s.emoji : <Lock className="size-7 text-muted-foreground" />}
                  </div>
                  <h3 className="mt-3 font-bold text-sm">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">{s.requirement}</Badge>
                </motion.div>
              ))}
            </div>

            {/* Pontuação */}
            <h3 className="mt-10 mb-4 text-xl font-bold flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" /> Sistema de Pontuação
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POINT_SYSTEM.map((p) => (
                <div key={p.label} className="flex items-center gap-3 bg-card border rounded-xl p-3">
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.label}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{p.pts}</Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Game Detail Modal */}
      <AnimatePresence>
        {selectedGame && (
          <GameDetailModal
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
            onConfirm={() => {
              const g = selectedGame;
              setSelectedGame(null);
              setTimeout(() => confirmGame(g), 50);
            }}
          />
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && (
          <QuizModal
            onClose={() => setShowQuiz(false)}
            onFinish={(pts) => {
              addPoints(pts);
              showToast(`Quiz! +${pts} pontos 🧠`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-foreground text-background px-5 py-3 rounded-full shadow-2xl font-semibold text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameCard({ game, index, onOpen }: { game: Game; index: number; onOpen: () => void }) {
  const locked = game.status === "locked";
  const completed = game.status === "completed";
  const pct = (game.progress / game.total) * 100;
  const diff = DIFF_BADGE[game.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={!locked ? { y: -4 } : {}}
      className={`bg-card rounded-2xl border overflow-hidden shadow-sm ${locked ? "opacity-60" : ""}`}
    >
      <div className={`h-2 bg-gradient-to-r ${game.categoryColor}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`size-12 rounded-xl bg-gradient-to-br ${game.categoryColor} text-white flex items-center justify-center shadow`}>
            <game.icon className="size-5" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[10px] ${diff.cls}`}>{diff.label}</Badge>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
              <Zap className="size-3" /> {game.points}
            </div>
          </div>
        </div>
        <h3 className="font-bold text-base">{game.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">{game.description}</p>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>{game.progress}/{game.total}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className={`h-full bg-gradient-to-r ${game.categoryColor}`}
            />
          </div>
        </div>

        <Button
          onClick={onOpen}
          disabled={locked}
          className={`w-full mt-4 ${
            completed
              ? "bg-green-600 hover:bg-green-700"
              : locked
              ? "bg-muted text-muted-foreground"
              : `bg-gradient-to-r ${game.categoryColor} text-white hover:opacity-90`
          }`}
        >
          {locked ? (<><Lock className="size-4" /> Bloqueado</>) :
           completed ? (<><CheckCircle className="size-4" /> Concluído</>) :
           game.action}
        </Button>
      </div>
    </motion.div>
  );
}

function GameDetailModal({ game, onClose, onConfirm }: { game: Game; onClose: () => void; onConfirm: () => void }) {
  const [success, setSuccess] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const isTreasure = game.category === "tesouro";
  const [doneStops, setDoneStops] = useState<string[]>(() => (isTreasure ? getCheckedStops(game.id) : []));
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const pct = (game.progress / game.total) * 100;
  const requiresPhoto = game.category === "foto" || game.id === "g17" || isTreasure;
  const missingStop = isTreasure && !selectedStop;

  const handleConfirm = () => {
    if (requiresPhoto && !photo) return;
    if (missingStop) return;
    if (isTreasure && selectedStop) {
      const next = [...doneStops, selectedStop];
      saveCheckedStops(game.id, next);
      setDoneStops(next);
    }
    setSuccess(true);
    setTimeout(() => onConfirm(), 1300);
  };



  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className={`bg-gradient-to-br ${game.categoryColor} text-white p-6 relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 size-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center">
              <game.icon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{game.title}</h2>
              <div className="flex items-center gap-1 text-sm opacity-90">
                <Zap className="size-3" /> {game.points} pts
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {success ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="py-8 text-center">
              <CheckCircle className="size-20 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-lg">Conquista registada!</p>
              <p className="text-sm text-muted-foreground">+{game.points} pontos</p>
            </motion.div>
          ) : (
            <>
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-xs font-bold uppercase mb-1 text-muted-foreground">Como funciona</p>
                <p className="text-sm">{game.detail}</p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{game.progress}/{game.total}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Award className="size-5 text-amber-600" />
                <p className="text-sm"><span className="text-muted-foreground">Selo:</span> <strong>{game.badge}</strong></p>
              </div>

              {game.special === "aprende-palavra" && (
                <div>
                  <label className="text-sm font-medium">Palavra aprendida</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ex: Kanimambo (Obrigado)"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
              )}

              {game.special === "conta-historia" && (
                <div>
                  <label className="text-sm font-medium">A tua nota</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Escreve a tua história..."
                    rows={4}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
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
                <PhotoChallengeCapture onPhoto={setPhoto} accentClass={game.categoryColor} />
              )}

              <Button
                onClick={handleConfirm}
                disabled={missingStop || (requiresPhoto && !photo)}
                className={`w-full bg-gradient-to-r ${game.categoryColor} text-white hover:opacity-90 disabled:opacity-50`}
              >
                {missingStop
                  ? "Seleciona a paragem"
                  : requiresPhoto && !photo
                    ? "Tira a foto para confirmar"
                    : "Confirmar conquista"}
              </Button>


            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuizModal({ onClose, onFinish }: { onClose: () => void; onFinish: (pts: number) => void }) {
  const [questions] = useState<QuizQ[]>(() => shuffle(QUIZ_BANK).slice(0, 7));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isLast = current === questions.length - 1;

  const choose = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      const pts = score * 10 + (selected === q.correct ? 10 : 0);
      // already counted via setScore above asynchronously; compute fresh
      const finalScore = score + (selected === q.correct && selected !== null ? 0 : 0);
      setDone(true);
      setTimeout(() => onFinish(finalScore * 10), 100);
      void pts;
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-br from-purple-600 to-violet-700 text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="size-5" />
              <p className="font-bold">Quiz Moçambique</p>
            </div>
            <button onClick={onClose} className="size-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
              <X className="size-4" />
            </button>
          </div>
          {!done && (
            <>
              <div className="flex justify-between text-xs opacity-90 mb-1">
                <span>Pergunta {current + 1} de {questions.length}</span>
                <span>Pontos: {score * 10}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
                  className="h-full bg-white"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center py-6">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}>
                <Trophy className="size-20 text-amber-500 mx-auto" />
              </motion.div>
              <h3 className="text-2xl font-bold mt-3">Parabéns!</h3>
              <p className="text-muted-foreground">Acertaste {score} de {questions.length}</p>
              <p className="text-3xl font-bold mt-2 text-primary">{Math.round((score / questions.length) * 100)}%</p>
              <p className="text-sm text-amber-600 font-semibold mt-1">+{score * 10} pontos</p>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1" onClick={onClose}>Fechar</Button>
                <Button className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white" onClick={() => window.location.reload()}>
                  Jogar Novamente
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-lg mb-4">{q.question}</h3>
              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  const isCorrect = idx === q.correct;
                  const isPicked = selected === idx;
                  let cls = "border-border hover:bg-muted/50";
                  if (selected !== null) {
                    if (isCorrect) cls = "border-green-500 bg-green-50 text-green-700";
                    else if (isPicked) cls = "border-red-500 bg-red-50 text-red-700";
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

              {selected !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-3 rounded-xl flex items-start gap-2 text-sm ${
                    selected === q.correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {selected === q.correct ? <CheckCircle className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                  <p>{q.explanation}</p>
                </motion.div>
              )}

              <Button
                disabled={selected === null}
                onClick={next}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white"
              >
                {isLast ? "Ver Resultado" : "Próxima Pergunta"}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
