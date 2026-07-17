import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Newspaper,
  Calendar,
  Thermometer,
  AlertTriangle,
  Info,
  Search,
  MapPin,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  Share2,
  Heart,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Camera,
  Wallet,
  Shield,
  Compass,
  Utensils,
} from "lucide-react";
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
import { AppSidebar } from "@/components/AppSidebar";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useLang } from "@/contexts/LanguageContext";
import {
  MOCK_NEWS,
  NEWS_CATEGORIES,
  newsCategoryLabel,
  type NewsCategory,
  type NewsItem,
} from "@/data/news";
import {
  EVENTS,
  WEATHER,
  ROAD_ALERTS,
  TRAVEL_TIPS,
} from "@/data/news-extra";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news-alerts")({
  head: () => ({
    meta: [
      { title: "Notícias & Avisos — Ekaya Explore" },
      {
        name: "description",
        content:
          "Notícias, eventos, clima, estradas e dicas para viajar em Moçambique.",
      },
    ],
  }),
  component: NewsAlertsPage,
});

type Tab = "news" | "events" | "weather" | "roads" | "tips";

const TABS: { id: Tab; pt: string; en: string; icon: typeof Newspaper; grad: string }[] = [
  { id: "news", pt: "Notícias", en: "News", icon: Newspaper, grad: "from-red-500 to-red-700" },
  { id: "events", pt: "Eventos", en: "Events", icon: Calendar, grad: "from-orange-500 to-pink-500" },
  { id: "weather", pt: "Temperatura", en: "Weather", icon: Thermometer, grad: "from-cyan-500 to-blue-500" },
  { id: "roads", pt: "Estradas", en: "Roads", icon: AlertTriangle, grad: "from-orange-500 to-orange-700" },
  { id: "tips", pt: "Dicas", en: "Tips", icon: Info, grad: "from-purple-500 to-pink-500" },
];

function NewsAlertsPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("news");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 truncate">
                <Newspaper className="size-5 sm:size-6 text-red-600" />
                {lang === "pt" ? "Notícias & Avisos" : "News & Alerts"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {lang === "pt"
                  ? "Mantenha-se informado sobre Moçambique"
                  : "Stay informed about Mozambique"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(239,68,68,0.45)",
                  "0 0 0 10px rgba(239,68,68,0)",
                  "0 0 0 0 rgba(239,68,68,0)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="hidden sm:flex px-3 py-1.5 bg-red-100 dark:bg-red-950/40 rounded-full items-center gap-1.5"
            >
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-700 dark:text-red-300 text-xs font-semibold">
                {lang === "pt" ? "AO VIVO" : "LIVE"}
              </span>
            </motion.div>
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[57px] sm:top-[73px] z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    active
                      ? `bg-gradient-to-r ${t.grad} text-white shadow-md`
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  <Icon className="size-4" />
                  {lang === "pt" ? t.pt : t.en}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {tab === "news" && <NewsTab lang={lang} />}
        {tab === "events" && <EventsTab lang={lang} />}
        {tab === "weather" && <WeatherTab lang={lang} />}
        {tab === "roads" && <RoadsTab lang={lang} />}
        {tab === "tips" && <TipsTab lang={lang} />}
      </main>
    </div>
  );
}

/* ---------- News tab ---------- */
const CATEGORY_TONE: Record<NewsCategory, string> = {
  event: "bg-primary/15 text-primary border-primary/20",
  tip: "bg-secondary/15 text-secondary border-secondary/20",
  safety: "bg-destructive/15 text-destructive border-destructive/20",
  community: "bg-success/15 text-success border-success/20",
};

