import {
  BedDouble,
  Compass,
  Hotel,
  Map as MapIcon,
  Palmtree,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** One icon per business category (business_categories.code). */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  bar: Wine,
  experience: Compass,
  hostel: BedDouble,
  hotel: Hotel,
  resort: Palmtree,
  restaurant: UtensilsCrossed,
  shop: ShoppingBag,
  tour_operator: MapIcon,
};

/**
 * Neutral marker for a business without a photo (FOTOS-1): its initial and its category icon —
 * never a photo of somewhere else.
 */
export function BusinessMark({
  name,
  categoryCode,
  categoryLabel,
  size = "md",
  className,
}: {
  name: string;
  categoryCode: string | null;
  categoryLabel?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const Icon = (categoryCode && CATEGORY_ICON[categoryCode]) || Store;
  const big = size === "lg";
  return (
    <div
      className={cn("flex size-full items-center justify-center gap-3 bg-muted", className)}
      role="img"
      aria-label={categoryLabel ? `${name} · ${categoryLabel}` : name}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
          big ? "size-16 text-3xl" : "size-12 text-xl",
        )}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <Icon
        aria-hidden="true"
        className={cn("text-muted-foreground", big ? "size-8" : "size-6")}
        strokeWidth={1.75}
      />
    </div>
  );
}
