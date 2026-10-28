import { useEffect, useRef, useState } from "react";

/**
 * true once the element is on screen and the browser has a quiet moment (or after `maxWaitMs`).
 * Used to start heavy widgets (the Leaflet map) after the page content has painted.
 */
export function useWhenVisible<T extends Element>(maxWaitMs = 1500) {
  const ref = useRef<T | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || ready) return;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => setReady(true), { timeout: maxWaitMs });
      } else {
        timer = setTimeout(() => setReady(true), 200);
      }
    };
    if (typeof IntersectionObserver !== "function") {
      start();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timer) clearTimeout(timer);
    };
  }, [ready, maxWaitMs]);

  return { ref, ready };
}