interface LiveNews {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  thumbnail?: string;
  source: string;
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function useLiveNews(lang: "pt" | "en") {
  const [items, setItems] = useState<LiveNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      // Google News RSS for Mozambique, converted to JSON via rss2json (free, no key)
      const q = lang === "pt" ? "Mo%C3%A7ambique" : "Mozambique";
      const hl = lang === "pt" ? "pt-PT" : "en";
      const rss = `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=MZ&ceid=MZ:${lang === "pt" ? "pt-150" : "en"}`;
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (data.status !== "ok") throw new Error(data.message || "RSS error");
        const parsed: LiveNews[] = (data.items || []).slice(0, 8).map((it: any) => {
          const desc = stripHtml(it.description || "");
          // Google News wraps items — source is often at the end after " - "
          const sourceMatch = it.title.match(/ - ([^-]+)$/);
          return {
            title: sourceMatch ? it.title.replace(/ - [^-]+$/, "") : it.title,
            link: it.link,
            description: desc.length > 200 ? desc.slice(0, 200) + "…" : desc,
            pubDate: it.pubDate,
            thumbnail: it.thumbnail || it.enclosure?.link || undefined,
            source: sourceMatch ? sourceMatch[1] : (data.feed?.title || "Google News"),
          };
        });
        setItems(parsed);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { items, loading, error };
}

function NewsTab({ lang }: { lang: "pt" | "en" }) {
  const [filter, setFilter] = useState<"all" | NewsCategory>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const live = useLiveNews(lang);

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

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const fmtLive = (d: string) => {
    try {
      return new Date(d).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={lang === "pt" ? "Pesquisar notícias…" : "Search news…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          {lang === "pt" ? "Todas" : "All"}
        </Button>
        {NEWS_CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={filter === c ? "default" : "outline"}
            onClick={() => setFilter(c)}
          >
            {newsCategoryLabel(c, lang)}
          </Button>
        ))}
      </div>

      {/* LIVE NEWS from Google News RSS (Mozambique) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full size-2.5 bg-red-600" />
            </span>
            {lang === "pt" ? "Últimas notícias em tempo real" : "Live news right now"}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {lang === "pt" ? "Fonte: Google News" : "Source: Google News"}
          </span>
        </div>

        {live.loading && (
          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="rounded-xl border bg-card p-4 animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!live.loading && live.error && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {lang === "pt"
              ? "Não foi possível carregar as notícias em tempo real agora. Mostrando notícias em destaque abaixo."
              : "Couldn't load live news right now. Showing featured news below."}
          </div>
        )}

        {!live.loading && !live.error && live.items.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {live.items.map((it, idx) => (
              <motion.a
                key={it.link + idx}
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group flex gap-3 rounded-xl border bg-card p-3 hover:shadow-md transition-all"
              >
                {it.thumbnail ? (
                  <img
                    src={it.thumbnail}
                    alt=""
                    className="size-20 rounded-lg object-cover shrink-0"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                ) : (
                  <div className="size-20 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
                    <Newspaper className="size-8 text-white/90" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 mb-1">
                    <span className="uppercase truncate">{it.source}</span>
                    <span className="text-muted-foreground font-normal">· {fmtLive(it.pubDate)}</span>
                  </div>
                  <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {it.title}
                  </h4>
                  {it.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {it.description}
                    </p>
                  )}
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </section>

      <h2 className="text-lg font-bold mb-3">
        {lang === "pt" ? "Notícias em destaque" : "Featured stories"}
      </h2>
      <div className="space-y-4">
        {filtered.map((n, i) => (
          <motion.article
            key={n.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl shadow-sm border overflow-hidden grid md:grid-cols-3 gap-0"
          >
            <div className="relative h-48 md:h-auto bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950/40 dark:to-orange-950/40">
              {n.image ? (
                <img src={n.image} alt={n.title[lang]} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Newspaper className="size-16 text-red-300" />
                </div>
              )}
              {i === 0 && (
                <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <TrendingUp className="size-3" /> TRENDING
                </div>
              )}
              <div className="absolute bottom-3 left-3">
                <Badge variant="outline" className={cn(CATEGORY_TONE[n.category], "bg-background/90")}>
                  {newsCategoryLabel(n.category, lang)}
                </Badge>
              </div>
            </div>
            <div className="md:col-span-2 p-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {fmt(n.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {((i + 1) * 813).toLocaleString()} {lang === "pt" ? "visualizações" : "views"}
                </span>
              </div>
              <h3 className="text-xl font-bold leading-tight mb-2">{n.title[lang]}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {n.summary[lang]}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setSelected(n)}
                  className="bg-gradient-to-r from-red-500 to-red-700 text-white hover:opacity-90"
                >
                  {lang === "pt" ? "Ler mais" : "Read more"}
                  <ChevronRight className="size-4" />
                </Button>
                <FavoriteButton
                  itemId={n.id}
                  itemType="news"
                  itemData={{
                    title: n.title,
                    summary: n.summary,
                    image: n.image,
                    category: n.category,
                    date: n.date,
                  }}
                  size="sm"
                  className="shadow-none border"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard?.writeText(n.title[lang]);
                  }}
                  aria-label="Share"
                >
                  <Share2 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Like">
                  <Heart className="size-4" />
                </Button>
              </div>
            </div>
          </motion.article>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {lang === "pt" ? "Sem notícias." : "No news."}
          </p>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={CATEGORY_TONE[selected.category]}>
                    {newsCategoryLabel(selected.category, lang)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{fmt(selected.date)}</span>
                </div>
                <DialogTitle className="text-2xl">{selected.title[lang]}</DialogTitle>
                <DialogDescription className="text-base">
                  {selected.summary[lang]}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-foreground/90">
                {selected.body[lang]}
              </p>
              <div className="flex gap-2 pt-2">
                <FavoriteButton
                  itemId={selected.id}
                  itemType="news"
                  itemData={{
                    title: selected.title,
                    summary: selected.summary,
                    image: selected.image,
                    category: selected.category,
                    date: selected.date,
                  }}
                  size="sm"
                  className="shadow-none border"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Events tab ---------- */
function EventsTab({ lang }: { lang: "pt" | "en" }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {EVENTS.map((ev, i) => (
        <motion.div
          key={ev.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all h-full">
            <div className="relative h-40 overflow-hidden">
              <img
                src={ev.image}
                alt={ev.title[lang]}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${ev.gradient} opacity-40`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-3 left-3">
                <Badge className={`bg-gradient-to-r ${ev.gradient} text-white border-0 text-[10px]`}>
                  {ev.category[lang]}
                </Badge>
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="flex items-center gap-1 text-[11px] font-medium opacity-95">
                  <MapPin className="size-3" /> {ev.location}
                </div>
                <div className="text-xs font-semibold opacity-95">{ev.date[lang]}</div>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg leading-tight mb-2">{ev.title[lang]}</h3>
              <p className="text-sm text-muted-foreground mb-4">{ev.description[lang]}</p>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" /> {ev.attendees}+
                  </span>
                  <span className="font-semibold text-emerald-600">{ev.price[lang]}</span>
                </div>
                <Button
                  size="sm"
                  className={`bg-gradient-to-r ${ev.gradient} text-white border-0 hover:opacity-90`}
                >
                  {lang === "pt" ? "Participar" : "Join"}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Weather tab ---------- */
const WeatherIcon = ({ icon, className }: { icon: "sun" | "cloud" | "rain" | "storm"; className?: string }) => {
  const map = { sun: Sun, cloud: Cloud, rain: CloudRain, storm: CloudLightning };
  const Icon = map[icon];
  const color = { sun: "text-yellow-500", cloud: "text-gray-400", rain: "text-blue-500", storm: "text-purple-500" }[icon];
  return <Icon className={cn(color, className)} />;
};

function WeatherTab({ lang }: { lang: "pt" | "en" }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
      {WEATHER.map((w, i) => (
        <motion.div
          key={w.city}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="overflow-hidden border-blue-100 dark:border-blue-900">
            <div className="relative h-32 overflow-hidden">
              <img
                src={w.image}
                alt={w.city}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                <h3 className="text-2xl font-bold drop-shadow">{w.city}</h3>
                <WeatherIcon icon={w.icon} className="size-8 drop-shadow" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-6">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold">{w.tempC}°</div>
              <div className="text-muted-foreground mt-1">{w.condition[lang]}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-background/60 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {lang === "pt" ? "Humidade" : "Humidity"}
                </div>
                <div className="flex items-center gap-2">
                  <CloudRain className="size-4 text-blue-600" />
                  <span className="font-bold">{w.humidity}%</span>
                </div>
              </div>
              <div className="bg-background/60 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {lang === "pt" ? "Vento" : "Wind"}
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="size-4" />
                  <span className="font-bold">{w.windKmh} km/h</span>
                </div>
              </div>
            </div>
            <div className="border-t border-blue-200/60 dark:border-blue-900/60 pt-4">
              <div className="text-xs font-semibold mb-3">
                {lang === "pt" ? "Próximos dias" : "Next days"}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {w.forecast.map((d, idx) => (
                  <div key={idx} className="bg-background/60 rounded-lg p-2 text-center">
                    <div className="text-[11px] text-muted-foreground mb-1.5">
                      {d.label[lang]}
                    </div>
                    <WeatherIcon icon={d.icon} className="size-6 mx-auto mb-1.5" />
                    <div className="text-sm font-bold">{d.tempC}°</div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Roads tab ---------- */
const SEVERITY_LABEL = {
  high: { pt: "ALTO", en: "HIGH", grad: "from-red-500 to-red-700", bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" },
  medium: { pt: "MÉDIO", en: "MEDIUM", grad: "from-orange-500 to-orange-700", bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900" },
  low: { pt: "BAIXO", en: "LOW", grad: "from-yellow-500 to-yellow-700", bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900" },
} as const;

function RoadsTab({ lang }: { lang: "pt" | "en" }) {
  return (
    <div className="space-y-4">
      {ROAD_ALERTS.map((r, i) => {
        const s = SEVERITY_LABEL[r.severity];
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn("border-2 rounded-2xl shadow-sm overflow-hidden grid md:grid-cols-3", s.bg)}
          >
            <div className="relative h-40 md:h-full md:col-span-1 overflow-hidden">
              <img src={r.image} alt={r.location} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className={`absolute inset-0 bg-gradient-to-t ${s.grad} opacity-30`} />
            </div>
            <div className="p-5 md:col-span-2">
            <div className="flex items-start gap-4">
              <div className={`size-12 bg-gradient-to-br ${s.grad} rounded-xl flex items-center justify-center text-white shrink-0`}>
                <AlertTriangle className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-bold">{r.title[lang]}</h3>
                  <span className={`px-2 py-0.5 bg-gradient-to-r ${s.grad} text-white rounded-full text-[10px] font-bold`}>
                    {s[lang]}
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {r.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {r.postedAgo[lang]}
                  </span>
                </div>
                <p className="text-sm mb-3">{r.description[lang]}</p>
                <div className="grid sm:grid-cols-2 gap-3 bg-background/60 rounded-lg p-3">
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">
                      {lang === "pt" ? "Duração estimada" : "Estimated duration"}
                    </div>
                    <div className="font-semibold text-sm">{r.duration[lang]}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">
                      {lang === "pt" ? "Rota alternativa" : "Alternative route"}
                    </div>
                    <div className="font-semibold text-sm">{r.alternative[lang]}</div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------- Tips tab ---------- */
const TIP_ICON = { camera: Camera, wallet: Wallet, shield: Shield, compass: Compass, utensils: Utensils } as const;
const TIP_GRAD = {
  camera: "from-purple-500 to-pink-500",
  wallet: "from-emerald-500 to-teal-500",
  shield: "from-blue-500 to-indigo-500",
  compass: "from-orange-500 to-red-500",
  utensils: "from-amber-500 to-orange-500",
} as const;

function TipsTab({ lang }: { lang: "pt" | "en" }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {TRAVEL_TIPS.map((t, i) => {
        const Icon = TIP_ICON[t.icon];
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-5 border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all h-full">
              <div className="flex items-start gap-4">
                <div className={`size-12 bg-gradient-to-br ${TIP_GRAD[t.icon]} rounded-xl flex items-center justify-center text-white shrink-0`}>
                  <Icon className="size-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="font-bold">{t.title[lang]}</h3>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-full text-[10px] font-semibold">
                      {t.category[lang]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.body[lang]}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
