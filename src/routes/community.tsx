import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  PlusCircle,
  ThumbsUp,
  ThumbsDown,
  Send,
  X,
  Shield,
  Search,
  Flag,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { fetchProvinces, type Province } from "@/lib/provinces";
import { fetchDestinations, type Destination } from "@/lib/destinations";
import { fetchExperiences, type Experience } from "@/lib/experiences";
import { fetchPublicRoutes, type ItineraryRoute } from "@/lib/routes";
import {
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityCategories,
  fetchCommunityFeed,
  toggleReaction,
  updateCommunityPost,
  type CommunityCategory,
  type CommunityPost,
  type CommunitySort,
  type ReactionValue,
} from "@/lib/community";

// Shown only after a tap (write, edit, report), so they stay out of the first load.
const PostEditor = lazy(() =>
  import("@/components/CommunityPostEditor").then((m) => ({ default: m.PostEditor })),
);
const ReportDialog = lazy(() =>
  import("@/components/ReportDialog").then((m) => ({ default: m.ReportDialog })),
);

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Comunidade — EKAYA" },
      {
        name: "description",
        content: "Partilha a tua experiência em Moçambique com a comunidade EKAYA.",
      },
      { property: "og:title", content: "Comunidade — EKAYA" },
      {
        property: "og:description",
        content: "Partilha a tua experiência em Moçambique com a comunidade EKAYA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { t, lang } = useLang();
  const [askConfirm, confirmDialog] = useConfirm();
  const { user, authUser, isAdmin } = useAuth();
  const { requireAccount } = useAuthGate();
  const pt = lang === "pt";

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [routes, setRoutes] = useState<ItineraryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [sort, setSort] = useState<CommunitySort>("recent");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPost | null>(null);
  const [reporting, setReporting] = useState<CommunityPost | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchCommunityFeed({ search, categoryId, provinceId, sort }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, provinceId, sort]);

  useEffect(() => {
    void (async () => {
      try {
        const [cats, provs] = await Promise.all([fetchCommunityCategories(), fetchProvinces()]);
        setCategories(cats);
        setProvinces(provs);
      } catch {
        /* filters degrade gracefully */
      }
    })();
  }, []);

  // Selectable real entities for the optional relations in the editor.
  useEffect(() => {
    if (!editorOpen) return;
    void (async () => {
      try {
        const [dest, exps, rts] = await Promise.all([
          fetchDestinations(),
          fetchExperiences(),
          fetchPublicRoutes(),
        ]);
        setDestinations(dest);
        setExperiences(exps);
        setRoutes(rts);
      } catch {
        /* optional relations stay empty */
      }
    })();
  }, [editorOpen]);

  useEffect(() => {
    const timer = setTimeout(() => void loadFeed(), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [loadFeed, search]);

  const openNew = () => {
    if (!requireAccount(pt ? "publicar na comunidade" : "post in the community")) return;
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (post: CommunityPost) => {
    setEditing(post);
    setEditorOpen(true);
  };

  const handleReaction = async (post: CommunityPost, value: ReactionValue) => {
    if (!requireAccount(pt ? "reagir a publicações" : "react to posts")) return;
    try {
      const next = await toggleReaction(post.id, value);
      setPosts((arr) =>
        arr.map((p) => {
          if (p.id !== post.id) return p;
          let { likes, dislikes } = p;
          if (p.myReaction === "like") likes -= 1;
          if (p.myReaction === "dislike") dislikes -= 1;
          if (next === "like") likes += 1;
          if (next === "dislike") dislikes += 1;
          return { ...p, likes, dislikes, myReaction: next };
        }),
      );
    } catch {
      toast.error(pt ? "Não foi possível registar a reação." : "Could not save the reaction.");
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    if (
      !(await askConfirm({
        title: t("communityDeleteConfirm"),
        confirmLabel: t("communityDelete"),
        destructive: true,
      }))
    )
      return;
    try {
      await deleteCommunityPost(post.id);
      setPosts((arr) => arr.filter((p) => p.id !== post.id));
      toast.success(t("communityPostDeleted"));
    } catch {
      toast.error(pt ? "Não foi possível eliminar." : "Could not delete.");
    }
  };

  const openReport = (post: CommunityPost) => {
    if (!requireAccount(pt ? "denunciar publicações" : "report posts")) return;
    setReporting(post);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(pt ? "pt-PT" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");

  const totalLikes = useMemo(() => posts.reduce((s, p) => s + p.likes, 0), [posts]);

  return (
    <div className="min-h-screen bg-background">
      {confirmDialog}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-background/85 backdrop-blur-md shadow-sm border-b"
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
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
            {user && (
              <div className="hidden sm:flex size-9 rounded-full bg-primary text-primary-foreground items-center justify-center font-bold text-sm">
                {user.displayName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        {/* Largest element of the page: shown at once (no entrance fade) so it paints with the first render. */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[10px] border border-border bg-card p-8 pt-10 sm:p-12 sm:pt-14"
        >
          <div className="capulana-band absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
          <MessageSquare className="size-10 mb-4 text-primary" aria-hidden="true" />
          <h2 className="text-3xl sm:text-4xl font-bold">{t("yourVoiceMatters")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">{t("yourVoiceSub")}</p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Stat value={String(posts.length)} label={t("messagesShared")} />
            <Stat value={String(totalLikes)} label={t("communityLike")} />
          </div>
        </motion.div>

        {/* Privacy + CTA */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-3 shadow-sm flex-1">
            <Shield className="size-4 text-primary shrink-0" />
            <span>{t("privacyNote")}</span>
          </div>
          <motion.div>
            <Button onClick={openNew} className="rounded-md py-6 px-6 font-semibold">
              <PlusCircle className="mr-2 size-5" />
              {t("communityNewPost")}
            </Button>
          </motion.div>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("communitySearch")}
              className="pl-9 bg-card"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { id: null as string | null, label: t("allCategories") },
                ...categories.map((c) => ({ id: c.id, label: c.name[lang] })),
              ].map((c) => (
                <button
                  key={c.id ?? "all"}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    categoryId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={provinceId ?? ""}
                onChange={(e) => setProvinceId(e.target.value || null)}
                className="h-9 rounded-full border border-border bg-card px-3 text-sm"
              >
                <option value="">{t("communityAllProvinces")}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name[lang]}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 bg-card border border-border rounded-full p-1">
                {(
                  [
                    { k: "recent", l: t("mostRecent") },
                    { k: "popular", l: t("communityMostPopular") },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.k}
                    onClick={() => setSort(s.k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      sort === s.k
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> {t("communityLoading")}
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-sm text-red-600 dark:text-red-400 rounded-[10px]">
            {t("communityLoadError")}
          </Card>
        ) : posts.length === 0 ? (
          <Card className="p-10 text-center rounded-[10px] border-dashed">
            <MessageSquare className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t("communityFeedEmpty")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {posts.map((p, i) => {
                const mine = !!authUser && p.authorId === authUser.id;
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <Card className="p-5 border border-border bg-card h-full flex flex-col">
                      <div className="flex items-start gap-3">
                        <div className="size-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold shrink-0">
                          {initials(p.authorName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{p.authorName}</h3>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            {p.categoryName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent text-accent-foreground">
                                {p.categoryName[lang]}
                              </span>
                            )}
                            {p.provinceName && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="size-3" /> {p.provinceName[lang]}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {fmtDate(p.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to="/community/$postId"
                        params={{ postId: p.id }}
                        className="mt-3 block"
                      >
                        <h4 className="font-bold text-foreground hover:text-primary transition">
                          {p.title}
                        </h4>
                      </Link>
                      {p.imageUrl && (
                        <img
                          loading="lazy"
                          decoding="async"
                          src={p.imageUrl}
                          alt=""
                          className="mt-3 rounded-xl max-h-52 w-full object-cover"
                        />
                      )}
                      <p className="mt-2 text-sm text-foreground leading-relaxed flex-1 line-clamp-4 whitespace-pre-line">
                        {p.content}
                      </p>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleReaction(p, "like")}
                            aria-label={t("communityLike")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                              p.myReaction === "like"
                                ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                                : "bg-muted text-foreground hover:bg-green-50 dark:hover:bg-green-900/60"
                            }`}
                          >
                            <ThumbsUp className="size-4" /> {p.likes}
                          </button>
                          <button
                            onClick={() => void handleReaction(p, "dislike")}
                            aria-label={t("communityDislike")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                              p.myReaction === "dislike"
                                ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                                : "bg-muted text-foreground hover:bg-red-50 dark:hover:bg-red-900/60"
                            }`}
                          >
                            <ThumbsDown className="size-4" /> {p.dislikes}
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {mine && (
                            <>
                              <button
                                onClick={() => openEdit(p)}
                                className="size-8 rounded-lg bg-accent text-accent-foreground hover:bg-muted flex items-center justify-center"
                                aria-label={t("communityEditPost")}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                onClick={() => void handleDelete(p)}
                                className="size-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 flex items-center justify-center"
                                aria-label={t("communityDelete")}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                          {isAdmin && !mine && (
                            <button
                              onClick={() => void handleDelete(p)}
                              className="size-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 flex items-center justify-center"
                              aria-label={t("communityDelete")}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                          {!mine && (
                            <button
                              onClick={() => openReport(p)}
                              className="size-8 rounded-lg bg-muted text-muted-foreground hover:bg-muted flex items-center justify-center"
                              aria-label={t("communityReport")}
                            >
                              <Flag className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <AnimatePresence>
        {editorOpen && (
          <Suspense fallback={null}>
            <PostEditor
              post={editing}
              categories={categories}
              provinces={provinces}
              destinations={destinations}
              experiences={experiences}
              routes={routes}
              onClose={() => setEditorOpen(false)}
              onSaved={() => {
                setEditorOpen(false);
                void loadFeed();
              }}
            />
          </Suspense>
        )}
        {reporting && (
          <Suspense fallback={null}>
            <ReportDialog post={reporting} onClose={() => setReporting(null)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
