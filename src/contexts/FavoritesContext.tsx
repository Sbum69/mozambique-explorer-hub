import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import {
  addFavoriteRow,
  favoriteKey,
  fetchMyFavorites,
  importLegacyFavorites,
  removeFavoriteRow,
  resolveFavoriteData,
  type FavoriteData,
  type FavoriteRow,
  type FavoriteType,
} from "@/lib/favorites";

export type { FavoriteType } from "@/lib/favorites";

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  /** Current details read from the database (not a stored snapshot). */
  data: FavoriteData;
  savedDate: string;
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  loading: boolean;
  error: boolean;
  /** Optimistic: the UI changes at once and is reverted if the server refuses. Resolves to the new state. */
  toggleFavorite: (type: FavoriteType, id: string) => Promise<boolean>;
  removeFavorite: (type: FavoriteType, id: string) => Promise<void>;
  isFavorite: (id: string, type: FavoriteType) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { authUser } = useAuth();
  const { lang } = useLang();
  const qc = useQueryClient();
  const uid = authUser?.id ?? null;
  const rowsKey = useMemo(() => ["favorites", uid] as const, [uid]);

  const rowsQuery = useQuery({ queryKey: rowsKey, queryFn: fetchMyFavorites, enabled: !!uid });
  const rows = useMemo(() => (uid ? (rowsQuery.data ?? []) : []), [uid, rowsQuery.data]);

  const refsKey = rows
    .map((r) => favoriteKey(r.type, r.id))
    .sort()
    .join("|");
  const dataQuery = useQuery({
    queryKey: ["favorites-data", uid, refsKey],
    queryFn: () => resolveFavoriteData(rows),
    enabled: !!uid && rows.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // One-time import of the old browser-only favourites, on the first signed-in load.
  const imported = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || imported.current === uid || typeof window === "undefined") return;
    imported.current = uid;
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    void importLegacyFavorites(storage).then((r) => {
      if (r.imported > 0) void qc.invalidateQueries({ queryKey: ["favorites", uid] });
    });
  }, [uid, qc]);

  const keys = useMemo(() => new Set(rows.map((r) => favoriteKey(r.type, r.id))), [rows]);

  const setRows = (update: (prev: FavoriteRow[]) => FavoriteRow[]) =>
    qc.setQueryData<FavoriteRow[]>(rowsKey, (prev) => update(prev ?? []));

  const failText = (removing: boolean, notFound: boolean) =>
    notFound
      ? lang === "pt"
        ? "Este item já não está disponível."
        : "This item is no longer available."
      : removing
        ? lang === "pt"
          ? "Não foi possível remover dos favoritos."
          : "Couldn't remove from favourites."
        : lang === "pt"
          ? "Não foi possível guardar nos favoritos."
          : "Couldn't save to favourites.";

  const removeFavorite: FavoritesContextValue["removeFavorite"] = async (type, id) => {
    const before = qc.getQueryData<FavoriteRow[]>(rowsKey);
    setRows((prev) => prev.filter((r) => !(r.type === type && r.id === id)));
    try {
      await removeFavoriteRow({ type, id });
    } catch (e) {
      qc.setQueryData(rowsKey, before);
      toast.error(failText(true, false));
      throw e;
    }
  };

  const toggleFavorite: FavoritesContextValue["toggleFavorite"] = async (type, id) => {
    if (!uid) return false;
    if (keys.has(favoriteKey(type, id))) {
      await removeFavorite(type, id);
      return false;
    }
    const before = qc.getQueryData<FavoriteRow[]>(rowsKey);
    setRows((prev) => [{ type, id, savedDate: new Date().toISOString() }, ...prev]);
    try {
      await addFavoriteRow({ type, id });
      return true;
    } catch (e) {
      qc.setQueryData(rowsKey, before);
      toast.error(failText(false, e instanceof Error && e.message.includes("ITEM_NOT_FOUND")));
      throw e;
    }
  };

  const details = dataQuery.data ?? {};
  const favorites: FavoriteItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    savedDate: r.savedDate,
    data: details[favoriteKey(r.type, r.id)] ?? {},
  }));

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        loading: !!uid && (rowsQuery.isPending || (rows.length > 0 && dataQuery.isPending)),
        error: rowsQuery.isError,
        toggleFavorite,
        removeFavorite,
        isFavorite: (id, type) => keys.has(favoriteKey(type, id)),
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
