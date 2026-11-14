import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass } from "lucide-react";
import { useEffect, useState } from "react";

import type { Lang } from "@/contexts/LanguageContext";

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
  const pt = lang === "pt";
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
      aria-label={pt ? "Ações principais" : "Main actions"}
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
        <Compass className="size-5 shrink-0" aria-hidden="true" />
        {pt ? "Ver recomendações" : "See recommendations"}
      </button>
      <Link
        // Visitors sign in first; /login turns "/dashboard" into the panel of their role.
        to={isGuest ? "/login" : panel}
        search={isGuest ? { redirect: "/dashboard" } : undefined}
        className="home-cta-btn home-cta-secondary"
      >
        {pt ? "Explorar a app" : "Explore the app"}
        <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
      </Link>
    </nav>
  );
}

/*
 * Phones: a full-width bar with safe-area. Larger screens: a floating pill centred at the bottom.
 * Dark background (not the photo) behind both buttons, so their contrast holds on any scene and in
 * both themes. Entrance once; hiding uses the same two properties.
 */
const CTA_CSS = `
.home-cta{position:fixed;z-index:40;left:0;right:0;bottom:0;display:grid;grid-template-columns:1.2fr 1fr;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgb(10 14 16);border-top:1px solid rgb(255 255 255/.18);transition:transform .2s ease-out,opacity .2s ease-out;animation:home-cta-in .4s ease-out .3s backwards}
.home-cta[data-hidden]{transform:translate3d(0,110%,0);opacity:0;pointer-events:none}
.home-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:6px 12px;border-radius:6px;font-weight:600;font-size:.9375rem;line-height:1.15;text-align:center;text-decoration:none}
.home-cta-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.home-cta-secondary{color:#fff;border:1.5px solid rgb(255 255 255/.85)}
.home-cta-secondary:hover{background:rgb(255 255 255/.12)}
@media (min-width:768px){.home-cta{left:50%;right:auto;bottom:24px;display:flex;padding:8px;border:1px solid rgb(255 255 255/.18);border-radius:10px;translate:-50% 0}.home-cta-btn{padding:6px 20px;font-size:1rem}}
@keyframes home-cta-in{from{opacity:0;transform:translate3d(0,16px,0)}}
@media (prefers-reduced-motion:reduce){.home-cta{animation:none;transition:none}}
`;
