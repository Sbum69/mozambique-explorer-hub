import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Trophy, Award, Star, MapPin, Camera, Heart, Users, Sparkles, Lock, ArrowLeft, Check,
  Share2, Copy, Instagram, Twitter, MessageCircle,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/gamification")({
  head: () => ({
    meta: [
      { title: "Conquistas — Ekaya Explore" },
      { name: "description", content: "Ganha XP, desbloqueia conquistas e recompensas autênticas em Moçambique." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ekaya.auth.user")) {
      throw redirect({ to: "/login" });
    }
  },
  component: GamificationPage,
});

interface BadgeDef {
  id: string;
  icon: LucideIcon;
  title: { pt: string; en: string };
  desc: { pt: string; en: string };
  xpRequired: number;
  gradient: string;
}

interface RewardDef {
  id: string;
  icon: string;
  title: { pt: string; en: string };
  desc: { pt: string; en: string };
  xpCost: number;
  gradient: string;
}

const BADGES: BadgeDef[] = [
  { id: "first-step", icon: MapPin, title: { pt: "Primeiro Passo", en: "First Step" }, desc: { pt: "Visita o teu primeiro local", en: "Visit your first place" }, xpRequired: 100, gradient: "from-blue-500 to-cyan-400" },
  { id: "explorer", icon: Sparkles, title: { pt: "Explorador", en: "Explorer" }, desc: { pt: "Visita 5 destinos diferentes", en: "Visit 5 different destinations" }, xpRequired: 500, gradient: "from-purple-500 to-pink-400" },
  { id: "photographer", icon: Camera, title: { pt: "Fotógrafo", en: "Photographer" }, desc: { pt: "Partilha 10 fotos da tua viagem", en: "Share 10 trip photos" }, xpRequired: 750, gradient: "from-orange-500 to-yellow-400" },
  { id: "local-friend", icon: Heart, title: { pt: "Amigo Local", en: "Local Friend" }, desc: { pt: "Apoia 3 negócios comunitários", en: "Support 3 community businesses" }, xpRequired: 1000, gradient: "from-pink-500 to-rose-400" },
  { id: "storyteller", icon: Star, title: { pt: "Contador de Histórias", en: "Storyteller" }, desc: { pt: "Escreve 5 reviews autênticas", en: "Write 5 authentic reviews" }, xpRequired: 1500, gradient: "from-warning to-yellow-500" },
  { id: "ambassador", icon: Users, title: { pt: "Embaixador", en: "Ambassador" }, desc: { pt: "Convida 3 amigos para a Ekaya", en: "Invite 3 friends to Ekaya" }, xpRequired: 2500, gradient: "from-success to-emerald-400" },
  { id: "master-explorer", icon: Award, title: { pt: "Mestre Explorador", en: "Master Explorer" }, desc: { pt: "Completa 10 roteiros", en: "Complete 10 itineraries" }, xpRequired: 4000, gradient: "from-primary to-primary-glow" },
  { id: "legend", icon: Trophy, title: { pt: "Lenda de Moçambique", en: "Mozambique Legend" }, desc: { pt: "Atinge o nível 5", en: "Reach level 5" }, xpRequired: 5000, gradient: "from-secondary to-primary" },
];

