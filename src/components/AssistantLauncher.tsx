import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageCircleQuestion } from "lucide-react";

import { useLang } from "@/contexts/LanguageContext";
import { ASSISTANT_TXT } from "@/lib/page-texts";

// The panel, the FAQ and the engine load only when the person opens the help.
const AssistantPanel = lazy(() =>
  import("@/components/AssistantPanel").then((m) => ({ default: m.AssistantPanel })),
);

/** Help button on every page (except admin, receipts and the printed pages). */
export function AssistantLauncher() {
  const { lang } = useLang();
  const t = ASSISTANT_TXT[lang];
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Focus goes back to the help button when the panel closes.
  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus();
    wasOpen.current = open;
  }, [open]);
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname.startsWith("/recibo/")) return null;
  return (
    <>
      {!open && (
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.openLabel}
          aria-haspopup="dialog"
          className="fixed bottom-4 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden"
        >
          <MessageCircleQuestion className="size-5 text-primary" aria-hidden="true" />
          {t.open}
        </button>
      )}
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
