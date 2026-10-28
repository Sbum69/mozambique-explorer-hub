import {
  Bell,
  Compass,
  Heart,
  Shield,
  Tag,
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  Map,
  Gift,
  Sparkles,
  Info,
  Loader2,
  Store,
  CheckCheck,
  Check,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useLang } from "@/contexts/LanguageContext";
import type { NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, typeof Bell> = {
  system: Info,
  booking: CalendarCheck,
  itinerary: Compass,
  experience: Heart,
  community: MessageSquare,
  route: Map,
  reward: Gift,
  safety: Shield,
  promo: Tag,
  event: Sparkles,
  business: Store,
};

const TONE: Record<NotificationType, string> = {
  system: "bg-muted text-muted-foreground",
  booking: "bg-primary/15 text-primary",
  itinerary: "bg-primary/15 text-primary",
  experience: "bg-success/15 text-success",
  community: "bg-primary/15 text-primary",
  route: "bg-success/15 text-success",
  reward: "bg-warning/15 text-warning",
  safety: "bg-destructive/15 text-destructive",
  promo: "bg-warning/15 text-warning",
  event: "bg-primary/15 text-primary",
  business: "bg-primary/15 text-primary",
};

const TYPE_LABEL: Record<NotificationType, { pt: string; en: string }> = {
  system: { pt: "Sistema", en: "System" },
  booking: { pt: "Reserva", en: "Booking" },
  itinerary: { pt: "Roteiro", en: "Itinerary" },
  experience: { pt: "Experiência", en: "Experience" },
  community: { pt: "Comunidade", en: "Community" },
  route: { pt: "Rota", en: "Route" },
  reward: { pt: "Recompensa", en: "Reward" },
  safety: { pt: "Segurança", en: "Safety" },
  promo: { pt: "Promoção", en: "Promo" },
  event: { pt: "Evento", en: "Event" },
  business: { pt: "Negócio", en: "Business" },
};

/** Notification list, loaded on demand: Radix only mounts it while the sheet is open. */
export function NotificationsPanel({ close }: { close: () => void }) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isGuest,
    markRead,
    markAllRead,
    refresh,
    showingAll,
    loadAll,
  } = useNotifications();
  const { lang } = useLang();
  const pt = lang === "pt";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(pt ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      {!isGuest && unreadCount > 0 && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void markAllRead()}>
            <CheckCheck className="size-4" />
            {pt ? "Marcar todas como lidas" : "Mark all as read"}
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isGuest && (
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {pt ? "Esta funcionalidade requer uma conta." : "This feature requires an account."}
            </p>
            <div className="mt-3 grid gap-2">
              <Button asChild size="sm" onClick={() => close()}>
                <Link to="/login">{pt ? "Entrar" : "Sign in"}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary" onClick={() => close()}>
                <Link to="/signup">{pt ? "Criar conta" : "Create account"}</Link>
              </Button>
            </div>
          </div>
        )}

        {!isGuest && loading && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {pt ? "A carregar notificações…" : "Loading notifications…"}
          </p>
        )}

        {!isGuest && !loading && error && (
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {pt ? "Não foi possível carregar." : "Could not load."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
              {pt ? "Carregar novamente" : "Try again"}
            </Button>
          </div>
        )}

        {!isGuest && !loading && !error && notifications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            {pt ? "Sem notificações." : "No notifications."}
          </p>
        )}

        {!isGuest &&
          !loading &&
          !error &&
          notifications.map((n) => {
            const Icon = ICONS[n.type] ?? Info;
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-xl border p-3 transition-shadow hover:shadow-sm",
                  n.read ? "bg-card/60" : "bg-card border-primary/40 shadow-sm",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0",
                      TONE[n.type] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {(TYPE_LABEL[n.type] ?? TYPE_LABEL.system)[lang]}
                      </Badge>
                      {!n.read && <span className="size-2 rounded-full bg-primary" />}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <h4
                      className={cn(
                        "text-sm leading-tight",
                        n.read ? "font-medium text-muted-foreground" : "font-semibold",
                      )}
                    >
                      {n.title[lang]}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{n.body[lang]}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {n.link && (
                        <Button
                          asChild
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => {
                            close();
                            if (!n.read) void markRead(n.id);
                          }}
                        >
                          <Link to={n.link}>
                            {pt ? "Ver mais" : "See more"}
                            <ArrowRight className="size-3 ml-1" />
                          </Link>
                        </Button>
                      )}
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto gap-1 p-0 text-xs"
                          onClick={() => void markRead(n.id)}
                        >
                          <Check className="size-3" />
                          {pt ? "Marcar como lida" : "Mark as read"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {!isGuest && !showingAll && notifications.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={() => void loadAll()}>
            {pt ? "Ver todas as notificações" : "View all notifications"}
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}
    </>
  );
}
