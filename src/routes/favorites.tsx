import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  MapPin,
  Heart,
  Compass,
  MessageSquare,
  Newspaper,
  Search,
  Grid,
  List,
  Star,
  Trash2,
  Share2,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { useLang } from "@/contexts/LanguageContext";
import { useFavorites, type FavoriteType } from "@/contexts/FavoritesContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Meus Favoritos — Ekaya Explore" },
      {
        name: "description",
        content: "Tudo o que guardaste para explorar depois em Moçambique.",
      },
      { property: "og:title", content: "Meus Favoritos — Ekaya Explore" },
      { property: "og:description", content: "Tudo o que guardaste para explorar depois em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FavoritesPage,
});

type TabFilter = "all" | FavoriteType;

const TABS: { id: TabFilter; pt: string; en: string; icon: typeof Bookmark }[] = [
  { id: "all", pt: "Todos", en: "All", icon: Bookmark },
  { id: "place", pt: "Locais", en: "Places", icon: MapPin },
  { id: "experience", pt: "Experiências", en: "Experiences", icon: Heart },
  { id: "itinerary", pt: "Roteiros", en: "Itineraries", icon: Compass },
  { id: "news", pt: "Notícias", en: "News", icon: Newspaper },
  { id: "post", pt: "Posts", en: "Posts", icon: MessageSquare },
];

function FavoritesPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useFavorites();
  const [tab, setTab] = useState<TabFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<TabFilter, number> = {
      all: favorites.length,
      place: 0,
      experience: 0,
      itinerary: 0,
      news: 0,
      post: 0,
    };
    favorites.forEach((f) => {
      c[f.type] = (c[f.type] ?? 0) + 1;
    });
    return c;
  }, [favorites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return favorites
      .filter((f) => tab === "all" || f.type === tab)
      .filter((f) => {
        if (!q) return true;
        const title =
          (typeof f.data?.title === "object" ? f.data.title[lang] : f.data?.title) ??
          f.data?.name ??
          "";
        return String(title).toLowerCase().includes(q);
      })
      .sort((a, b) => (a.savedDate < b.savedDate ? 1 : -1));
  }, [favorites, tab, query, lang]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleRemove = (id: string, type: FavoriteType) => {
    removeFavorite(id, type);
    toast.success(lang === "pt" ? "Removido dos favoritos" : "Removed from favorites");
  };

  const handleOpen = (item: (typeof favorites)[number]) => {
    switch (item.type) {
      case "place":
        navigate({ to: "/map" });
        break;
      case "experience":
        navigate({ to: "/experiences" });
        break;
      case "itinerary":
        navigate({ to: "/itinerary/$id", params: { id: item.id } });
        break;
      case "news":
        navigate({ to: "/news-alerts" });
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-rose-50/30 dark:to-rose-950/10">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              aria-label={lang === "pt" ? "Voltar" : "Back"}
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 truncate">
                <Bookmark className="size-5 sm:size-6 text-rose-600" />
                {lang === "pt" ? "Meus Favoritos" : "My Favorites"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {lang === "pt"
                  ? "Tudo o que guardaste para explorar depois"
                  : "Everything you saved to explore later"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block px-3 py-1.5 bg-rose-100 dark:bg-rose-950/40 rounded-full">
              <span className="text-rose-700 dark:text-rose-300 text-sm font-semibold">
                {favorites.length} {lang === "pt" ? "itens" : "items"}
              </span>
            </div>
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="sticky top-[57px] sm:top-[73px] z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              const count = counts[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    active
                      ? "bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  <Icon className="size-4" />
                  {lang === "pt" ? t.pt : t.en}
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      active ? "bg-white/20" : "bg-background",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={lang === "pt" ? "Pesquisar favoritos…" : "Search favorites…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-1 rounded-lg border p-0.5">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  view === "grid"
                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label="Grid view"
              >
                <Grid className="size-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  view === "list"
                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label="List view"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {filtered.length === 0 ? (
          <EmptyState lang={lang} onAction={() => navigate({ to: "/dashboard" })} />
        ) : (
          <div
            className={
              view === "grid"
                ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
                : "flex flex-col gap-3"
            }
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((f, i) => (
                <motion.div
                  key={`${f.type}:${f.id}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <FavoriteCard
                    item={f}
                    view={view}
                    lang={lang}
                    onRemove={() => handleRemove(f.id, f.type)}
                    onOpen={() => handleOpen(f)}
                    formatDate={fmtDate}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({
  lang,
  onAction,
}: {
  lang: "pt" | "en";
  onAction: () => void;
}) {
  return (
    <div className="text-center py-20">
      <div className="inline-flex p-5 rounded-full bg-rose-50 dark:bg-rose-950/30 mb-5">
        <Bookmark className="size-14 text-rose-300" />
      </div>
      <h3 className="text-2xl font-bold mb-2">
        {lang === "pt" ? "Nenhum favorito ainda" : "No favorites yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {lang === "pt"
          ? "Começa a guardar locais, experiências e roteiros para os encontrares aqui."
          : "Start saving places, experiences and itineraries to find them here."}
      </p>
      <Button
        onClick={onAction}
        className="bg-gradient-to-r from-rose-500 to-rose-700 text-white hover:opacity-90"
      >
        {lang === "pt" ? "Explorar agora" : "Explore now"}
      </Button>
    </div>
  );
}

function FavoriteCard({
  item,
  view,
  lang,
  onRemove,
  onOpen,
  formatDate,
}: {
  item: { id: string; type: FavoriteType; data: Record<string, any>; savedDate: string };
  view: "grid" | "list";
  lang: "pt" | "en";
  onRemove: () => void;
  onOpen: () => void;
  formatDate: (s: string) => string;
}) {
  const d = item.data;
  const title =
    (d.title && typeof d.title === "object" ? d.title[lang] : d.title) ??
    d.name ??
    "—";
  const description =
    (d.description && typeof d.description === "object"
      ? d.description[lang]
      : d.description) ?? d.summary?.[lang] ?? "";
  const image = d.image ?? d.cover ?? "";
  const location = d.location ?? d.region?.[lang] ?? "";

  const typeLabel =
    item.type === "place"
      ? lang === "pt"
        ? "Local"
        : "Place"
      : item.type === "experience"
        ? lang === "pt"
          ? "Experiência"
          : "Experience"
        : item.type === "itinerary"
          ? lang === "pt"
            ? "Roteiro"
            : "Itinerary"
          : item.type === "news"
            ? lang === "pt"
              ? "Notícia"
              : "News"
            : lang === "pt"
              ? "Post"
              : "Post";

  const typeColor: Record<FavoriteType, string> = {
    place: "bg-blue-100 text-blue-700",
    experience: "bg-orange-100 text-orange-700",
    itinerary: "bg-emerald-100 text-emerald-700",
    news: "bg-red-100 text-red-700",
    post: "bg-purple-100 text-purple-700",
  };

  if (view === "list") {
    return (
      <Card className="p-3 sm:p-4 flex gap-4 hover:shadow-md transition-shadow">
        {image && (
          <img
            src={image}
            alt={title}
            className="size-20 sm:size-24 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn(typeColor[item.type], "border-0 text-[10px]")}>
              {typeLabel}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {formatDate(item.savedDate)}
            </span>
          </div>
          <h3 className="font-bold truncate">{title}</h3>
          {location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3" />
              {location}
            </p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" onClick={onOpen}>
            {lang === "pt" ? "Abrir" : "Open"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all h-full flex flex-col">
      {image && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <Badge className={cn(typeColor[item.type], "border-0")}>
              {typeLabel}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <div className="size-8 bg-background/90 rounded-full flex items-center justify-center">
              <Bookmark className="size-4 text-rose-600 fill-rose-600" />
            </div>
          </div>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg leading-tight">{title}</h3>
        {location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="size-3" />
            {location}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          {typeof d.rating === "number" && (
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-yellow-500 text-yellow-500" />
              {d.rating.toFixed(1)}
            </span>
          )}
          {d.duration && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {d.duration}
            </span>
          )}
          {typeof d.priceMzn === "number" && (
            <span className="flex items-center gap-1">
              <DollarSign className="size-3" />
              {d.priceMzn} MZN
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mt-3 flex-1">
            {description}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">
          {lang === "pt" ? "Guardado em" : "Saved on"} {formatDate(item.savedDate)}
        </p>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Button onClick={onOpen} className="flex-1">
            {lang === "pt" ? "Abrir" : "Open"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard?.writeText(`${title}`);
              toast.success(lang === "pt" ? "Copiado" : "Copied");
            }}
            aria-label="Share"
          >
            <Share2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-rose-600 hover:bg-rose-50"
            aria-label="Remove"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
