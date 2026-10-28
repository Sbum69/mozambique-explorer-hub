import { Suspense, lazy, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// The list only shows after a tap, so it stays out of the first load.
const loadPanel = () => import("@/components/NotificationsPanel");
const NotificationsPanel = lazy(() => loadPanel().then((m) => ({ default: m.NotificationsPanel })));

interface Props {
  variant?: "default" | "onDark";
}

export function NotificationsBell({ variant = "default" }: Props) {
  const { unreadCount, isGuest } = useNotifications();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const pt = lang === "pt";
  const prefetch = () => void loadPanel();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative gap-1.5",
            variant === "onDark" && "text-white hover:bg-white/10 hover:text-white",
          )}
          aria-label={pt ? "Notificações" : "Notifications"}
          onPointerEnter={prefetch}
          onFocus={prefetch}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            {pt ? "Notificações" : "Notifications"}
          </SheetTitle>
          <SheetDescription>
            {isGuest
              ? pt
                ? "Cria uma conta para receberes notificações pessoais."
                : "Create an account to receive personal notifications."
              : pt
                ? "Atualizações sobre roteiros, experiências e alertas."
                : "Updates about itineraries, experiences and alerts."}
          </SheetDescription>
        </SheetHeader>

        <Suspense
          fallback={
            <p className="flex items-center justify-center py-10" aria-busy="true">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            </p>
          }
        >
          <NotificationsPanel close={() => setOpen(false)} />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
