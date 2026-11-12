import { useEffect, useRef, useState } from "react";

/**
 * true once the element comes within `margin` of the viewport (and stays true). Lets a page keep
 * below-the-fold requests and rendering out of the first load; without IntersectionObserver it is
 * true at once.
 */
export function useNearViewport<T extends Element>(margin = "800px 0px") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);
  return [ref, near] as const;
}
