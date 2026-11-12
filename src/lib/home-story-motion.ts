/**
 * Motion engine of the Home scroll story (ported from docs/motion/EKAYA_Prototipo_Motion.html).
 * One requestAnimationFrame, scheduled only while scrolling (or while the smoothing catches up);
 * it only writes CSS variables that the stylesheet turns into transform and opacity.
 * Returns a function that removes the listeners.
 */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** smoothstep between e0 and e1 */
const ss = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
/** enters between a–b, leaves between c–d; act = visible part */
const seg = (s: number, a: number, b: number, c: number, d: number) => {
  const en = ss(a, b, s);
  const ex = ss(c, d, s);
  return { en, ex, act: en * (1 - ex) };
};

export function storyFrame(s: number) {
  const intro = ss(0.02, 0.16, s);
  const split = ss(0.1, 0.34, s);
  const ilhaP = seg(s, 0.26, 0.34, 0.5, 0.58);
  const gorIn = ss(0.55, 0.68, s);
  const gorP = seg(s, 0.66, 0.74, 0.9, 0.98);
  const drift = Math.pow(split, 1.4);
  return {
    intro: { o: 1 - intro, y: intro * -120 },
    halves: { x: drift * 52 },
    ilha: { o: split * (1 - gorIn), s: 1.12 - split * 0.1 },
    gorongosa: { o: gorIn, s: 1.1 - gorIn * 0.08 },
    coastCredit: { o: 1 - split },
    dim: { o: Math.max(ilhaP.act, gorP.act) * 0.4 },
    panelIlha: { o: ilhaP.act, y: (1 - ilhaP.en) * 40 - ilhaP.ex * 60 },
    panelGor: { o: gorP.act, y: (1 - gorP.en) * 40 - gorP.ex * 60 },
  };
}

export function startStory(root: HTMLElement): () => void {
  const q = (sel: string) => root.querySelector<HTMLElement>(sel)!;
  const el = {
    intro: q(".hs-intro"),
    left: q(".hs-l"),
    right: q(".hs-r"),
    ilha: q(".hs-ilha"),
    gor: q(".hs-gorongosa"),
    credit: q(".hs-credit-coast"),
    dim: q(".hs-dim"),
    pIlha: q(".hs-p-ilha"),
    pGor: q(".hs-p-gorongosa"),
  };
  const set = (node: HTMLElement, k: string, v: string) => node.style.setProperty(k, v);

  let target = 0;
  let shown = -1;
  let pending = false;

  const progress = () => {
    const r = root.getBoundingClientRect();
    const run = root.offsetHeight - innerHeight;
    return run > 0 ? clamp(-r.top / run) : 0;
  };

  const draw = () => {
    pending = false;
    target = progress();
    // Light smoothing; jumps straight to the target when close (no endless frames).
    shown =
      shown < 0 || Math.abs(target - shown) < 0.0005 ? target : shown + (target - shown) * 0.2;
    const f = storyFrame(shown);
    set(el.intro, "--o", f.intro.o.toFixed(3));
    set(el.intro, "--y", `${f.intro.y.toFixed(1)}px`);
    set(el.left, "--x", `${-f.halves.x}vw`);
    set(el.right, "--x", `${f.halves.x}vw`);
    set(el.ilha, "--o", f.ilha.o.toFixed(3));
    set(el.ilha, "--s", f.ilha.s.toFixed(4));
    set(el.gor, "--o", f.gorongosa.o.toFixed(3));
    set(el.gor, "--s", f.gorongosa.s.toFixed(4));
    set(el.credit, "--o", f.coastCredit.o.toFixed(3));
    set(el.dim, "--o", f.dim.o.toFixed(3));
    set(el.pIlha, "--o", f.panelIlha.o.toFixed(3));
    set(el.pIlha, "--y", `${f.panelIlha.y.toFixed(1)}px`);
    set(el.pGor, "--o", f.panelGor.o.toFixed(3));
    set(el.pGor, "--y", `${f.panelGor.y.toFixed(1)}px`);
    if (shown !== target) tick();
  };
  const tick = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(draw);
    }
  };

  // Pictures of the next scenes: requested on the first scroll, never competing with the first paint.
  let warmed = false;
  const onScroll = () => {
    if (!warmed) {
      warmed = true;
      for (const img of root.querySelectorAll<HTMLImageElement>(".hs-scene img")) {
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        if (img.dataset.src) img.src = img.dataset.src;
      }
    }
    tick();
  };

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", tick);
  tick();
  return () => {
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", tick);
  };
}
