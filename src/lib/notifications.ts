import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "system"
  | "booking"
  | "itinerary"
  | "experience"
  | "community"
  | "route"
  | "reward"
  | "safety"
  | "promo"
  | "event"
  | "business";

/** Exact unread count for the signed-in user (not limited by the loaded page). */
export async function countMyUnread(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: { pt: string; en: string };
  body: { pt: string; en: string };
  /** Internal app path (always starts with "/") or null. */
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Label of each notification type (badge in the notifications panel). */
export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, { pt: string; en: string }> = {
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

export function notificationTypeLabel(type: string, lang: "pt" | "en"): string {
  return (NOTIFICATION_TYPE_LABEL[type as NotificationType] ?? NOTIFICATION_TYPE_LABEL.system)[
    lang
  ];
}

/** "12 out, 14:30" / "12 Oct, 14:30" in the reader's language. */
export function formatNotificationDate(iso: string, lang: "pt" | "en"): string {
  return new Date(iso).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Only in-app paths become links ("/bookings"); "//host" or external URLs are dropped. */
export function safeInternalLink(link: string | null): string | null {
  return link && link.startsWith("/") && !link.startsWith("//") ? link : null;
}

/** Unread badge after marking one as read: never below zero. */
export function unreadAfterMarkRead(count: number): number {
  return Math.max(0, count - 1);
}

export interface RawNotification {
  id: string;
  type: string;
  title_pt: string;
  title_en: string | null;
  body_pt: string;
  body_en: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function mapNotification(row: RawNotification): AppNotification {
  return {
    id: row.id,
    type: (row.type as NotificationType) ?? "system",
    title: { pt: row.title_pt, en: row.title_en ?? row.title_pt },
    body: { pt: row.body_pt, en: row.body_en ?? row.body_pt },
    link: safeInternalLink(row.link),
    read: !!row.read_at,
    createdAt: row.created_at,
  };
}

/** Notifications for the signed-in user, newest first. */
export async function fetchMyNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title_pt, title_en, body_pt, body_en, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNotification(row as RawNotification));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}
