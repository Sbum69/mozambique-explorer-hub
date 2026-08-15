import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, PlusCircle, Heart, Star, Send, X, Shield,
} from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLang, type DictKey } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Comunidade — Ekaya Explore" },
      { name: "description", content: "Partilha a tua experiência em Moçambique com a comunidade Ekaya." },
      { property: "og:title", content: "Comunidade — Ekaya Explore" },
      { property: "og:description", content: "Partilha a tua experiência em Moçambique com a comunidade Ekaya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

interface Message {
  id: string;
  name: string;
  country: string;
  flag: string;
  rating: number;
  text: string;
  date: string; // ISO
  category: CategoryKey;
  likes: number;
  hasLiked: boolean;
}

type CategoryKey = "general" | "beach" | "culture" | "food" | "community" | "logistics";

const CATEGORIES: { key: CategoryKey; tKey: DictKey; pill: string }[] = [
  { key: "general", tKey: "catGeneral", pill: "bg-blue-100 text-blue-700" },
  { key: "beach", tKey: "catBeach", pill: "bg-cyan-100 text-cyan-700" },
  { key: "culture", tKey: "catCulture", pill: "bg-orange-100 text-orange-700" },
  { key: "food", tKey: "catFood", pill: "bg-pink-100 text-pink-700" },
  { key: "community", tKey: "catCommunity", pill: "bg-green-100 text-green-700" },
  { key: "logistics", tKey: "catLogistics", pill: "bg-purple-100 text-purple-700" },
];

const AVATAR_GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-green-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-cyan-600",
  "from-fuchsia-500 to-purple-600",
];

const INITIAL_MESSAGES: Message[] = [
  { id: "m1", name: "Sarah Johnson", country: "EUA", flag: "🇺🇸", rating: 5, category: "general", date: "2026-02-20", likes: 47, hasLiked: false,
    text: "Esta plataforma mudou completamente a minha experiência em Moçambique. Consegui descobrir lugares autênticos que nunca teria encontrado sozinha. O sistema offline foi essencial!" },
  { id: "m2", name: "Miguel Santos", country: "Portugal", flag: "🇵🇹", rating: 5, category: "culture", date: "2026-02-18", likes: 38, hasLiked: false,
    text: "Incrível como o turismo pode ser responsável e beneficiar diretamente as comunidades locais. A gamificação torna tudo mais envolvente. Parabéns pela iniciativa!" },
  { id: "m3", name: "Amina Hassan", country: "Tanzânia", flag: "🇹🇿", rating: 4, category: "community", date: "2026-02-15", likes: 29, hasLiked: false,
    text: "Como africana, adorei ver uma plataforma que valoriza as histórias locais e a cultura. O respeito pelas tradições é evidente. Sugiro adicionar mais idiomas regionais." },
  { id: "m4", name: "Lucas Ferreira", country: "Brasil", flag: "🇧🇷", rating: 5, category: "beach", date: "2026-02-10", likes: 61, hasLiked: false,
    text: "Visitei Moçambique e usei esta plataforma o tempo todo. Os roteiros são bem organizados e as experiências comunitárias são autênticas. Voltarei com certeza!" },
  { id: "m5", name: "Yuki Tanaka", country: "Japão", flag: "🇯🇵", rating: 5, category: "food", date: "2026-02-08", likes: 22, hasLiked: false,
    text: "A secção de gastronomia é fantástica! Descobri a matapa através desta app e foi a melhor refeição da minha vida. Muito obrigada pela recomendação dos restaurantes locais." },
  { id: "m6", name: "Carlos Mondlane", country: "Moçambique", flag: "🇲🇿", rating: 5, category: "community", date: "2026-01-30", likes: 84, hasLiked: false,
    text: "Como moçambicano, fico orgulhoso de ver a nossa cultura a ser valorizada desta forma. A app ajuda os turistas a descobrir o nosso país de forma responsável e autêntica." },
];

const MAX_LIKES = 3;

function CommunityPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [likesRemaining, setLikesRemaining] = useState(MAX_LIKES);
  const [filter, setFilter] = useState<"all" | CategoryKey>("all");
  const [sort, setSort] = useState<"recent" | "rated" | "liked">("recent");
  const [modalOpen, setModalOpen] = useState(false);

  // form
  const [fName, setFName] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fRating, setFRating] = useState(5);
  const [fHover, setFHover] = useState(0);
  const [fText, setFText] = useState("");
  const [fCategory, setFCategory] = useState<CategoryKey>("general");

  const filtered = useMemo(() => {
    let list = filter === "all" ? messages : messages.filter((m) => m.category === filter);
    list = [...list];
    if (sort === "rated") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "liked") list.sort((a, b) => b.likes - a.likes);
    else list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return list;
  }, [messages, filter, sort]);

  const handleLike = (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.hasLiked) return;
    if (likesRemaining <= 0) {
      toast.error(t("limitReached"));
      return;
    }
    setMessages((arr) => arr.map((m) => m.id === id ? { ...m, likes: m.likes + 1, hasLiked: true } : m));
    setLikesRemaining((n) => n - 1);
  };

  const resetForm = () => {
    setFName(""); setFCountry(""); setFRating(5); setFHover(0); setFText(""); setFCategory("general");
  };

  const handleSubmit = () => {
    if (!fName.trim() || !fText.trim()) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      name: fName.trim(),
      country: fCountry.trim() || "—",
      flag: "🌍",
      rating: fRating,
      text: fText.trim(),
      date: new Date().toISOString().slice(0, 10),
      category: fCategory,
      likes: 0,
      hasLiked: false,
    };
    setMessages((arr) => [newMsg, ...arr]);
    setModalOpen(false);
    resetForm();
    toast.success(`✅ ${t("messageSent")}`);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US", {
      day: "2-digit", month: "short", year: "numeric",
    });

  const initials = (name: string) =>
    name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");

  const totalCount = 2543 + (messages.length - INITIAL_MESSAGES.length);
  const avgRating = (messages.reduce((s, m) => s + m.rating, 0) / messages.length).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <motion.header
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">{t("communityTitle")}</h1>
              <p className="text-xs text-muted-foreground truncate">{t("communitySubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <LanguageToggle />
            {user && (
              <div className="hidden sm:flex size-9 rounded-full bg-gradient-to-br from-primary to-primary-glow text-white items-center justify-center font-bold text-sm">
                {user.displayName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 text-white p-8 sm:p-12 shadow-xl"
        >
          <MessageSquare className="size-14 sm:size-16 mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-bold">{t("yourVoiceMatters")}</h2>
          <p className="mt-3 text-white/90 max-w-2xl">{t("yourVoiceSub")}</p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Stat value={totalCount.toLocaleString(lang === "pt" ? "pt-PT" : "en-US")} label={t("messagesShared")} />
            <Stat value={`${avgRating}★`} label={t("averageRating")} />
            <Stat value="94%" label={t("positiveFeedback")} />
          </div>
        </motion.div>

        {/* Privacy note + CTA */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm flex-1">
            <Shield className="size-4 text-blue-600 shrink-0" />
            <span>{t("privacyNote")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-sm">
              ❤️ {likesRemaining} {t("likesRemaining")}
            </Badge>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg rounded-xl py-6 px-6 font-semibold"
              >
                <PlusCircle className="mr-2 size-5" />
                {t("shareExperience")}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Filter & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {([{ key: "all", label: t("allCategories") }, ...CATEGORIES.map((c) => ({ key: c.key, label: t(c.tKey) }))]).map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key as never)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === c.key
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1 self-start sm:self-auto">
            {([
              { k: "recent", l: t("mostRecent") },
              { k: "rated", l: t("mostRated") },
              { k: "liked", l: t("mostLiked") },
            ] as const).map((s) => (
              <button
                key={s.k}
                onClick={() => setSort(s.k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  sort === s.k ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((m, i) => {
              const cat = CATEGORIES.find((c) => c.key === m.category)!;
              const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card className="p-5 rounded-2xl shadow-lg border border-gray-100 bg-white h-full flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className={`size-12 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-bold shrink-0`}>
                        {initials(m.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{m.name}</h3>
                          <span className="text-sm">{m.flag}</span>
                          <span className="text-xs text-gray-500">· {m.country}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.pill}`}>
                            {t(cat.tKey)}
                          </span>
                          <span className="text-xs text-gray-500">{fmtDate(m.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={`size-4 ${s < m.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>

                    <p className="mt-3 text-sm text-gray-700 leading-relaxed flex-1">{m.text}</p>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        ❤️ {m.likes} {t("peopleFoundUseful")}
                      </span>
                      <motion.button
                        whileTap={{ scale: 1.3 }}
                        disabled={m.hasLiked || likesRemaining === 0}
                        onClick={() => handleLike(m.id)}
                        title={likesRemaining === 0 && !m.hasLiked ? t("limitReached") : undefined}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                          m.hasLiked
                            ? "bg-red-50 text-red-600"
                            : likesRemaining === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                            : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        <Heart className={`size-4 ${m.hasLiked ? "fill-red-500 text-red-500" : ""}`} />
                        {t("usefulButton")} ({m.likes})
                      </motion.button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <FooterStat value={`${avgRating}/5`} label={t("averageRating")} gradient="from-blue-600 to-purple-600" />
          <FooterStat value={totalCount.toLocaleString(lang === "pt" ? "pt-PT" : "en-US")} label={t("messagesShared")} gradient="from-green-500 to-teal-600" />
          <FooterStat value="94%" label={t("positiveFeedback")} gradient="from-orange-500 to-red-500" />
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlusCircle className="size-5" />
                  <h3 className="font-bold">{t("newMessage")}</h3>
                </div>
                <button onClick={() => setModalOpen(false)} className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center">
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("nameField")} *</label>
                  <Input value={fName} onChange={(e) => setFName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("countryField")}</label>
                  <Input value={fCountry} onChange={(e) => setFCountry(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("ratingField")}</label>
                  <div className="mt-1 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const v = i + 1;
                      const active = (fHover || fRating) >= v;
                      return (
                        <button
                          key={i} type="button"
                          onMouseEnter={() => setFHover(v)}
                          onMouseLeave={() => setFHover(0)}
                          onClick={() => setFRating(v)}
                        >
                          <Star className={`size-7 transition ${active ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("categoryField")}</label>
                  <select
                    value={fCategory}
                    onChange={(e) => setFCategory(e.target.value as CategoryKey)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{t(c.tKey)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t("messageField")} *</label>
                  <Textarea
                    value={fText}
                    onChange={(e) => setFText(e.target.value.slice(0, 300))}
                    className="mt-1 h-32"
                  />
                  <p className="mt-1 text-xs text-gray-500 text-right">{fText.length}/300 {t("charactersLabel")}</p>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!fName.trim() || !fText.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Send className="mr-2 size-4" />
                  {t("sendFeedback")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function FooterStat({ value, label, gradient }: { value: string; label: string; gradient: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} text-white p-6 shadow-lg text-center`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm opacity-90">{label}</p>
    </div>
  );
}
