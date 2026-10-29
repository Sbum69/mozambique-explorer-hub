import { Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { directionsUrls, hasValidCoords } from "@/lib/visits";

/** Central Google Maps / Apple Maps / Waze links. Never renders links without real coordinates. */
export function DirectionsButtons({ coords }: { coords: [number, number] | null | undefined }) {
  const { lang } = useLang();
  const pt = lang === "pt";
  if (!hasValidCoords(coords)) {
    return (
      <p className="text-sm text-muted-foreground">
        {pt
          ? "Sem coordenadas disponíveis para direções."
          : "No coordinates available for directions."}
      </p>
    );
  }
  const u = directionsUrls(coords);
  return (
    <>
      {(
        [
          ["Google Maps", u.google],
          ["Waze", u.waze],
          ["Apple Maps", u.apple],
        ] as const
      ).map(([label, href]) => (
        <Button key={label} asChild variant="outline" size="sm">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Navigation className="size-4 mr-1" />
            {label}
          </a>
        </Button>
      ))}
    </>
  );
}
