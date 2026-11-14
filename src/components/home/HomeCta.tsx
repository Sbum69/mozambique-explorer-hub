import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Map as MapIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { Lang } from "@/contexts/LanguageContext";
import { HOME_CTA_TXT } from "@/lib/page-texts";

/** Ids the bar watches: the plan card has its own "Ver recomendações", and the bar ends after the rail. */
export const HOME_PLAN_ID = "home-plan";
export const HOME_CTA_END_ID = "home-cta-end";

/**
 * The two Home actions, always on screen through the story (coast, Ilha de Moçambique, Gorongosa)
 * and the destinations rail: a fixed bar at the bottom on phones, a floating pill on larger screens.
 * Hidden while the plan card is on screen (its own button is the same action) and after the rail.
 * One entrance (transform/opacity only), no continuous animation; the static story keeps it too.
 */
export function HomeCta({
  lang,
  isGuest,
  panel,
  onRecommend,
}: {
  lang: Lang;
  isGuest: boolean;
  /** The signed-in account's panel (traveller, business or admin). */
  panel: "/dashboard" | "/business-dashboard" | "/admin";
  onRecommend: () => void;
}) {
  const t = HOME_CTA_TXT[lang];
  const [planOnScreen, setPlanOnScreen] = useState(false);
  const [pastEnd, setPastEnd] = useState(false);
  const hidden = planOnScreen || pastEnd;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const plan = document.getElementById(HOME_PLAN_ID);
    const end = document.getElementById(HOME_CTA_END_ID);
    // The plan card counts only in the middle band of the screen (not while it just touches an edge).
    const planIo = new IntersectionObserver(([e]) => setPlanOnScreen(e.isIntersecting), {
      rootMargin: "-35% 0px -35% 0px",
    });
    // Past the end once the marker after the rail reaches the top 40% of the screen (or above it).
    const endIo = new IntersectionObserver(
      ([e]) => setPastEnd(e.isIntersecting || e.boundingClientRect.top < 0),
      { rootMargin: "0px 0px -60% 0px" },
    );
    if (plan) planIo.observe(plan);
    if (end) endIo.observe(end);
    return () => {
      planIo.disconnect();
      endIo.disconnect();
    };
  }, []);

  // Floating helpers (assistant, storage notice) move above the bar while it is shown.
  useEffect(() => {
    const root = document.documentElement;
    if (hidden) delete root.dataset.homeCta;
    else root.dataset.homeCta = "on";
    return () => {
      delete root.dataset.homeCta;
    };
  }, [hidden]);

  return (
    <nav
      aria-label={t.nav}
      className="home-cta dark"
      data-hidden={hidden ? "" : undefined}
      inert={hidden || undefined}
    >
      <style>{CTA_CSS}</style>
      <button
        type="button"
        onClick={onRecommend}
        className="home-cta-btn bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <span className="home-cta-tile home-cta-tile-primary" aria-hidden="true">
          <Compass className="home-cta-ic home-cta-turn size-5" />
        </span>
        <span className="home-cta-text">
          <span className="home-cta-label">{t.recommend}</span>
          <span className="home-cta-sub">{t.recommendSub}</span>
        </span>
      </button>
      <Link
        // Visitors sign in first; /login turns "/dashboard" into the panel of their role.
        to={isGuest ? "/login" : panel}
        search={isGuest ? { redirect: "/dashboard" } : undefined}
        className="home-cta-btn home-cta-secondary"
      >
        <span className="home-cta-tile home-cta-wide" aria-hidden="true">
          <MapIcon className="size-5" />
        </span>
        <span className="home-cta-text">
          <span className="home-cta-label">{t.app}</span>
          <span className="home-cta-sub">{t.appSub}</span>
        </span>
        <ArrowRight
          className="home-cta-ic home-cta-nudge home-cta-narrow size-5"
          aria-hidden="true"
        />
      </Link>
    </nav>
  );
}

/*
 * Phones (< 768 px): a full-width bar with safe-area; each button is one line with its icon, and a
 * press shrinks it a little (microinteraction). Larger screens: a floating pill with two cards
 * (icon tile, title and subtitle) that lift 2 px on hover. Dark background (not the photo) behind
 * both buttons, so their contrast holds on any scene and in both themes. Only transform and
 * opacity move, and nothing moves with prefers-reduced-motion.
 */
const CTA_CSS = `
.home-cta{position:fixed;z-index:40;left:0;right:0;bottom:0;display:grid;grid-template-columns:1.2fr 1fr;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgb(10 14 16);border-top:1px solid rgb(255 255 255/.18);transition:transform .2s ease-out,opacity .2s ease-out;animation:home-cta-in .4s ease-out .3s backwards}
.home-cta[data-hidden]{transform:translate3d(0,110%,0);opacity:0;pointer-events:none}
.home-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:6px 10px;border-radius:6px;font-weight:600;font-size:.9375rem;line-height:1.15;text-align:center;text-decoration:none;white-space:nowrap;transition:transform .18s ease-out}
.home-cta-btn:active{transform:scale(.97)}
.home-cta-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.home-cta-secondary{color:#fff;border:1.5px solid rgb(255 255 255/.85)}
.home-cta-secondary:hover{background:rgb(255 255 255/.12)}
.home-cta-ic{flex:none;transition:transform .2s ease-out}
.home-cta-btn:hover .home-cta-turn{transform:rotate(-30deg)}
.home-cta-btn:hover .home-cta-nudge{transform:translateX(4px)}
.home-cta-tile{display:inline-flex;flex:none}
.home-cta-text{display:grid}
.home-cta-sub,.home-cta-wide{display:none}
@media (min-width:768px){
.home-cta{left:50%;right:auto;bottom:24px;display:flex;padding:8px;border:1px solid rgb(255 255 255/.18);border-radius:10px;translate:-50% 0}
.home-cta-btn{justify-content:flex-start;gap:10px;min-width:250px;min-height:60px;padding:8px 16px 8px 10px;text-align:left}
.home-cta-btn:hover{transform:translateY(-2px)}
.home-cta-btn:active{transform:scale(.97)}
.home-cta-tile{width:40px;height:40px;border-radius:6px;align-items:center;justify-content:center;background:rgb(255 255 255/.1)}
.home-cta-tile-primary{background:rgb(0 0 0/.14)}
.home-cta-text{gap:2px}
.home-cta-label{font-size:1rem;font-weight:700}
.home-cta-sub{display:block;font-weight:400;font-size:.8125rem;line-height:1.2}
.home-cta-wide{display:inline-flex}
.home-cta-narrow{display:none}
}
@keyframes home-cta-in{from{opacity:0;transform:translate3d(0,16px,0)}}
@media (prefers-reduced-motion:reduce){.home-cta,.home-cta-btn,.home-cta-ic{animation:none;transition:none}.home-cta-btn:hover,.home-cta-btn:active,.home-cta-btn:hover .home-cta-ic{transform:none}}
`;
