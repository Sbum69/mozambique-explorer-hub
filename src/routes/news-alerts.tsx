import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Newspaper,
  Thermometer,
  AlertTriangle,
  Info,
  Search,
  Clock,
  TrendingUp,
  ChevronRight,
  Heart,
  Sun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudLightning,
  Wind,
  Hourglass,
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
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { ShareButton } from "@/components/ShareButton";
import { useLang } from "@/contexts/LanguageContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { useEngagement } from "@/lib/news-engagement";
import { toast } from "sonner";
import { TRAVEL_TIPS } from "@/data/news-extra";
import { getLiveNews } from "@/lib/news.functions";
import { getDestinationWeather } from "@/lib/weather.functions";
import { WEATHER_LABEL, type WeatherKind } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { useBackTarget } from "@/lib/nav";

export const Route = createFileRoute("/news-alerts")({
  head: () => ({
    meta: [
      { title: "Notícias & Avisos — Ekaya Explore" },
      {
        name: "description",
        content: "Notícias, meteorologia e dicas para viajar em Moçambique.",
      },
      { property: "og:title", content: "Notícias & Avisos — Ekaya Explore" },
      {
        property: "og:description",
        content: "Notícias, meteorologia e dicas para viajar em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsAlertsPage,
});

// Events stay hidden until an admin-managed events table exists (DADOS-1).
type Tab = "news" | "weather" | "roads" | "tips";

const TABS: { id: Tab; pt: string; en: string; icon: typeof Newspaper }[] = [
  { id: "news", pt: "Notícias", en: "News", icon: Newspaper },
  {
    id: "weather",
    pt: "Temperatura",
    en: "Weather",
    icon: Thermometer,
  },
  {
    id: "roads",
    pt: "Estradas",
    en: "Roads",
    icon: AlertTriangle,
  },
  { id: "tips", pt: "Dicas", en: "Tips", icon: Info },
];

function NewsAlertsPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const backTarget = useBackTarget();
  const [tab, setTab] = useState<Tab>("news");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <button
              onClick={() => navigate({ to: backTarget })}
              className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 truncate">
                <Newspaper className="size-5 sm:size-6 text-destructive" />
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
              className="hidden sm:flex px-3 py-1.5 bg-destructive/15 rounded-full items-center gap-1.5"
            >
              <span className="size-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-destructive text-xs font-semibold">
                {lang === "pt" ? "AO VIVO" : "LIVE"}
              </span>
            </motion.div>
            <NotificationsBell />
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
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
                      ? "bg-primary text-primary-foreground"
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
        {tab === "weather" && <WeatherTab lang={lang} />}
        {tab === "roads" && <RoadsTab lang={lang} />}
        {tab === "tips" && <TipsTab lang={lang} />}
      </main>
    </div>
  );
}

/* ---------- News tab ---------- */

interface LiveNews {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  thumbnail?: string;
  source: string;
}

function useLiveNews(lang: "pt" | "en") {
  const fetchNews = useServerFn(getLiveNews);
  const q = useQuery({
    queryKey: ["live-news", lang],
    queryFn: () => fetchNews({ data: { lang } }),
    staleTime: 10 * 60 * 1000,
  });
  const feed = q.data;
  const items: LiveNews[] =
    feed?.status === "ok"
      ? feed.items.map((it) => ({
          title: it.title,
          link: it.link,
          description: "",
          pubDate: it.pubDate,
          source: it.source,
        }))
      : [];
  return {
    items,
    loading: q.isPending,
    error: q.isError || feed?.status === "unavailable" ? "unavailable" : null,
    fetchedAt: feed?.status === "ok" ? feed.fetchedAt : null,
  };
}

function NewsTab({ lang }: { lang: "pt" | "en" }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LiveNews | null>(null);
  const live = useLiveNews(lang);
  const { requireAccount } = useAuthGate();

  // Featured = the most recent items of the same live feed (no second feed).
  const featured = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...live.items]
      .filter(
        (n) => !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 4);
  }, [live.items, query]);
  const likeKeys = useMemo(() => featured.map((n) => n.link), [featured]);
  const likes = useEngagement("news", likeKeys);

  const onLike = async (key: string) => {
    if (!requireAccount(lang === "pt" ? "gostar de notícias" : "like news")) return;
    const r = await likes.toggle(key);
    if (!r.ok)
      toast.error(lang === "pt" ? "Não foi possível guardar o gosto." : "Couldn't save like.");
  };

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

      {/* LIVE NEWS from Google News RSS (Mozambique) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full size-2.5 bg-destructive" />
            </span>
            {lang === "pt" ? "Últimas notícias em tempo real" : "Live news right now"}
          </h2>
          <span className="text-[11px] text-muted-foreground text-right">
            {lang === "pt" ? "Fonte: Google News" : "Source: Google News"}
            {live.fetchedAt && (
              <>
                {" · "}
                {lang === "pt" ? "atualizado " : "updated "}
                {fmtLive(live.fetchedAt)}
              </>
            )}
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
              ? "Não foi possível carregar as notícias agora. Tenta novamente mais tarde."
              : "Couldn't load the news right now. Please try again later."}
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
                    loading="lazy"
                    decoding="async"
                    src={it.thumbnail}
                    alt={it.title}
                    className="size-20 rounded-lg object-cover shrink-0"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <div className="size-20 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                    <Newspaper className="size-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-destructive mb-1">
                    <span className="uppercase truncate">{it.source}</span>
                    <span className="text-muted-foreground font-normal">
                      · {fmtLive(it.pubDate)}
                    </span>
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
        {live.loading && <div className="rounded-[10px] border bg-card h-48 animate-pulse" />}
        {featured.map((n, i) => {
          const liked = likes.mine.has(n.link);
          const count = likes.counts[n.link] ?? 0;
          return (
            <motion.article
              key={n.link}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-[10px] shadow-sm border overflow-hidden grid md:grid-cols-3 gap-0"
            >
              <div className="relative h-48 md:h-auto bg-muted">
                {n.thumbnail ? (
                  <img
                    src={n.thumbnail}
                    alt={n.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper className="size-16 text-muted-foreground" />
                  </div>
                )}
                {i === 0 && (
                  <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <TrendingUp className="size-3" /> {lang === "pt" ? "MAIS RECENTE" : "LATEST"}
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <Badge variant="outline" className="bg-background/90">
                    {n.source}
                  </Badge>
                </div>
              </div>
              <div className="md:col-span-2 p-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {fmtLive(n.pubDate)}
                  </span>
                </div>
                <h3 className="text-xl font-bold leading-tight mb-2">{n.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{n.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setSelected(n)}
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    {lang === "pt" ? "Ler mais" : "Read more"}
                    <ChevronRight className="size-4" />
                  </Button>
                  <ShareButton
                    payload={{ title: n.title, description: n.description, url: n.link }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={lang === "pt" ? "Gosto" : "Like"}
                    aria-pressed={liked}
                    disabled={likes.busy === n.link}
                    onClick={() => onLike(n.link)}
                    className="gap-1"
                  >
                    <Heart className={cn("size-4", liked && "fill-destructive text-destructive")} />
                    <span className="text-xs">{count}</span>
                  </Button>
                </div>
              </div>
            </motion.article>
          );
        })}
        {!live.loading && featured.length === 0 && (
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
                  <Badge variant="outline">{selected.source}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtLive(selected.pubDate)}</span>
                </div>
                <DialogTitle className="text-2xl">{selected.title}</DialogTitle>
                <DialogDescription className="text-base">{selected.description}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 pt-2">
                <Button asChild size="sm">
                  <a href={selected.link} target="_blank" rel="noopener noreferrer">
                    {lang === "pt" ? "Ler notícia completa" : "Read full story"}
                    <ChevronRight className="size-4" />
                  </a>
                </Button>
                <ShareButton
                  size="sm"
                  payload={{
                    title: selected.title,
                    description: selected.description,
                    url: selected.link,
                  }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Weather tab (Open-Meteo, real destination coordinates) ---------- */
const WEATHER_ICON: Record<WeatherKind, { icon: typeof Sun; color: string }> = {
  clear: { icon: Sun, color: "text-primary" },
  cloud: { icon: Cloud, color: "text-muted-foreground" },
  fog: { icon: CloudFog, color: "text-muted-foreground" },
  rain: { icon: CloudRain, color: "text-primary" },
  storm: { icon: CloudLightning, color: "text-primary" },
};

const WeatherIcon = ({ kind, className }: { kind: WeatherKind; className?: string }) => {
  const { icon: Icon, color } = WEATHER_ICON[kind];
  return <Icon className={cn(color, className)} aria-hidden="true" />;
};

function WeatherTab({ lang }: { lang: "pt" | "en" }) {
  const pt = lang === "pt";
  const fetchWeather = useServerFn(getDestinationWeather);
  const q = useQuery({
    queryKey: ["destination-weather"],
    queryFn: () => fetchWeather(),
    staleTime: 15 * 60 * 1000,
  });
  const locale = pt ? "pt-PT" : "en-GB";
  const report = q.data;

  if (q.isPending) {
    return (
      <div className="grid sm:grid-cols-2 gap-5" aria-busy="true">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="rounded-xl border bg-card h-56 animate-pulse" />
        ))}
      </div>
    );
  }
  if (q.isError || !report || report.status !== "ok") {
    return (
      <div role="status" className="rounded-[10px] border border-dashed bg-card p-8 text-center">
        <Thermometer className="size-8 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold">{pt ? "Meteorologia indisponível" : "Weather unavailable"}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {pt
            ? "Não foi possível obter os dados da Open-Meteo agora. Tenta mais tarde."
            : "Could not get Open-Meteo data right now. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">
        {pt ? "Fonte: " : "Source: "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {report.source}
        </a>
        {" · "}
        {pt ? "atualizado " : "updated "}
        {new Date(report.fetchedAt).toLocaleString(locale, {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        {report.cities.map((w, i) => (
          <motion.div
            key={w.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-5 h-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">{w.name}</h3>
                  <p className="text-sm text-muted-foreground">{WEATHER_LABEL[w.kind][lang]}</p>
                </div>
                <WeatherIcon kind={w.kind} className="size-10" />
              </div>
              <div className="mt-3 flex items-end gap-4">
                <span className="text-5xl font-bold">{w.tempC}°C</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                  <Wind className="size-4" aria-hidden="true" />
                  {w.windKmh} km/h
                </span>
              </div>
              {w.days.length > 1 && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-xs font-semibold mb-2">
                    {pt ? "Próximos dias" : "Next days"}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {w.days.slice(1, 4).map((d) => (
                      <div key={d.date} className="rounded-lg bg-muted/60 p-2 text-center">
                        <div className="text-[11px] text-muted-foreground mb-1">
                          {new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, {
                            weekday: "short",
                            day: "2-digit",
                          })}
                        </div>
                        <WeatherIcon kind={d.kind} className="size-5 mx-auto mb-1" />
                        <span className="sr-only">{WEATHER_LABEL[d.kind][lang]}: </span>
                        <div className="text-sm font-bold">
                          {d.maxC}°{" "}
                          <span className="font-normal text-muted-foreground">/ {d.minC}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Roads tab: no reliable public source yet ---------- */
function RoadsTab({ lang }: { lang: "pt" | "en" }) {
  const pt = lang === "pt";
  return (
    <div
      role="status"
      className="rounded-[10px] border border-dashed bg-card p-8 text-center max-w-xl mx-auto"
    >
      <Hourglass className="size-8 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
      <p className="font-semibold text-lg">{pt ? "Brevemente" : "Coming soon"}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {pt
          ? "Ainda não temos uma fonte oficial e fiável para o estado das estradas. Antes de viajar, confirma junto das autoridades locais."
          : "We don't have an official, reliable source for road conditions yet. Before travelling, check with the local authorities."}
      </p>
    </div>
  );
}

/* ---------- Tips tab ---------- */
const TIP_ICON = {
  camera: Camera,
  wallet: Wallet,
  shield: Shield,
  compass: Compass,
  utensils: Utensils,
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
                <div className="size-12 bg-accent text-accent-foreground rounded-md flex items-center justify-center shrink-0">
                  <Icon className="size-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="font-bold">{t.title[lang]}</h3>
                    <span className="px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-[10px] font-semibold">
                      {t.category[lang]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.body[lang]}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
