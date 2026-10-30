import { lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Map as MapIcon, Gift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { InterestIcon } from "@/components/InterestIcon";
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
  communityLocation,
  type CommunityCategory,
} from "@/lib/community-experiences";
import { hasValidCoords } from "@/lib/visits";
import { DirectionsButtons } from "@/components/DirectionsButtons";
import {
  CommunityImage,
  type CommunityExperienceDialogProps,
} from "@/components/CommunityExperienceCard";

const CommunityMiniMap = lazy(() =>
  import("@/components/CommunityMiniMap").then((m) => ({ default: m.CommunityMiniMap })),
);

/** mapCategory: the page filter ("all" keeps all categories); defaults to the item's own category. */
export function CommunityExperienceDialog({
  item,
  onClose,
  mapCategory,
}: CommunityExperienceDialogProps) {
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
                    <InterestIcon id={item.category} /> {cat.label[lang]}
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
              {communityLocation(item, lang)}
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
