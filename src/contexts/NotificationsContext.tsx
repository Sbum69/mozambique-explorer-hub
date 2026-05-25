import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MOCK_NOTIFICATIONS, type NotificationItem } from "@/data/news";

interface Ctx {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationsContext = createContext<Ctx | undefined>(undefined);
const STORAGE_KEY = "ekaya.notifications.readIds";

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setReadIds(JSON.parse(raw));
    } catch {}
  }, []);

  const markAllRead = () => {
    const all = MOCK_NOTIFICATIONS.map((n) => n.id);
    setReadIds(all);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
  };

  const value = useMemo<Ctx>(() => {
    const unread = MOCK_NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length;
    return { notifications: MOCK_NOTIFICATIONS, unreadCount: unread, markAllRead };
  }, [readIds]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
