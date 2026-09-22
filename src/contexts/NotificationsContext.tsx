import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";

interface Ctx {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** True when the visitor has no account (guest/anonymous). */
  isGuest: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<Ctx | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authUser } = useAuth();
  const userId = isAuthenticated ? (authUser?.id ?? null) : null;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setNotifications(await fetchMyNotifications(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "load-failed");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await markNotificationRead(id);
      } catch {
        await load();
      }
    },
    [userId, load],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(userId);
    } catch {
      await load();
    }
  }, [userId, load]);

  const value = useMemo<Ctx>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      loading,
      error,
      isGuest: !userId,
      markRead,
      markAllRead,
      refresh: load,
    }),
    [notifications, loading, error, userId, markRead, markAllRead, load],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
