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
  itemData: Record<string, any>;
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
  itemData,
  size = "md",
  showToast = true,
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { lang } = useLang();
  const { requireAccount } = useAuthGate();
  const favorited = isFavorite(itemId, itemType);

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!requireAccount(lang === "pt" ? "Favoritos" : "Favorites")) return;
    const added = toggleFavorite({ id: itemId, type: itemType, data: itemData });
    if (!showToast) return;
    toast.success(
      added
        ? lang === "pt"
          ? "Adicionado aos favoritos!"
          : "Added to favorites!"
        : lang === "pt"
          ? "Removido dos favoritos"
          : "Removed from favorites",
      { icon: <Bookmark className="size-4" /> },
    );
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handle}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        sizeClass[size],
        "bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all",
        favorited && "bg-rose-100 dark:bg-rose-950/40",
        className,
      )}
    >
      <Bookmark
        className={cn(
          iconSizeClass[size],
          "transition-colors",
          favorited ? "text-rose-600 fill-rose-600" : "text-muted-foreground",
        )}
      />
    </motion.button>
  );
}
