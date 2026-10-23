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

interface RawNotification {
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

function mapNotification(row: RawNotification): AppNotification {
  return {
    id: row.id,
    type: (row.type as NotificationType) ?? "system",
    title: { pt: row.title_pt, en: row.title_en ?? row.title_pt },
    body: { pt: row.body_pt, en: row.body_en ?? row.body_pt },
    link: row.link,
    read: !!row.read_at,
    createdAt: row.created_at,
  };
}

/** Notifications for the signed-in user, newest first. */
export async function fetchMyNotifications(
  userId: string,
  limit = 50,
): Promise<AppNotification[]> {
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
