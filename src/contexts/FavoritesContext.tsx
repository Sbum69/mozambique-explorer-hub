import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type FavoriteType = "place" | "experience" | "itinerary" | "post" | "news";

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  // Snapshot of data needed to render in favorites page
  data: Record<string, any>;
  savedDate: string;
  notes?: string;
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  addFavorite: (item: Omit<FavoriteItem, "savedDate"> & { savedDate?: string }) => void;
  removeFavorite: (id: string, type: FavoriteType) => void;
  toggleFavorite: (item: Omit<FavoriteItem, "savedDate">) => boolean;
  isFavorite: (id: string, type: FavoriteType) => boolean;
  getFavoritesByType: (type: FavoriteType) => FavoriteItem[];
  clearAll: () => void;
}

const STORAGE_KEY = "ekaya_favorites";
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load favorites", e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, hydrated]);

  const addFavorite: FavoritesContextValue["addFavorite"] = (item) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === item.id && f.type === item.type)) return prev;
      return [
        ...prev,
        { ...item, savedDate: item.savedDate ?? new Date().toISOString() },
      ];
    });
  };

  const removeFavorite: FavoritesContextValue["removeFavorite"] = (id, type) => {
    setFavorites((prev) => prev.filter((f) => !(f.id === id && f.type === type)));
  };

  const toggleFavorite: FavoritesContextValue["toggleFavorite"] = (item) => {
    const exists = favorites.some((f) => f.id === item.id && f.type === item.type);
    if (exists) {
      removeFavorite(item.id, item.type);
      return false;
    }
    addFavorite(item);
    return true;
  };

  const isFavorite: FavoritesContextValue["isFavorite"] = (id, type) =>
    favorites.some((f) => f.id === id && f.type === type);

  const getFavoritesByType: FavoritesContextValue["getFavoritesByType"] = (type) =>
    favorites.filter((f) => f.type === type);

  const clearAll = () => setFavorites([]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isFavorite,
        getFavoritesByType,
        clearAll,
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
