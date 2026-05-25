import { useState } from "react";
import { Bell, Compass, Heart, Shield, Tag, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { notifCategoryLabel, type NotifCategory } from "@/data/news";
import { cn } from "@/lib/utils";

const ICONS: Record<NotifCategory, typeof Bell> = {
  itinerary: Compass,
  experience: Heart,
  safety: Shield,
  promo: Tag,
};

const CATEGORY_TONE: Record<NotifCategory, string> = {
  itinerary: "bg-primary/15 text-primary",
  experience: "bg-success/15 text-success",
  safety: "bg-destructive/15 text-destructive",
  promo: "bg-warning/15 text-warning",
};

interface Props {
  variant?: "default" | "onDark";
}

export function NotificationsBell({ variant = "default" }: Props) {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) {
      // delay so badge fades visibly
      setTimeout(() => markAllRead(), 200);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative gap-1.5",
            variant === "onDark" && "text-white hover:bg-white/10 hover:text-white",
          )}
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            {lang === "pt" ? "Notificações" : "Notifications"}
          </SheetTitle>
          <SheetDescription>
            {lang === "pt"
              ? "Atualizações sobre roteiros, experiências e alertas."
              : "Updates about itineraries, experiences and alerts."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              {lang === "pt" ? "Sem notificações." : "No notifications."}
            </p>
          )}
          {notifications.map((n) => {
            const Icon = ICONS[n.category];
            return (
              <div
                key={n.id}
                className="rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0",
                      CATEGORY_TONE[n.category],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {notifCategoryLabel(n.category, lang)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(n.date)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm leading-tight">{n.title[lang]}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{n.body[lang]}</p>
                    {n.link && (
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-2 text-xs"
                        onClick={() => setOpen(false)}
                      >
                        <Link to={n.link}>
                          {lang === "pt" ? "Ver mais" : "See more"}
                          <ArrowRight className="size-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
            <Link to="/news-alerts">
              {lang === "pt" ? "Ver todas as notícias" : "View all news"}
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
