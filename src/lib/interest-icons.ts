import {
  Compass,
  Landmark,
  Mountain,
  Music,
  PawPrint,
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
  culture: Landmark,
  heritage: Landmark,
  food: UtensilsCrossed,
  nature: Trees,
  wildlife: PawPrint,
  community: Users,
  festival: Music,
  adventure: Mountain,
  relax: Sun,
};

export function interestIcon(id: string): LucideIcon {
  return ICONS[id] ?? Compass;
}
