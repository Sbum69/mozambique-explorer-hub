/**
 * Whether the Home scroll story may move: never with reduced motion, data saver, ≤ 4 CPU cores or
 * ≤ 2 GB of memory (weak phones get the static version). The same rule runs as an inline script
 * in the Home <head>, before the first paint, so switching to the static layout never shifts it
 * (home-story-motion-gate.test.ts keeps the two in step).
 */
interface Env {
  reducedMotion: boolean;
  saveData?: boolean;
  cores?: number;
  memoryGb?: number;
}

export function allowedFor(e: Env): boolean {
  if (e.reducedMotion || e.saveData) return false;
  if (e.cores && e.cores <= 4) return false;
  if (e.memoryGb && e.memoryGb <= 2) return false;
  return true;
}

export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const n = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  return allowedFor({
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: n.connection?.saveData,
    cores: n.hardwareConcurrency,
    memoryGb: n.deviceMemory,
  });
}

/** Inline <head> script for the Home: marks <html data-motion="off"> before the first paint. */
export const MOTION_INIT_SCRIPT =
  "(function(){try{var n=navigator,c=n.connection;" +
  "if(matchMedia('(prefers-reduced-motion: reduce)').matches||(c&&c.saveData)||" +
  "(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||(n.deviceMemory&&n.deviceMemory<=2))" +
  'document.documentElement.dataset.motion="off"}catch(_){}})();';
