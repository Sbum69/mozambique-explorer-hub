import { useEffect, useRef, type ReactNode } from "react";

import { HeroImage, HERO_PHOTO } from "@/components/HeroImage";
import { PhotoCredit } from "@/components/PhotoCredit";
import type { Lang } from "@/contexts/LanguageContext";
import { PHOTOS } from "@/lib/photo-credits";
import { motionAllowed } from "@/lib/home-story-motion-gate";
import ilha800 from "@/assets/story-ilha-800.avif";
import ilha1600 from "@/assets/story-ilha-1600.avif";
import gor800 from "@/assets/story-gorongosa-800.avif";
import gor1600 from "@/assets/story-gorongosa-1600.avif";

/**
 * Facts shown in the story panels. Each one has its source; nothing here is estimated.
 * Checked 12/11/2026.
 */
export const STORY_FACTS = {
  ilha: [
    {
      pt: "Património Mundial da UNESCO desde 1991",
      en: "UNESCO World Heritage Site since 1991",
      source: "https://whc.unesco.org/en/list/599",
    },
    {
      pt: "Fortaleza de São Sebastião, iniciada em 1558",
      en: "Fort of São Sebastião, begun in 1558",
      source: "https://en.wikipedia.org/wiki/Fort_S%C3%A3o_Sebasti%C3%A3o_(Mozambique)",
    },
  ],
  gorongosa: [
    {
      pt: "Parque nacional desde 1960",
      en: "A national park since 1960",
      source: "https://en.wikipedia.org/wiki/Gorongosa_National_Park",
    },
    {
      pt: "Monte Gorongosa, 1 863 m",
      en: "Mount Gorongosa, 1,863 m",
      source: "https://en.wikipedia.org/wiki/Mount_Gorongosa",
    },
  ],
} as const;

const SCENES = [
  {
    key: "ilha" as const,
    name: "Ilha de Moçambique",
    region: { pt: "Nampula · Norte", en: "Nampula · North" },
    srcSet: `${ilha800} 800w, ${ilha1600} 1600w`,
    small: ilha800,
    photo: PHOTOS["dest-ilha"],
  },
  {
    key: "gorongosa" as const,
    name: "Gorongosa",
    region: { pt: "Sofala · Centro", en: "Sofala · Centre" },
    srcSet: `${gor800} 800w, ${gor1600} 1600w`,
    small: gor800,
    photo: PHOTOS["dest-gorongosa"],
  },
];

/**
 * Home scroll story (approved prototype, docs/motion): the coast opens in two halves and reveals
 * Ilha de Moçambique, then Gorongosa. Only transform and opacity move; the first frame (the hero
 * photo, the page's LCP) is plain server HTML. The motion engine is a separate module, loaded
 * after hydration and only when motion is allowed (not with reduced motion, weak devices or data
 * saver: then the scenes show as plain blocks, see the CSS below).
 */
