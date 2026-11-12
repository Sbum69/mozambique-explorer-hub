import { Link } from "@tanstack/react-router";
import { Loader2, Stamp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routeGivesPassport, type ItineraryRoute, type RouteProgress } from "@/lib/routes";

/**
 * Route → game: an official itinerary gives its province's passport (or the Grande Viagem when it
 * crosses 2+ provinces) once every stop has an approved photo.
 */
export function RoutePassportCard({
  route,
  progress,
  lang,
  onClaimed,
}: {
  route: ItineraryRoute;
  progress: RouteProgress | null;
  lang: "pt" | "en";
  onClaimed: () => void | Promise<void>;
}) {
  const pt = lang === "pt";
  const [busy, setBusy] = useState(false);
  if (!routeGivesPassport(route)) return null;
  const grand = route.provinces.length >= 2;
  const name = grand
    ? pt
      ? "Grande Viagem"
      : "Grand Tour"
    : route.province
      ? pt
        ? `Passaporte de ${route.province.name.pt}`
        : `${route.province.name.en} passport`
      : null;
  if (!name) return null;

  const claim = async () => {
    if (!progress) return;
    setBusy(true);
    // lib/games only loads when claiming (keeps it out of the itinerary page's first load).
    const { claimPassport } = await import("@/lib/games");
    const r = await claimPassport(progress.id, pt);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    toast.success(
      r.awarded
        ? pt
          ? `${name}: ganho!`
          : `${name}: won!`
        : pt
          ? "Já tinhas este jogo."
          : "You already have this game.",
    );
    await onClaimed();
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold flex items-center gap-2">
        <Stamp className="size-5 text-primary" aria-hidden />
        {name}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        {pt
          ? "Conclui todas as paragens com uma fotografia aprovada para ganhar este jogo."
          : "Complete every stop with an approved photo to win this game."}
      </p>
      {progress?.status === "completed" && (
        <Button className="w-full mt-3 gap-2" disabled={busy} onClick={() => void claim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Stamp className="size-4" />}
          {pt ? "Receber" : "Claim"}
        </Button>
      )}
      <Link
        to="/games"
        className="mt-3 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        {pt ? "Ver passaportes" : "See passports"}
      </Link>
    </Card>
  );
}
