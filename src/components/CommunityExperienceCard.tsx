import { lazy, Suspense, useState } from "react";
import { MapPin, Gift } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import {
  categoryMeta,
  communityLocation,
  type CommunityExperience,
} from "@/lib/community-experiences";

// The detail dialog (Radix Dialog, directions, mini-map) only shows after a tap.
const LazyDialog = lazy(() =>
  import("@/components/CommunityExperienceDialog").then((m) => ({
    default: m.CommunityExperienceDialog,
  })),
);

/** Elegant neutral placeholder when the activity has no image yet. */
export function CommunityImage({
  item,
  className = "",
}: {
  item: CommunityExperience;
  className?: string;
}) {
  const { lang } = useLang();
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.title[lang]}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    );
  }
  const cat = categoryMeta(item.category);
  return (
    <div
      className={`bg-gradient-to-br from-primary/15 via-accent/30 to-secondary/40 flex flex-col items-center justify-center gap-1 ${className}`}
    >
      <span className="text-3xl" aria-hidden>
        {cat.emoji}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {item.provinceName[lang]}
      </span>
    </div>
  );
}

export function CommunityExperienceCard({
  item,
  onOpen,
}: {
  item: CommunityExperience;
  onOpen: () => void;
}) {
  const { lang } = useLang();
  const cat = categoryMeta(item.category);
  return (
    <button type="button" onClick={onOpen} className="text-left h-full">
      <Card className="overflow-hidden h-full hover:shadow-[var(--shadow-elegant)] transition-shadow p-0 gap-0">
        <div className="relative aspect-[16/10]">
          <CommunityImage item={item} className="size-full" />
          <Badge variant="secondary" className="absolute top-3 left-3">
            {cat.emoji} {cat.label[lang]}
          </Badge>
          <Badge className="absolute top-3 right-3 gap-1">
            <Gift className="size-3" />
            {lang === "pt" ? "Grátis" : "Free"}
          </Badge>
        </div>
        <div className="p-4 space-y-1">
          <h3 className="font-semibold leading-tight">{item.title[lang]}</h3>
          <p className="text-xs text-muted-foreground">{item.provinceName[lang]}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            {communityLocation(item, lang)}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
            {item.description[lang]}
          </p>
        </div>
      </Card>
    </button>
  );
}

export interface CommunityExperienceDialogProps {
  item: CommunityExperience | null;
  onClose: () => void;
  /** The page filter ("all" keeps all categories); defaults to the item's own category. */
  mapCategory?: string;
}

/** Loads the dialog on first open and keeps it mounted afterwards, so closing still animates. */
export function CommunityExperienceDialog(props: CommunityExperienceDialogProps) {
  const [wanted, setWanted] = useState(false);
  if (props.item && !wanted) setWanted(true);
  if (!wanted) return null;
  return (
    <Suspense fallback={null}>
      <LazyDialog {...props} />
    </Suspense>
  );
}
