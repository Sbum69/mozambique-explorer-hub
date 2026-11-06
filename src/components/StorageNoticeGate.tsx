import { Suspense, lazy, useEffect, useState } from "react";

// Loaded only on a first visit: once the notice is dismissed it never downloads again.
const StorageNotice = lazy(() =>
  import("@/components/StorageNotice").then((m) => ({ default: m.StorageNotice })),
);

// The first tap, key or scroll. The browser stops measuring the largest paint (LCP) at that moment,
// so the notice never becomes the page's LCP element and never delays the first load.
const FIRST_INPUT = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/** Shows the storage notice once per device (key "ekaya.storage-notice"), after the first interaction. */
export function StorageNoticeGate() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("ekaya.storage-notice") === "1") return;
    } catch {
      return;
    }
    const open = () => {
      setShow(true);
      for (const e of FIRST_INPUT) window.removeEventListener(e, open);
    };
    for (const e of FIRST_INPUT) window.addEventListener(e, open, { passive: true });
    return () => {
      for (const e of FIRST_INPUT) window.removeEventListener(e, open);
    };
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <StorageNotice onClose={() => setShow(false)} />
    </Suspense>
  );
}
