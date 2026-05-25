import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Newspaper, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useLang } from "@/contexts/LanguageContext";
import {
  MOCK_NEWS,
  NEWS_CATEGORIES,
  newsCategoryLabel,
  type NewsCategory,
  type NewsItem,
} from "@/data/news";

export const Route = createFileRoute("/news-alerts")({
  head: () => ({
    meta: [
      { title: "Notícias e alertas — Ekaya" },
      {
        name: "description",
        content:
          "Últimas notícias, eventos e alertas de segurança para viajantes em Moçambique.",
      },
    ],
  }),
  component: NewsAlertsPage,
});

const CATEGORY_TONE: Record<NewsCategory, string> = {
  event: "bg-primary/15 text-primary border-primary/20",
  tip: "bg-secondary/15 text-secondary border-secondary/20",
  safety: "bg-destructive/15 text-destructive border-destructive/20",
  community: "bg-success/15 text-success border-success/20",
};

function NewsAlertsPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | NewsCategory>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_NEWS.filter((n) => {
      if (filter !== "all" && n.category !== filter) return false;
      if (!q) return true;
      return (
        n.title[lang].toLowerCase().includes(q) ||
        n.summary[lang].toLowerCase().includes(q)
      );
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filter, query, lang]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />
            {lang === "pt" ? "Voltar" : "Back"}
          </button>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Newspaper className="size-8 text-primary" />
            {lang === "pt" ? "Notícias e alertas" : "News & alerts"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {lang === "pt"
              ? "Eventos, dicas e atualizações de segurança para a tua viagem."
              : "Events, tips and safety updates for your trip."}
          </p>
        </motion.div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={lang === "pt" ? "Pesquisar notícias…" : "Search news…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {lang === "pt" ? "Todas" : "All"}
          </Button>
          {NEWS_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={filter === c ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(c)}
            >
              {newsCategoryLabel(c, lang)}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="h-full flex flex-col p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={CATEGORY_TONE[n.category]}>
                    {newsCategoryLabel(n.category, lang)}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(n.date)}
                  </span>
                </div>
                <h2 className="font-bold text-lg leading-tight mb-2">{n.title[lang]}</h2>
                <p className="text-sm text-muted-foreground flex-1">{n.summary[lang]}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="self-start mt-3 p-0"
                  onClick={() => setSelected(n)}
                >
                  {lang === "pt" ? "Ler mais →" : "Read more →"}
                </Button>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center py-10 text-muted-foreground">
              {lang === "pt" ? "Nenhuma notícia encontrada." : "No news found."}
            </p>
          )}
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={CATEGORY_TONE[selected.category]}>
                    {newsCategoryLabel(selected.category, lang)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(selected.date)}
                  </span>
                </div>
                <DialogTitle className="text-2xl">{selected.title[lang]}</DialogTitle>
                <DialogDescription className="text-base">
                  {selected.summary[lang]}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-foreground/90">
                {selected.body[lang]}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