const REWARDS: RewardDef[] = [
  { id: "r1", icon: "🎟️", title: { pt: "10% em Experiências", en: "10% off Experiences" }, desc: { pt: "Desconto na próxima reserva", en: "Discount on next booking" }, xpCost: 500, gradient: "from-primary to-primary-glow" },
  { id: "r2", icon: "🥥", title: { pt: "Welcome Drink", en: "Welcome Drink" }, desc: { pt: "Em parceiros selecionados", en: "At selected partners" }, xpCost: 800, gradient: "from-success to-emerald-400" },
  { id: "r3", icon: "🛶", title: { pt: "Passeio de Dhow Grátis", en: "Free Dhow Ride" }, desc: { pt: "Vilankulo • 2h", en: "Vilankulo • 2h" }, xpCost: 1500, gradient: "from-secondary to-blue-400" },
  { id: "r4", icon: "🍤", title: { pt: "Jantar Tradicional", en: "Traditional Dinner" }, desc: { pt: "Banca da Maria • Maputo", en: "Banca da Maria • Maputo" }, xpCost: 2000, gradient: "from-orange-500 to-red-500" },
  { id: "r5", icon: "🤿", title: { pt: "Mergulho com Manta", en: "Manta Diving" }, desc: { pt: "Tofo • Inhambane", en: "Tofo • Inhambane" }, xpCost: 3500, gradient: "from-secondary to-primary" },
  { id: "r6", icon: "🦁", title: { pt: "Safari Gorongosa", en: "Gorongosa Safari" }, desc: { pt: "Dia completo + guia local", en: "Full day + local guide" }, xpCost: 5000, gradient: "from-success to-warning" },
];

function GamificationPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [showShare, setShowShare] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!user) return null;

  const xpToNext = (user.level + 1) * 1000;
  const xpProgress = Math.min(100, (user.xp / xpToNext) * 100);
  const unlockedBadges = BADGES.filter((b) => user.xp >= b.xpRequired).length;

  const handleClaim = (id: string) => {
    setClaimed((prev) => new Set(prev).add(id));
    navigate({ to: "/voucher/$rewardId", params: { rewardId: id } });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://ekaya-explore.com/profile/${user.username}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowShare(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90 rounded-full"
            >
              <Share2 className="size-4" />
              <span className="hidden sm:inline">{lang === "pt" ? "Partilhar" : "Share"}</span>
            </Button>
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-elegant)] bg-gradient-to-br from-warning via-orange-500 to-primary text-white p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="size-8" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("gamiTitle")}</h1>
            </div>
            <p className="opacity-90 mb-6">{t("gamiSub")}</p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/15 backdrop-blur p-4">
                <p className="text-xs uppercase opacity-80">{t("yourLevel")}</p>
                <p className="text-4xl font-bold mt-1">Lv {user.level}</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur p-4">
                <p className="text-xs uppercase opacity-80">{t("xp")}</p>
                <p className="text-4xl font-bold mt-1">{user.xp.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur p-4">
                <p className="text-xs uppercase opacity-80">{t("badges")}</p>
                <p className="text-4xl font-bold mt-1">{unlockedBadges}/{BADGES.length}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-xs mb-2 opacity-90">
                <span>{user.xp} XP</span>
                <span>{xpToNext - user.xp} XP {t("toNextLevel")}</span>
              </div>
              <Progress value={xpProgress} className="h-3 bg-white/20" />
            </div>
          </Card>
        </motion.div>

        {/* Badges */}
        <h2 className="mt-10 mb-5 text-2xl font-bold tracking-tight flex items-center gap-2">
          <Award className="size-6 text-warning" /> {t("badges")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {BADGES.map((b, i) => {
            const unlocked = user.xp >= b.xpRequired;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={unlocked ? { y: -4, rotate: -1 } : {}}
              >
                <Card className={`relative overflow-hidden border-0 p-5 h-full text-center ${unlocked ? "shadow-[var(--shadow-elegant)]" : "opacity-60"}`}>
                  <div className={`mx-auto size-16 rounded-2xl bg-gradient-to-br ${b.gradient} text-white flex items-center justify-center shadow-lg ${unlocked ? "" : "grayscale"}`}>
                    {unlocked ? <b.icon className="size-8" /> : <Lock className="size-7" />}
                  </div>
                  <h3 className="mt-3 font-bold text-sm">{b.title[lang]}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{b.desc[lang]}</p>
                  <Badge variant={unlocked ? "default" : "outline"} className="mt-3 text-[10px]">
                    {unlocked ? `✓ ${t("unlocked")}` : `${b.xpRequired} XP`}
                  </Badge>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Rewards */}
        <h2 className="mt-12 mb-5 text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="size-6 text-primary" /> {t("rewards")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REWARDS.map((r, i) => {
            const canClaim = user.xp >= r.xpCost;
            const isClaimed = claimed.has(r.id);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={canClaim && !isClaimed ? { y: -4 } : {}}
              >
                <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all p-5 h-full flex flex-col">
                  <div className={`absolute top-0 right-0 size-32 rounded-full bg-gradient-to-br ${r.gradient} opacity-10 blur-2xl -translate-y-8 translate-x-8`} />
                  <div className="relative flex items-start gap-3">
                    <div className={`size-14 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-3xl shadow-md`}>
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold">{r.title[lang]}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc[lang]}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 text-sm font-bold text-primary">
                      <Star className="size-4 fill-current" /> {r.xpCost.toLocaleString()} XP
                    </div>
                    <Button
                      size="sm"
                      disabled={!canClaim || isClaimed}
                      onClick={() => handleClaim(r.id)}
                      className={canClaim && !isClaimed ? `bg-gradient-to-r ${r.gradient} text-white border-0 hover:opacity-90` : ""}
                    >
                      {isClaimed ? <><Check className="size-3" /> {t("claimed")}</> : canClaim ? t("claim") : <><Lock className="size-3" /> {t("locked")}</>}
                    </Button>
                  </div>

                  {!canClaim && (
                    <div className="mt-3">
                      <Progress value={(user.xp / r.xpCost) * 100} className="h-1" />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {r.xpCost - user.xp} XP {lang === "pt" ? "em falta" : "missing"}
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link to="/map">
            <Button variant="outline" size="lg">
              <MapPin className="size-4" /> {lang === "pt" ? "Explorar mapa para ganhar XP" : "Explore map to earn XP"}
            </Button>
          </Link>
        </div>
      </main>

      <AnimatePresence>
        {showShare && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-3xl shadow-2xl z-[101] max-w-lg w-[92vw] p-6"
            >
              <h3 className="text-2xl font-bold text-center mb-1">
                {lang === "pt" ? "Partilhar Conquistas" : "Share Achievements"}
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {lang === "pt" ? "Mostra as tuas aventuras aos amigos!" : "Show your adventures to friends!"}
              </p>

              {/* Preview card */}
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white mb-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      style={{ left: `${(i * 7) % 100}%`, top: `${(i * 11) % 100}%` }}
                    />
                  ))}
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-14 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{user.displayName}</h4>
                      <p className="text-xs text-purple-100">
                        {lang === "pt" ? "Explorador de Moçambique" : "Mozambique Explorer"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <Mini label={t("level")} value={user.level} />
                    <Mini label={t("visited")} value={user.visitedPlaces} />
                    <Mini label={t("badges")} value={unlockedBadges} />
                  </div>
                  <p className="text-center text-xs text-purple-100 mt-2">
                    {lang === "pt" ? "Explora Moçambique comigo! 🌍" : "Explore Mozambique with me! 🌍"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <Social icon={Instagram} label="Instagram" gradient="from-pink-500 to-rose-600" />
                <Social icon={Twitter} label="Twitter" gradient="from-blue-400 to-blue-600" />
                <Social icon={MessageCircle} label="WhatsApp" gradient="from-green-500 to-emerald-600" />
              </div>

              <Button variant="outline" className="w-full mb-2" onClick={handleCopyLink}>
                {linkCopied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                {linkCopied
                  ? lang === "pt" ? "Link copiado!" : "Link copied!"
                  : lang === "pt" ? "Copiar link do perfil" : "Copy profile link"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setShowShare(false)}>
                {lang === "pt" ? "Fechar" : "Close"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] text-purple-100 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Social({ icon: Icon, label, gradient }: { icon: typeof Instagram; label: string; gradient: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center gap-2 p-3 bg-gradient-to-br ${gradient} text-white rounded-xl shadow-lg`}
    >
      <Icon className="size-5" />
      <span className="text-[11px] font-semibold">{label}</span>
    </motion.button>
  );
}
