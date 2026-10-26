import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useFavorites, type FavoriteType } from "@/contexts/FavoritesContext";
import { useLang } from "@/contexts/LanguageContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  itemId: string;
  itemType: FavoriteType;
  size?: "sm" | "md" | "lg";
  showToast?: boolean;
  className?: string;
}

const sizeClass = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};
const iconSizeClass = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function FavoriteButton({
  itemId,
  itemType,
  size = "md",
  showToast = true,
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { lang } = useLang();
  const { requireAccount } = useAuthGate();
  const [busy, setBusy] = useState(false);
  const favorited = isFavorite(itemId, itemType);
  const pt = lang === "pt";

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Guests are asked to sign in and come back to this page.
    if (busy || !requireAccount(pt ? "Favoritos" : "Favorites")) return;
    setBusy(true);
    try {
      const added = await toggleFavorite(itemType, itemId);
      if (showToast) {
        toast.success(
          added
            ? pt
              ? "Adicionado aos favoritos!"
              : "Added to favorites!"
            : pt
              ? "Removido dos favoritos"
              : "Removed from favorites",
          { icon: <Bookmark className="size-4" /> },
        );
      }
    } catch {
      // The context already reverted the change and showed the error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handle}
      disabled={busy}
      aria-pressed={favorited}
      aria-label={
        favorited
          ? pt
            ? "Remover dos favoritos"
            : "Remove from favorites"
          : pt
            ? "Adicionar aos favoritos"
            : "Add to favorites"
      }
      className={cn(
        sizeClass[size],
        "bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        favorited && "bg-rose-100 dark:bg-rose-950/40",
        className,
      )}
    >
      <Bookmark
        className={cn(
          iconSizeClass[size],
          "transition-colors",
          favorited ? "text-rose-600 dark:text-rose-400 fill-rose-600" : "text-muted-foreground",
        )}
      />
    </motion.button>
  );
}