export function HomeStory({ lang, nav, intro }: { lang: Lang; nav: ReactNode; intro: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !motionAllowed()) {
      document.documentElement.dataset.motion = "off";
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import("@/lib/home-story-motion").then(({ startStory }) => {
      if (!cancelled) stop = startStory(el);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const pt = lang === "pt";
  return (
    <section
      ref={root}
      className="hs"
      aria-label={pt ? "Moçambique em três cenas" : "Mozambique in three scenes"}
    >
      <style>{STORY_CSS}</style>
      <div className="hs-stage">
        {SCENES.map((s) => (
          <div key={s.key} className={`hs-scene hs-${s.key}`} aria-hidden="true">
            {/* No src until the first scroll (the layer sits in the viewport at opacity 0, so
                loading="lazy" would not defer it): home-story-motion.ts fills it in. */}
            <img
              data-src={s.small}
              data-srcset={s.srcSet}
              sizes="100vw"
              alt=""
              decoding="async"
              className="hs-fill"
            />
            <PhotoCredit photo={s.photo} />
          </div>
        ))}
        <div className="hs-half hs-l">
          <HeroImage alt={HERO_PHOTO.shows[lang]} className="hs-fill" priority />
        </div>
        <div className="hs-half hs-r" aria-hidden="true">
          <HeroImage alt="" className="hs-fill" priority />
        </div>
        <div className="hs-veil" />
        <div className="hs-dim" />
        <div className="hs-credit-coast">
          <PhotoCredit photo={HERO_PHOTO} />
        </div>
        <div className="hs-top">{nav}</div>
        <div className="hs-intro">
          {intro}
          <p className="hs-hint">
            <span aria-hidden="true" />
            {pt
              ? "Desce para abrir a costa até à Ilha de Moçambique"
              : "Scroll to open the coast up to Ilha de Moçambique"}
          </p>
        </div>
        {SCENES.map((s) => (
          <article key={s.key} className={`hs-panel hs-p-${s.key}`}>
            <img src={s.small} alt="" loading="lazy" decoding="async" className="hs-panel-photo" />
            <p className="hs-region">{s.region[lang]}</p>
            <h2>{s.name}</h2>
            <ul>
              {STORY_FACTS[s.key].map((f) => (
                <li key={f.source}>
                  {f[lang]}{" "}
                  <a href={f.source} target="_blank" rel="noopener noreferrer">
                    {pt ? "fonte" : "source"}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/*
 * Two layouts from the same HTML:
 *  - motion (default): a 280vh section with a sticky stage; the engine writes CSS variables on
 *    the elements it moves (only transform/opacity read them);
 *  - static (html[data-motion=off], set before paint by the Home head script): the first frame,
 *    then each scene as a block with its photo and facts.
 */
const STORY_CSS = `
.hs{position:relative;height:280vh;background:#000;color:#fff}
.hs-stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden}
.hs-fill{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hs-scene{position:absolute;inset:0;opacity:var(--o,0);transform:scale(var(--s,1.1));will-change:transform,opacity}
.hs-half{position:absolute;inset:0;transform:translate3d(var(--x,0),0,0);will-change:transform}
.hs-l{clip-path:inset(0 50% 0 0)}
.hs-r{clip-path:inset(0 0 0 50%)}
.hs-veil{position:absolute;inset:0;background:linear-gradient(rgb(0 0 0/.7),rgb(0 0 0/.45) 45%,rgb(0 0 0/.65));pointer-events:none}
.hs-dim{position:absolute;inset:0;background:#000;opacity:var(--o,0);pointer-events:none}
.hs-credit-coast{position:absolute;inset:0;opacity:var(--o,1);pointer-events:none}
.hs-credit-coast>*{pointer-events:auto}
.hs-top{position:relative;z-index:3}
.hs-intro{position:absolute;z-index:2;left:0;right:0;bottom:0;padding:0 24px 48px;max-width:72rem;margin:0 auto;opacity:var(--o,1);transform:translate3d(0,var(--y,0),0)}
.hs-hint{display:flex;align-items:center;gap:10px;margin-top:28px;font-size:14px;color:rgb(255 255 255/.85)}
.hs-hint span{width:1px;height:28px;background:#fff}
.hs-panel{position:absolute;z-index:2;left:24px;right:24px;top:50%;max-width:30rem;margin:0 auto;opacity:var(--o,0);transform:translate3d(0,calc(-50% + var(--y,40px)),0);pointer-events:none}
.hs-panel h2{font-family:var(--font-display);font-size:clamp(2.2rem,6vw,4rem);line-height:1;font-weight:700;margin:6px 0 14px;text-wrap:balance}
.hs-panel ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:1.05rem}
.hs-panel a{color:#fff;font-size:.8rem;text-decoration:underline;pointer-events:auto}
.hs-region{font-size:.95rem;margin:0;color:rgb(255 255 255/.85)}
.hs-panel-photo{display:none}
/* Phones: the Home action bar (HomeCta, ~72 px + safe area) sits at the bottom; keep the text clear of it. */
@media (max-width:767px){.hs-intro{padding-bottom:calc(120px + env(safe-area-inset-bottom))}.hs-panel{top:calc(50% - 36px)}}
@media (min-width:768px){.hs-intro{padding:0 40px 64px}.hs-panel{left:auto;right:8vw;margin:0}}
@media (prefers-reduced-motion:reduce){.hs-scene,.hs-half,.hs-panel,.hs-intro{transition:none}}
html[data-motion=off] .hs{height:auto;background:var(--background);color:var(--foreground)}
html[data-motion=off] .hs-stage{position:relative;height:auto;overflow:visible;display:grid}
html[data-motion=off] .hs-scene,html[data-motion=off] .hs-r,html[data-motion=off] .hs-dim,html[data-motion=off] .hs-hint{display:none}
html[data-motion=off] .hs-l,html[data-motion=off] .hs-veil,html[data-motion=off] .hs-credit-coast,html[data-motion=off] .hs-top,html[data-motion=off] .hs-intro{grid-area:1/1;position:relative;inset:auto}
html[data-motion=off] .hs-l{clip-path:none;transform:none;min-height:min(100svh,44rem)}
html[data-motion=off] .hs-top{align-self:start}
html[data-motion=off] .hs-intro{align-self:end;transform:none;opacity:1;color:#fff;width:100%}
html[data-motion=off] .hs-panel{position:relative;inset:auto;top:auto;transform:none;opacity:1;color:var(--foreground);max-width:72rem;margin:0 auto;padding:40px 24px 0;pointer-events:auto;display:grid;gap:4px}
html[data-motion=off] .hs-panel a{color:var(--primary)}
html[data-motion=off] .hs-region{color:var(--muted-foreground)}
html[data-motion=off] .hs-panel-photo{display:block;width:100%;max-width:40rem;aspect-ratio:3/2;object-fit:cover;border-radius:10px;margin-bottom:12px}
`;
