import { Link } from "@tanstack/react-router";

import { PhotoCredit } from "@/components/PhotoCredit";
import type { Lang } from "@/contexts/LanguageContext";
import type { Destination } from "@/lib/destinations";

/**
 * Destinations from the database, in a horizontal rail (CSS scroll snap, no script). The count
 * is the real number of public itineraries in the destination's province; zero shows nothing.
 */
export function DestinationsRail({
  lang,
  destinations,
  routes,
  loading,
}: {
  lang: Lang;
  destinations: Destination[];
  routes: { province: { code: string } | null }[];
  loading: boolean;
}) {
  const pt = lang === "pt";
  const count = (code: string) => routes.filter((r) => r.province?.code === code).length;

  return (
    <section className="pt-14" aria-labelledby="home-destinations">
      <div className="px-4 sm:px-10 max-w-6xl mx-auto flex items-end justify-between gap-4">
        <h2 id="home-destinations" className="font-display text-3xl font-bold tracking-tight">
          {pt ? "Destinos" : "Destinations"}
        </h2>
        <Link to="/map" className="text-sm font-semibold text-primary underline underline-offset-4">
          {pt ? "Ver no mapa" : "See on the map"}
        </Link>
      </div>
      <ul className="mt-5 flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 sm:px-10 pb-2 max-w-6xl mx-auto [scrollbar-width:thin]">
        {loading && destinations.length === 0
          ? [0, 1, 2].map((i) => (
              <li
                key={i}
                className="snap-start shrink-0 w-60 aspect-[3/4] rounded-[10px] bg-muted"
                aria-hidden="true"
              />
            ))
          : destinations.map((d) => {
              const n = count(d.province);
              return (
                <li key={d.id} className="snap-start shrink-0 w-60 sm:w-64">
                  <Link
                    to="/map"
                    className="group relative block aspect-[3/4] overflow-hidden rounded-[10px] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <img
                      src={d.card}
                      width={450}
                      height={600}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 size-full object-cover"
                    />
                    {/* Dark veil for legible text (not a colour gradient). */}
                    <span className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/75" />
                    <PhotoCredit src={d.image} />
                    <span className="absolute inset-x-4 bottom-4">
                      <span className="block font-display text-2xl font-bold leading-tight">
                        {d.name}
                      </span>
                      <span className="mt-1 block text-sm text-white/90">
                        {d.region[lang]}
                        {n > 0
                          ? ` · ${n} ${pt ? (n === 1 ? "roteiro" : "roteiros") : n === 1 ? "itinerary" : "itineraries"}`
                          : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
      </ul>
    </section>
  );
}
