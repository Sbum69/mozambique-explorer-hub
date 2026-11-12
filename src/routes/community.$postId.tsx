import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag,
  Loader2,
  MapPin,
  ThumbsDown,
  ThumbsUp,
  Compass,
  Sparkles,
  Route as RouteIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import {
  fetchCommunityPost,
  toggleReaction,
  type CommunityPost,
  type ReactionValue,
} from "@/lib/community";
import { ReportDialog } from "@/components/ReportDialog";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/community/$postId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Publicação da Comunidade — EKAYA" },
      {
        name: "description",
        content: "Histórias, dicas e perguntas partilhadas pela comunidade EKAYA em Moçambique.",
      },
      { property: "og:title", content: "Publicação da Comunidade — EKAYA" },
      {
        property: "og:description",
        content: "Histórias, dicas e perguntas partilhadas pela comunidade EKAYA em Moçambique.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPostPage,
});

function CommunityPostPage() {
  const { postId } = useParams({ from: "/community/$postId" });
  const { t, lang } = useLang();
  const { requireAccount } = useAuthGate();
  const pt = lang === "pt";

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPost(await fetchCommunityPost(postId));
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const react = async (value: ReactionValue) => {
    if (!post) return;
    if (!requireAccount(pt ? "reagir a publicações" : "react to posts")) return;
    try {
      const next = await toggleReaction(post.id, value);
      setPost((p) => {
        if (!p) return p;
        let { likes, dislikes } = p;
        if (p.myReaction === "like") likes -= 1;
        if (p.myReaction === "dislike") dislikes -= 1;
        if (next === "like") likes += 1;
        if (next === "dislike") dislikes += 1;
        return { ...p, likes, dislikes, myReaction: next };
      });
    } catch {
      toast.error(pt ? "Não foi possível registar a reação." : "Could not save the reaction.");
    }
  };

  const openReport = () => {
    if (!requireAccount(pt ? "denunciar publicações" : "report posts")) return;
    setReporting(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <h1 className="font-bold text-base sm:text-lg truncate">{t("communityTitle")}</h1>
          </div>
          <ThemeToggle />
          <LanguageToggle />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BackButton fallback="/community" showLabel />

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> {t("communityLoading")}
          </div>
        ) : !post ? (
          <Card className="p-10 text-center rounded-[10px] border-dashed">
            <p className="text-muted-foreground">{t("communityFeedEmpty")}</p>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 rounded-[10px] shadow-[var(--shadow-soft)] border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2">
                {post.categoryName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-accent text-accent-foreground">
                    {post.categoryName[lang]}
                  </span>
                )}
                {post.provinceName && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {post.provinceName[lang]}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString(pt ? "pt-PT" : "en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-foreground">{post.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{post.authorName}</p>

              {post.imageUrl && (
                <img src={post.imageUrl} alt="" className="mt-4 rounded-xl w-full object-cover" />
              )}

              <p className="mt-4 text-foreground leading-relaxed whitespace-pre-line">
                {post.content}
              </p>

              {(post.destinationName || post.experienceTitle || post.routeTitle) && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("communityRelated")}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground">
                    {post.destinationName && (
                      <li className="inline-flex items-center gap-2">
                        <Compass className="size-4 text-primary" /> {post.destinationName}
                      </li>
                    )}
                    {post.experienceTitle && (
                      <li className="inline-flex items-center gap-2">
                        <Sparkles className="size-4 text-secondary" /> {post.experienceTitle}
                      </li>
                    )}
                    {post.routeTitle && (
                      <li className="inline-flex items-center gap-2">
                        <RouteIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
                        <Link
                          to="/itinerary/$id"
                          params={{ id: post.routeId! }}
                          className="hover:underline"
                        >
                          {post.routeTitle}
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-6 border-t border-border pt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void react("like")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      post.myReaction === "like"
                        ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                        : "bg-muted text-foreground hover:bg-green-50 dark:hover:bg-green-900/60"
                    }`}
                  >
                    <ThumbsUp className="size-4" /> {post.likes}
                  </button>
                  <button
                    onClick={() => void react("dislike")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      post.myReaction === "dislike"
                        ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                        : "bg-muted text-foreground hover:bg-red-50 dark:hover:bg-red-900/60"
                    }`}
                  >
                    <ThumbsDown className="size-4" /> {post.dislikes}
                  </button>
                </div>
                <Button variant="outline" className="gap-2" onClick={openReport}>
                  <Flag className="size-4" /> {t("communityReport")}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {reporting && post && <ReportDialog post={post} onClose={() => setReporting(false)} />}
      </AnimatePresence>
    </div>
  );
}
