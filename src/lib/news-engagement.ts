import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Kind = "news" | "event";

const CFG = {
  news: { table: "news_likes", col: "news_key", rpc: "news_like_counts", countCol: "likes" },
  event: {
    table: "event_participations",
    col: "event_key",
    rpc: "event_participant_counts",
    countCol: "participants",
  },
} as const;

/**
 * Shared engagement hook: counts are public (via RPC), the "mine" set only
 * exists for authenticated users. One row per user per key (DB unique constraint).
 */
export function useEngagement(kind: Kind, keys: string[]) {
  const { isAuthenticated, authUser } = useAuth();
  const userId = isAuthenticated ? (authUser?.id ?? null) : null;
  const cfg = CFG[kind];
  const keySig = keys.join("|");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (keys.length === 0) return;
    const { data } = await (supabase.rpc as any)(cfg.rpc, { _keys: keys });
    const c: Record<string, number> = {};
    for (const r of (data ?? []) as any[]) c[r[cfg.col]] = r[cfg.countCol];
    setCounts(c);
    if (userId) {
      const { data: own } = await (supabase.from(cfg.table) as any)
        .select(cfg.col)
        .eq("user_id", userId)
        .in(cfg.col, keys);
      setMine(new Set(((own ?? []) as any[]).map((r) => r[cfg.col])));
    } else setMine(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig, userId, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (key: string): Promise<{ ok: boolean; active: boolean }> => {
      if (!userId) return { ok: false, active: false };
      setBusy(key);
      const active = mine.has(key);
      const q = supabase.from(cfg.table) as any;
      const { error } = active
        ? await q.delete().eq("user_id", userId).eq(cfg.col, key)
        : await q.insert({ [cfg.col]: key, user_id: userId });
      // 23505 = already exists (duplicate blocked) → treat as active
      const dup = error?.code === "23505";
      await load();
      setBusy(null);
      if (error && !dup) return { ok: false, active };
      return { ok: true, active: !active || dup };
    },
    [userId, mine, cfg, load],
  );

  return { counts, mine, toggle, busy, isGuest: !userId };
}
