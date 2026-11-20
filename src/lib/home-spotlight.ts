/**
 * Home actions spotlight: once per visit, when the person stops scrolling for SPOTLIGHT_IDLE_MS
 * while the recommendations zone ("Para onde vais?" and the destinations rail) is on screen, the
 * two Home actions get a highlight. Scrolling again (or leaving the zone) ends it, and it never
 * comes back in that visit. Pure timer logic, so it is tested without a browser.
 */
export const SPOTLIGHT_IDLE_MS = 5000;
/** sessionStorage key: "once per visit" (a UI flag, not business data). */
export const SPOTLIGHT_SEEN_KEY = "ekaya.homeSpotlight";

export interface SpotlightStore {
  seen(): boolean;
  markSeen(): void;
}

/** sessionStorage-backed store; falls back to memory when storage is blocked. */
export function sessionSpotlightStore(): SpotlightStore {
  let memory = false;
  return {
    seen() {
      if (memory) return true;
      try {
        return window.sessionStorage.getItem(SPOTLIGHT_SEEN_KEY) === "1";
      } catch {
        return false;
      }
    },
    markSeen() {
      memory = true;
      try {
        window.sessionStorage.setItem(SPOTLIGHT_SEEN_KEY, "1");
      } catch {
        // Storage blocked: the in-memory flag still keeps it to once for this page.
      }
    },
  };
}

export interface SpotlightController {
  /** The zone entered or left the screen. */
  setInZone(inZone: boolean): void;
  /** Any scroll: ends the spotlight and restarts the idle count. */
  onScroll(): void;
  dispose(): void;
}

export function createSpotlight({
  onChange,
  store,
  idleMs = SPOTLIGHT_IDLE_MS,
  isVisible = () => true,
}: {
  onChange: (on: boolean) => void;
  store: SpotlightStore;
  idleMs?: number;
  /** False while the tab is hidden (an idle count in a background tab does not count). */
  isVisible?: () => boolean;
}): SpotlightController {
  let inZone = false;
  let on = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const set = (next: boolean) => {
    if (next === on) return;
    on = next;
    onChange(next);
  };
  const arm = () => {
    clear();
    if (!inZone || store.seen()) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (!inZone || store.seen()) return;
      if (!isVisible()) return arm();
      store.markSeen();
      set(true);
    }, idleMs);
  };

  return {
    setInZone(next) {
      if (next === inZone) return;
      inZone = next;
      if (!next) {
        clear();
        set(false);
      } else arm();
    },
    onScroll() {
      set(false);
      arm();
    },
    dispose() {
      clear();
    },
  };
}
