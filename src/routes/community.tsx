import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, PlusCircle, ThumbsUp, ThumbsDown, Send, X, Shield,
  Search, Flag, Pencil, Trash2, Loader2, MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
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
  reportCommunityPost,
  toggleReaction,
  updateCommunityPost,
  type CommunityCategory,
  type CommunityPost,
  type CommunitySort,
  type ReactionValue,
  type ReportReason,
} from "@/lib/community";

export const Route = createFileRoute("/community")({
  ssr: false,
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

const REPORT_REASONS: { value: ReportReason; key: "reasonSpam" | "reasonInappropriate" | "reasonMisleading" | "reasonOffensive" | "reasonOther" }[] = [
  { value: "spam", key: "reasonSpam" },
  { value: "inappropriate", key: "reasonInappropriate" },
  { value: "misleading", key: "reasonMisleading" },
  { value: "offensive", key: "reasonOffensive" },
  { value: "other", key: "reasonOther" },
];

const AVATAR_GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-green-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
  "from-amber-500 to-orange-600",
];

function CommunityPage() {
  const { t, lang } = useLang();
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
    if (!requireAccount(pt ? "Publicar na comunidade" : "Post in the community")) return;
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (post: CommunityPost) => {
    setEditing(post);
    setEditorOpen(true);
  };

  const handleReaction = async (post: CommunityPost, value: ReactionValue) => {
    if (!requireAccount(pt ? "Reagir a publicações" : "React to posts")) return;
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
    if (!window.confirm(t("communityDeleteConfirm"))) return;
    try {
      await deleteCommunityPost(post.id);
      setPosts((arr) => arr.filter((p) => p.id !== post.id));
      toast.success(t("communityPostDeleted"));
    } catch {
      toast.error(pt ? "Não foi possível eliminar." : "Could not delete.");
    }
  };

  const openReport = (post: CommunityPost) => {
    if (!requireAccount(pt ? "Denunciar publicações" : "Report posts")) return;
    setReporting(post);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(pt ? "pt-PT" : "en-US", { day: "2-digit", month: "short", year: "numeric" });

  const initials = (name: string) =>
    name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");

  const totalLikes = useMemo(() => posts.reduce((s, p) => s + p.likes, 0), [posts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
            <Stat value={String(posts.length)} label={t("messagesShared")} />
            <Stat value={String(totalLikes)} label={t("communityLike")} />
          </div>
        </motion.div>

        {/* Privacy + CTA */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm flex-1">
            <Shield className="size-4 text-blue-600 shrink-0" />
            <span>{t("privacyNote")}</span>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={openNew}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg rounded-xl py-6 px-6 font-semibold"
            >
              <PlusCircle className="mr-2 size-5" />
              {t("communityNewPost")}
            </Button>
          </motion.div>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("communitySearch")}
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[{ id: null as string | null, label: t("allCategories") }, ...categories.map((c) => ({ id: c.id, label: c.name[lang] }))].map((c) => (
                <button
                  key={c.id ?? "all"}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    categoryId === c.id
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
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
                className="h-9 rounded-full border border-gray-200 bg-white px-3 text-sm"
              >
                <option value="">{t("communityAllProvinces")}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name[lang]}</option>
                ))}
              </select>
              <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1">
                {([{ k: "recent", l: t("mostRecent") }, { k: "popular", l: t("communityMostPopular") }] as const).map((s) => (
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
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="size-5 animate-spin" /> {t("communityLoading")}
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-sm text-red-600 rounded-2xl">{t("communityLoadError")}</Card>
        ) : posts.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed">
            <MessageSquare className="mx-auto size-10 text-gray-300" />
            <p className="mt-3 text-gray-600">{t("communityFeedEmpty")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {posts.map((p, i) => {
                const mine = !!authUser && p.authorId === authUser.id;
                const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                return (
                  <motion.div key={p.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                    <Card className="p-5 rounded-2xl shadow-lg border border-gray-100 bg-white h-full flex flex-col">
                      <div className="flex items-start gap-3">
                        <div className={`size-12 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-bold shrink-0`}>
                          {initials(p.authorName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{p.authorName}</h3>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            {p.categoryName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                                {p.categoryName[lang]}
                              </span>
                            )}
                            {p.provinceName && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="size-3" /> {p.provinceName[lang]}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">{fmtDate(p.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <Link to="/community/$postId" params={{ postId: p.id }} className="mt-3 block">
                        <h4 className="font-bold text-gray-900 hover:text-blue-600 transition">{p.title}</h4>
                      </Link>
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" className="mt-3 rounded-xl max-h-52 w-full object-cover" />
                      )}
                      <p className="mt-2 text-sm text-gray-700 leading-relaxed flex-1 line-clamp-4 whitespace-pre-line">{p.content}</p>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleReaction(p, "like")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                              p.myReaction === "like" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700 hover:bg-green-50"
                            }`}
                          >
                            <ThumbsUp className="size-4" /> {p.likes}
                          </button>
                          <button
                            onClick={() => void handleReaction(p, "dislike")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                              p.myReaction === "dislike" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-red-50"
                            }`}
                          >
                            <ThumbsDown className="size-4" /> {p.dislikes}
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {mine && (
                            <>
                              <button onClick={() => openEdit(p)} className="size-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center" aria-label={t("communityEditPost")}>
                                <Pencil className="size-4" />
                              </button>
                              <button onClick={() => void handleDelete(p)} className="size-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center" aria-label={t("communityDelete")}>
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                          {isAdmin && !mine && (
                            <button onClick={() => void handleDelete(p)} className="size-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center" aria-label={t("communityDelete")}>
                              <Trash2 className="size-4" />
                            </button>
                          )}
                          {!mine && (
                            <button onClick={() => openReport(p)} className="size-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center" aria-label={t("communityReport")}>
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
        )}
        {reporting && (
          <ReportDialog post={reporting} onClose={() => setReporting(null)} />
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

/* ---------------- Editor ---------------- */

function PostEditor({
  post, categories, provinces, destinations, experiences, routes, onClose, onSaved,
}: {
  post: CommunityPost | null;
  categories: CommunityCategory[];
  provinces: Province[];
  destinations: Destination[];
  experiences: Experience[];
  routes: ItineraryRoute[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [provinceId, setProvinceId] = useState(post?.provinceId ?? "");
  const [destinationId, setDestinationId] = useState(post?.destinationId ?? "");
  const [experienceId, setExperienceId] = useState(post?.experienceId ?? "");
  const [routeId, setRouteId] = useState(post?.routeId ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim() || !categoryId || !provinceId) {
      toast.error(t("communityRequiredFields"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        content,
        categoryId,
        provinceId,
        destinationId: destinationId || null,
        experienceId: experienceId || null,
        routeId: routeId || null,
      };
      if (post) {
        await updateCommunityPost(post.id, payload);
        toast.success(t("communityPostUpdated"));
      } else {
        await createCommunityPost(payload);
        toast.success(t("communityPostCreated"));
      }
      onSaved();
    } catch {
      toast.error(lang === "pt" ? "Não foi possível guardar." : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5 flex items-center justify-between">
          <h3 className="font-bold">{post ? t("communityEditPost") : t("communityNewPost")}</h3>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <Field label={`${t("communityPostTitle")} *`}>
            <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 160))} />
          </Field>
          <Field label={`${t("communityPostContent")} *`}>
            <Textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 4000))} className="h-32" />
          </Field>
          <Field label={`${t("categoryField")} *`}>
            <Select value={categoryId} onChange={setCategoryId} placeholder="—">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
            </Select>
          </Field>
          <Field label={`${t("communityProvince")} *`}>
            <Select value={provinceId} onChange={setProvinceId} placeholder="—">
              {provinces.map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
            </Select>
          </Field>
          <Field label={t("communityDestination")}>
            <Select value={destinationId} onChange={setDestinationId} placeholder="—">
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label={t("communityExperience")}>
            <Select value={experienceId} onChange={setExperienceId} placeholder="—">
              {experiences.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          </Field>
          <Field label={t("communityRoute")}>
            <Select value={routeId} onChange={setRouteId} placeholder="—">
              {routes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </Select>
          </Field>
          <p className="text-xs text-gray-500">{t("communityImageSoon")}</p>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button
            onClick={() => void submit()}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            {post ? t("communitySave") : t("communityPublish")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Select({
  value, onChange, placeholder, children,
}: { value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

/* ---------------- Report dialog ---------------- */

export function ReportDialog({ post, onClose }: { post: { id: string; title: string }; onClose: () => void }) {
  const { t, lang } = useLang();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await reportCommunityPost(post.id, reason, description);
      toast.success(t("communityReportSent"));
      onClose();
    } catch {
      toast.error(lang === "pt" ? "Não foi possível enviar a denúncia." : "Could not send the report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
          <h3 className="font-bold inline-flex items-center gap-2"><Flag className="size-4" /> {t("communityReport")}</h3>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 line-clamp-2">{post.title}</p>
          <Field label={t("communityReportReason")}>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
            </select>
          </Field>
          <Field label={t("communityReportDescription")}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} className="h-24" />
          </Field>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button onClick={() => void submit()} disabled={sending} className="bg-gray-900 text-white hover:bg-gray-800">
            {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Flag className="mr-2 size-4" />}
            {t("communityReport")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
