import {
  Camera,
  Crown,
  Handshake,
  Map,
  PenLine,
  ScrollText,
  Sunrise,
  Waves,
  Award,
  type LucideIcon,
} from "lucide-react";

/** One Lucide icon per game badge (BADGES in lib/games.ts), instead of emojis (DESIGN-1). */
const BADGE_ICONS: Record<string, LucideIcon> = {
  s1: Waves,
  s2: Handshake,
  s3: ScrollText,
  s4: Crown,
  s5: Camera,
  s6: Map,
  s7: PenLine,
  s8: Sunrise,
};

export function badgeIcon(id: string): LucideIcon {
  return BADGE_ICONS[id] ?? Award;
}
