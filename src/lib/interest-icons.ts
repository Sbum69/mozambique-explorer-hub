import {
  Compass,
  Fish,
  Footprints,
  Landmark,
  Mountain,
  Music,
  Palette,
  PawPrint,
  ScrollText,
  ShoppingBasket,
  Sun,
  Trees,
  UtensilsCrossed,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

/** One Lucide icon per interest/category id, used instead of emojis in the interface (DESIGN-1). */
const ICONS: Record<string, LucideIcon> = {
  beach: Waves,
  diving: Waves,
  culture: Landmark,
  heritage: Landmark,
  history: ScrollText,
  art: Palette,
  food: UtensilsCrossed,
  nature: Trees,
  wildlife: PawPrint,
  community: Users,
  family: Users,
  local_life: ShoppingBasket,
  festival: Music,
  music: Music,
  adventure: Mountain,
  hiking: Footprints,
  fishing: Fish,
  relax: Sun,
};

export function interestIcon(id: string): LucideIcon {
  return ICONS[id] ?? Compass;
}
