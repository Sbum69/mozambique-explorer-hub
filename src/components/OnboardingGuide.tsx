import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { GuideOutcome, GuideStep } from "@/lib/guide";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6;

/**
 * Hand-made spotlight guide (no library): a dark veil with a hole around the real element of each
 * step, and a card with "Seguinte", "Saltar" and "Não voltar a mostrar". Modal for keyboard and
 * screen readers (focus stays in the card, Esc skips). Only transform/opacity move, and nothing
 * moves with prefers-reduced-motion. Loaded lazily by the panels only.
 */
export default function OnboardingGuide({
  steps: allSteps,
  lang,
  onClose,
}: {
  steps: GuideStep[];
  lang: "pt" | "en";
  onClose: (outcome: GuideOutcome) => void;
}) {
  const pt = lang === "pt";
  // Only the steps whose element is on the page (e.g. no itinerary yet: the preferences card).
  // Panels load their data after the first paint: wait up to 4 s for the elements to appear.
  const [steps, setSteps] = useState<GuideStep[] | null>(null);
  useEffect(() => {
    let tries = 0;
    const find = () => allSteps.filter((s) => document.querySelector(`[data-guide="${s.target}"]`));
    const id = window.setInterval(() => {
      const found = find();
      tries += 1;
      if (found.length === allSteps.length || tries >= 16) {
        window.clearInterval(id);
        setSteps(found);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [allSteps]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const step = steps?.[index];
  const last = !!steps && index === steps.length - 1;
  const reduce = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-guide="${step.target}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step]);

  // New step: bring its element into view (leaving room for the card on phones), then measure.
  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(`[data-guide="${step.target}"]`);
    if (el) {
      // One scroll only (a second, instant one would cancel the smooth one): phones put the element
      // under the header (the card is a sheet at the bottom), larger screens centre it.
      const r = el.getBoundingClientRect();
      // Room for the page's sticky header (its real height: one or two rows).
      const header = [...document.querySelectorAll<HTMLElement>("header, nav")]
        .filter((h) => ["sticky", "fixed"].includes(getComputedStyle(h).position))
        .filter((h) => h.getBoundingClientRect().top <= 1)
        .reduce((m, h) => Math.max(m, h.getBoundingClientRect().bottom), 0);
      const gap = Math.max(64, header) + 16;
      const top = mobile
        ? window.scrollY + r.top - gap
        : window.scrollY + r.top - Math.max(gap, (window.innerHeight - r.height) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: reduce.current ? "auto" : "smooth" });
    }
    measure();
    const t = window.setTimeout(measure, reduce.current ? 0 : 450);
    primaryRef.current?.focus();
    return () => window.clearTimeout(t);
  }, [step, mobile, measure]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onMq = () => setMobile(mq.matches);
    mq.addEventListener("change", onMq);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [measure]);

  // Phones: room at the end of the page, so the last elements can move above the bottom sheet.
  useEffect(() => {
    if (!mobile) return;
    const body = document.body;
    const before = body.style.paddingBottom;
    body.style.paddingBottom = "60vh";
    return () => {
      body.style.paddingBottom = before;
    };
  }, [mobile]);

  // Nothing to show on this page: close as skipped (it can be opened again from Help).
  useEffect(() => {
    if (steps && steps.length === 0) onClose("skipped");
  }, [steps, onClose]);

  const next = () => (last ? onClose("completed") : setIndex((i) => i + 1));

  // Keyboard: Esc skips; Tab stays inside the card (modal).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose("skipped");
      return;
    }
    if (e.key !== "Tab" || !cardRef.current) return;
    const items = [...cardRef.current.querySelectorAll<HTMLElement>("button")];
    const first = items[0];
    const end = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      end.focus();
    } else if (!e.shiftKey && document.activeElement === end) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!steps || !step) return null;

  // Desktop: the card sits below the element, or above when there is no room.
  const cardWidth = 360;
  const below = rect ? rect.top + rect.height + 12 : 96;
  const fitsBelow = rect ? below + 220 < window.innerHeight : true;
  const cardTop = rect ? (fitsBelow ? below : Math.max(12, rect.top - 220 - 12)) : 96;
  const cardLeft = rect
    ? Math.min(Math.max(12, rect.left), window.innerWidth - cardWidth - 12)
    : 12;

  return createPortal(
    <div className="ek-guide" onKeyDown={onKeyDown}>
      <style>{GUIDE_CSS}</style>
      {/* The veil with a hole (only a dark veil, no colour gradient) around the real element. */}
      <div
        className="ek-guide-hole"
        aria-hidden="true"
        style={
          rect
            ? {
                width: rect.width,
                height: rect.height,
                transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
              }
            : { width: 0, height: 0, transform: "translate3d(50vw, 50vh, 0)" }
        }
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={`ek-guide-card bg-card text-card-foreground border border-border ${mobile ? "ek-guide-sheet" : ""}`}
        style={
          mobile
            ? undefined
            : { width: cardWidth, transform: `translate3d(${cardLeft}px, ${cardTop}px, 0)` }
        }
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {pt ? `Passo ${index + 1} de ${steps.length}` : `Step ${index + 1} of ${steps.length}`}
        </p>
        <h2 id={titleId} className="mt-1 font-display text-xl font-bold tracking-tight">
          {step.title[lang]}
        </h2>
        <p id={bodyId} className="mt-1 text-sm text-muted-foreground">
          {step.body[lang]}
        </p>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.target}
              className={`h-1.5 rounded-full ${i === index ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button ref={primaryRef} onClick={next} className="h-11 px-5">
            {last ? (pt ? "Concluir" : "Done") : pt ? "Seguinte" : "Next"}
          </Button>
          <Button variant="outline" className="h-11" onClick={() => onClose("skipped")}>
            {pt ? "Saltar" : "Skip"}
          </Button>
          <button
            type="button"
            onClick={() => onClose("dismissed")}
            className="ml-auto min-h-11 px-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {pt ? "Não voltar a mostrar" : "Don't show again"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const GUIDE_CSS = `
.ek-guide{position:fixed;inset:0;z-index:70}
.ek-guide-hole{position:fixed;left:0;top:0;border-radius:10px;box-shadow:0 0 0 9999px rgb(0 0 0/.62);outline:2px solid var(--primary);outline-offset:0;transition:transform .3s ease-out,opacity .3s ease-out;pointer-events:none}
.ek-guide-card{position:fixed;left:0;top:0;border-radius:10px;padding:16px;transition:transform .3s ease-out,opacity .2s ease-out;animation:ek-guide-in .2s ease-out}
.ek-guide-sheet{left:8px;right:8px;top:auto;bottom:calc(8px + env(safe-area-inset-bottom))}
@keyframes ek-guide-in{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.ek-guide-hole,.ek-guide-card{transition:none;animation:none}}
`;
