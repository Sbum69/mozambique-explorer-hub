import { lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Map as MapIcon, Gift } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from "@/contexts/LanguageContext";
import {
  categoryMeta,
  type CommunityCategory,
  type CommunityExperience,
} from "@/lib/community-experiences";
import { hasValidCoords } from "@/lib/visits";
import { DirectionsButtons } from "@/components/DirectionsButtons";

const CommunityMiniMap = lazy(() =>
  import("@/components/CommunityMiniMap").then((m) => ({ default: m.CommunityMiniMap })),
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
            {item.location}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
            {item.description[lang]}
          </p>
        </div>
      </Card>
    </button>
  );
}

/** mapCategory: the page filter ("all" keeps all categories); defaults to the item's own category. */
export function CommunityExperienceDialog({
  item,
  onClose,
  mapCategory,
}: {
  item: CommunityExperience | null;
  onClose: () => void;
  mapCategory?: string;
}) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const navigate = useNavigate();
  const coords: [number, number] | null =
    item && item.lat !== null && item.lng !== null ? [item.lat, item.lng] : null;
  const valid = hasValidCoords(coords);
  const cat = item ? categoryMeta(item.category) : null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!item && (
          <DialogTitle className="sr-only">
            {pt ? "Experiência comunitária" : "Community experience"}
          </DialogTitle>
        )}
        {item && cat && (
          <>
            <DialogHeader>
              <DialogTitle>{item.title[lang]}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">
                    {cat.emoji} {cat.label[lang]}
                  </Badge>
                  <Badge variant="outline">{item.provinceName[lang]}</Badge>
                  <Badge className="gap-1">
                    <Gift className="size-3" />
                    {pt ? "Gratuito · sem reserva" : "Free · no booking"}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>
            <CommunityImage item={item} className="w-full h-44 rounded-xl" />
            <p className="text-sm whitespace-pre-line">{item.description[lang]}</p>
            <p className="text-sm flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              {item.location}
            </p>
            {valid && coords ? (
              <>
                <div className="h-56 rounded-xl overflow-hidden border">
                  <Suspense fallback={<div className="size-full bg-muted animate-pulse" />}>
                    <CommunityMiniMap lat={coords[0]} lng={coords[1]} />
                  </Suspense>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pt ? "Coordenadas aproximadas" : "Approximate coordinates"}: {coords[0]},{" "}
                  {coords[1]}
                </p>
                <div className="flex flex-wrap gap-2">
                  <DirectionsButtons coords={coords} />
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/map",
                        search: {
                          community: item.id,
                          category:
                            mapCategory === "all"
                              ? undefined
                              : ((mapCategory ?? item.category) as CommunityCategory),
                        },
                      })
                    }
                  >
                    <MapIcon className="size-4 mr-1" />
                    {pt ? "Ver no mapa" : "View on map"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {pt ? "Sem coordenadas disponíveis." : "No coordinates available."}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
