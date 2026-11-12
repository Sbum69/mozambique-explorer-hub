import { Link } from "@tanstack/react-router";
import { CheckCircle2, Route as RouteIcon, Stamp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useProvinces } from "@/hooks/useProvinces";
import { GRAND_TOUR_KEY, PROVINCE_REGIONS, passportKey, type GameState } from "@/lib/games";

const REGION_LABEL = {
  south: { pt: "Sul", en: "South" },
  centre: { pt: "Centro", en: "Centre" },
  north: { pt: "Norte", en: "North" },
} as const;

/**
 * Province passports (pp-<code>) and the Grande Viagem (gv): won by finishing an official
 * itinerary with every photo approved (claim_route_games on the server). Only games that exist in
 * game_catalog are shown; each passport links to that province's itineraries.
 */
export function ProvincePassports({ state, lang }: { state: GameState; lang: "pt" | "en" }) {
  const pt = lang === "pt";
  const { provinces } = useProvinces();
  const byKey = new Map(state.catalog.map((c) => [c.key, c]));
  const grand = byKey.get(GRAND_TOUR_KEY);
  const nameOf = (code: string) => provinces.find((p) => p.code === code)?.name[lang] ?? null;
  const dateOf = (key: string) =>
    state.completed[key]
      ? new Date(state.completed[key]).toLocaleDateString(pt ? "pt-PT" : "en-GB")
      : null;

  const regions = (Object.keys(PROVINCE_REGIONS) as (keyof typeof PROVINCE_REGIONS)[])
    .map((region) => ({
      region,
      items: PROVINCE_REGIONS[region].flatMap((code) => {
        const game = byKey.get(passportKey(code));
        const name = nameOf(code);
        return game && name ? [{ code, name, game }] : [];
      }),
    }))
    .filter((r) => r.items.length > 0);
  if (!regions.length && !grand) return null;

  return (
    <section className="mt-8" aria-labelledby="passports-title">
      <h2 id="passports-title" className="font-bold text-lg flex items-center gap-2">
        <Stamp className="size-5 text-primary" aria-hidden />
        {pt ? "Passaportes das províncias" : "Province passports"}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        {pt
          ? "Conclui um roteiro oficial de uma província, com todas as fotografias aprovadas, para ganhar o passaporte dela."
          : "Finish an official itinerary of a province, with every photo approved, to win its passport."}
      </p>

      {grand && (
        <div className="mt-4 rounded-[10px] border border-border bg-card p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[12rem]">
            <p className="font-semibold">{pt ? "Grande Viagem" : "Grand Tour"}</p>
            <p className="text-sm text-muted-foreground">
              {pt
                ? "Um roteiro oficial que passa por 2 ou mais províncias."
                : "An official itinerary across 2 or more provinces."}
            </p>
          </div>
          <PassportStatus done={dateOf(grand.key)} xp={grand.xp} pt={pt} />
          <Link
            to="/itineraries"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            <RouteIcon className="size-4" aria-hidden />
            {pt ? "Ver roteiros" : "See itineraries"}
          </Link>
        </div>
      )}

      {regions.map(({ region, items }) => (
        <div key={region} className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {REGION_LABEL[region][lang]}
          </h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(({ code, name, game }) => (
              <li
                key={code}
                className={`rounded-[10px] border p-4 ${state.completed[game.key] ? "border-primary bg-accent" : "border-border bg-card"}`}
              >
                <p className="font-semibold">{name}</p>
                <div className="mt-2">
                  <PassportStatus done={dateOf(game.key)} xp={game.xp} pt={pt} />
                </div>
                {code === "cabo-delgado" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pt
                      ? "Antes de viajar, consulta os avisos de viagem oficiais."
                      : "Before travelling, check the official travel advice."}
                  </p>
                )}
                <Link
                  to="/itineraries"
                  search={{ province: code }}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  <RouteIcon className="size-4" aria-hidden />
                  {pt ? `Roteiros de ${name}` : `${name} itineraries`}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function PassportStatus({ done, xp, pt }: { done: string | null; xp: number; pt: boolean }) {
  return done ? (
    <Badge className="gap-1">
      <CheckCircle2 className="size-3" aria-hidden />
      {pt ? `Ganho a ${done}` : `Won on ${done}`}
    </Badge>
  ) : (
    <Badge variant="outline">
      {pt ? "Por ganhar" : "Not yet won"} · {xp} XP
    </Badge>
  );
}
