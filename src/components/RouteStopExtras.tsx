import { ArrowRight, ExternalLink } from "lucide-react";

import type { RouteStop } from "@/lib/routes";
import { stopTitle } from "@/lib/routes";

/** Where a curated place (and its coordinates) comes from, e.g. its OpenStreetMap object. */
export function StopSourceLink({ stop, lang }: { stop: RouteStop; lang: "pt" | "en" }) {
  if (!stop.source) return null;
  return (
    <a
      href={stop.source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground mt-2"
    >
      <ExternalLink className="size-3" aria-hidden />
      {lang === "pt" ? "Fonte" : "Source"}: {stop.source.label ?? stop.source.url}
    </a>
  );
}

/**
 * A travel leg between two places: no photo, no points. The time is shown only when it has a
 * source; otherwise it says "a confirmar" (never an estimate).
 */
export function TravelLegCard({ stop, lang }: { stop: RouteStop; lang: "pt" | "en" }) {
  const time =
    stop.travelMinutes && stop.source
      ? stop.travelMinutes >= 60
        ? `${Math.floor(stop.travelMinutes / 60)} h ${stop.travelMinutes % 60 ? `${stop.travelMinutes % 60} min` : ""}`.trim()
        : `${stop.travelMinutes} min`
      : null;
  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-dashed border-border px-4 py-3 text-sm">
      <ArrowRight className="size-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {lang === "pt" ? "Deslocação" : "Travel"}
        </p>
        <p className="font-medium">{stopTitle(stop, lang)}</p>
        <p className="text-muted-foreground">
          {time ?? (lang === "pt" ? "Tempo de viagem a confirmar" : "Travel time to be confirmed")}
        </p>
        {time && <StopSourceLink stop={stop} lang={lang} />}
      </div>
    </div>
  );
}
