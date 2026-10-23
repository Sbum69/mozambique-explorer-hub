import { useCallback, useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Kind = "news" | "event";

/** Public counts per key (news_like_counts / event_participant_counts RPCs). */
async function fetchCounts(kind: Kind, keys: string[]): Promise<Record<string, number>> {
  const c: Record<string, number> = {};
  if (kind === "news") {
    const { data } = await supabase.rpc("news_like_counts", { _keys: keys });
    for (const r of data ?? []) c[r.news_key] = r.likes;
  } else {
    const { data } = await supabase.rpc("event_participant_counts", { _keys: keys });
    for (const r of data ?? []) c[r.event_key] = r.participants;
  }
  return c;
}

/** Keys the user has already liked / joined (RLS: own rows only). */
async function fetchMine(kind: Kind, userId: string, keys: string[]): Promise<Set<string>> {
  if (kind === "news") {
    const { data } = await supabase
      .from("news_likes")
      .select("news_key")
      .eq("user_id", userId)
      .in("news_key", keys);
    return new Set((data ?? []).map((r) => r.news_key));
  }
  const { data } = await supabase
    .from("event_participations")
    .select("event_key")
    .eq("user_id", userId)
    .in("event_key", keys);
  return new Set((data ?? []).map((r) => r.event_key));
}

/** Adds or removes the user's row for `key`; returns the write error, if any. */
async function writeEngagement(
  kind: Kind,
  userId: string,
  key: string,
  remove: boolean,
): Promise<PostgrestError | null> {
  if (kind === "news") {
    const { error } = remove
      ? await supabase.from("news_likes").delete().eq("user_id", userId).eq("news_key", key)
      : await supabase.from("news_likes").insert({ news_key: key, user_id: userId });
    return error;
  }
  const { error } = remove
    ? await supabase
        .from("event_participations")
        .delete()
        .eq("user_id", userId)
        .eq("event_key", key)
    : await supabase.from("event_participations").insert({ event_key: key, user_id: userId });
  return error;
}

/**
 * Shared engagement hook: counts are public (via RPC), the "mine" set only
 * exists for authenticated users. One row per user per key (DB unique constraint).
 */
export function useEngagement(kind: Kind, keys: string[]) {
  const { isAuthenticated, authUser } = useAuth();
  const userId = isAuthenticated ? (authUser?.id ?? null) : null;
  const keySig = keys.join("|");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (keys.length === 0) return;
    setCounts(await fetchCounts(kind, keys));
    if (userId) setMine(await fetchMine(kind, userId, keys));
    else setMine(new Set());
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
      const error = await writeEngagement(kind, userId, key, active);
      // 23505 = already exists (duplicate blocked) → treat as active
      const dup = error?.code === "23505";
      await load();
      setBusy(null);
      if (error && !dup) return { ok: false, active };
      return { ok: true, active: !active || dup };
    },
    [userId, mine, kind, load],
  );

  return { counts, mine, toggle, busy, isGuest: !userId };
}
