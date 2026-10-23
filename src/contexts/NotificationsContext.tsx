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
  countMyUnread,
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
  /** True once the full history (beyond the recent limit) has been loaded. */
  showingAll: boolean;
  loadAll: () => Promise<void>;
}

const NotificationsContext = createContext<Ctx | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authUser } = useAuth();
  const userId = isAuthenticated ? (authUser?.id ?? null) : null;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingAll, setShowingAll] = useState(false);

  const load = useCallback(async (all = false) => {
    if (!userId) {
      setNotifications([]);
      setUnreadTotal(0);
      setError(null);
      setLoading(false);
      setShowingAll(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, unread] = await Promise.all([
        fetchMyNotifications(userId, all ? 1000 : 50),
        countMyUnread(userId),
      ]);
      setNotifications(list);
      setUnreadTotal(unread);
      setShowingAll(all);
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
      setUnreadTotal((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(id);
        setUnreadTotal(await countMyUnread(userId));
      } catch {
        await load();
      }
    },
    [userId, load],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadTotal(0);
    try {
      await markAllNotificationsRead(userId);
    } catch {
      await load();
    }
  }, [userId, load]);

  const value = useMemo<Ctx>(
    () => ({
      notifications,
      unreadCount: unreadTotal,
      loading,
      error,
      isGuest: !userId,
      markRead,
      markAllRead,
      refresh: () => load(showingAll),
      showingAll,
      loadAll: () => load(true),
    }),
    [notifications, unreadTotal, loading, error, userId, markRead, markAllRead, load, showingAll],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
