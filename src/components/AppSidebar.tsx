import { Suspense, lazy, useState } from "react";
import { Loader2, Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

// The panel only shows after a tap, so it stays out of the first load.
const loadPanel = () => import("@/components/AppSidebarPanel");
const AppSidebarPanel = lazy(() => loadPanel().then((m) => ({ default: m.AppSidebarPanel })));

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  const prefetch = () => void loadPanel();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          onPointerEnter={prefetch}
          onFocus={prefetch}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[320px] sm:w-[360px] p-0 flex flex-col gap-0"
        aria-describedby={undefined}
      >
        {/* Screen-reader name for the menu; the visible header lives in the lazy panel. */}
        <SheetTitle className="sr-only">
          {lang === "pt" ? "Menu principal" : "Main menu"}
        </SheetTitle>
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center" aria-busy="true">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
            </div>
          }
        >
          <AppSidebarPanel close={() => setOpen(false)} />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
