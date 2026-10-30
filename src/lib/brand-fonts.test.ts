import { describe, expect, it } from "vitest";

import { BRAND_FONTS_HREF, loadBrandFonts } from "./brand-fonts";

/** Minimal window/document: enough for the loader (load event, idle callback, <link> in head). */
function fakeWindow(readyState: "loading" | "complete") {
  const links: { rel: string; href: string }[] = [];
  const listeners: Record<string, () => void> = {};
  const idle: (() => void)[] = [];
  const doc = {
    readyState,
    head: { appendChild: (l: { rel: string; href: string }) => links.push(l) },
    createElement: () => ({ rel: "", href: "" }),
    querySelector: (sel: string) => (links.some((l) => sel.includes(l.href)) ? {} : null),
  };
  const win = {
    document: doc,
    addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
    requestIdleCallback: (fn: () => void) => idle.push(fn),
    setTimeout: (fn: () => void) => idle.push(fn),
  };
  return {
    win: win as unknown as Window,
    links,
    fire: (t: string) => listeners[t]?.(),
    runIdle: () => idle.splice(0).forEach((f) => f()),
  };
}

describe("PERF-4 brand fonts load after the first paint", () => {
  it("waits for the load event and an idle moment", () => {
    const w = fakeWindow("loading");
    loadBrandFonts(w.win);
    expect(w.links).toHaveLength(0);
    w.fire("load");
    expect(w.links).toHaveLength(0);
    w.runIdle();
    expect(w.links).toEqual([{ rel: "stylesheet", href: BRAND_FONTS_HREF }]);
  });

  it("adds the stylesheet only once", () => {
    const w = fakeWindow("complete");
    loadBrandFonts(w.win);
    loadBrandFonts(w.win);
    w.runIdle();
    expect(w.links).toHaveLength(1);
  });
});
