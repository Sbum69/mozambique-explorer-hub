import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { businessMeta, detailHead } from "@/lib/page-meta";
import { useEffect, useState } from "react";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Map as MapIcon,
  Compass,
  Clock,
  BadgeCheck,
} from "lucide-react";

import { DirectionsButtons } from "@/components/DirectionsButtons";
import { BusinessMark } from "@/components/BusinessMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchPublicBusiness, type PublicBusiness } from "@/lib/local-businesses";
import { supabase } from "@/integrations/supabase/client";
import { mapExperience, type Experience } from "@/lib/experiences";
import { BusinessFreeActivities } from "@/components/BusinessFreeActivities";
import { formatPrice } from "@/lib/price";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/business/$id")({
  // Name and description read on the server (the page itself still renders in the browser).
  ssr: "data-only",
  loader: ({ params }) => businessMeta(params.id),
  head: ({ loaderData }) =>
    detailHead(loaderData, {
      title: "Negócio local — EKAYA",
      description: "Detalhes de um negócio local no EKAYA e as experiências que oferece.",
    }),
  component: BusinessDetailPage,
});

const EXP_SELECT =
  "id, slug, business_id, destination_id, title_pt, title_en, description_pt, description_en, province, location, category, price_mzn, duration_hours, capacity, rating, reviews, images, businesses(name), destinations(slug, name, lat, lng)";

function BusinessDetailPage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const pt = lang === "pt";
  const navigate = useNavigate();
  const [b, setB] = useState<PublicBusiness | null>(null);
  const [exps, setExps] = useState<Experience[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchPublicBusiness(id),
      supabase
        .from("experiences")
        .select(EXP_SELECT)
        .eq("business_id", id)
        .eq("active", true)
        .order("created_at"),
    ])
      .then(([biz, res]) => {
        if (!active) return;
        if (res.error) throw new Error(res.error.message);
        setB(biz);
        const rows = res.data ?? [];
        setExps(rows.map((r) => mapExperience(r as never)));
        const d = rows
          .map(
            (r) =>
              (r as unknown as { destinations: { lat: number | null; lng: number | null } | null })
                .destinations,
          )
          .find((x) => x?.lat != null && x?.lng != null);
        setCoords(
          biz?.lat != null && biz?.lng != null
            ? { lat: biz.lat, lng: biz.lng }
            : d
              ? { lat: Number(d.lat), lng: Number(d.lng) }
              : null,
        );
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const mapSlug = exps.find((e) => e.destinationId)?.destinationId ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <BackButton fallback="/businesses" />
          <span className="font-bold flex-1 truncate">
            {pt ? "Negócios Locais" : "Local Businesses"}
          </span>
          <ThemeToggle />
          <LanguageToggle />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <span className="sr-only">{pt ? "A carregar…" : "Loading…"}</span>
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-destructive">
            {pt ? "Não foi possível carregar este negócio." : "Could not load this business."}
          </Card>
        ) : !b ? (
          <Card className="p-8 text-center space-y-3">
            <Store className="size-10 mx-auto opacity-50" />
            <p>
              {pt
                ? "Negócio não encontrado ou indisponível."
                : "Business not found or unavailable."}
            </p>
            <Button variant="outline" asChild>
              <Link to="/businesses">{pt ? "Ver todos os negócios" : "See all businesses"}</Link>
            </Button>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)]">
              <div className="h-40 sm:h-56">
                {b.image ? (
                  <img src={b.image} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <BusinessMark
                    name={b.name}
                    categoryCode={b.categoryCode}
                    categoryLabel={b.category?.[lang]}
                    size="lg"
                  />
                )}
              </div>
              <div className="p-5 space-y-3">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {b.name}
                  {b.verified && (
                    <BadgeCheck
                      className="size-5 text-primary"
                      aria-label={pt ? "Verificado" : "Verified"}
                    />
                  )}
                </h1>
                <div className="flex flex-wrap gap-1.5">
                  {b.category && <Badge variant="secondary">{b.category[lang]}</Badge>}
                  {b.province && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="size-3" />
                      {b.province[lang]}
                    </Badge>
                  )}
                </div>
                {b.description && (
                  <p className="text-muted-foreground whitespace-pre-line">{b.description}</p>
                )}
                <div className="grid gap-2 text-sm">
                  {(b.address || b.district) && (
                    <p className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      {[b.address, b.district].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {b.phone && (
                    <a
                      href={`tel:${b.phone}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Phone className="size-4 text-primary" />
                      {b.phone}
                    </a>
                  )}
                  {b.email && (
                    <a
                      href={`mailto:${b.email}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Mail className="size-4 text-primary" />
                      {b.email}
                    </a>
                  )}
                  {b.website && (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Globe className="size-4 text-primary" />
                      {b.website}
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {mapSlug && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: "/map", search: { destination: mapSlug } })}
                    >
                      <MapIcon className="size-4 mr-1" />
                      {pt ? "Ver no mapa" : "View on map"}
                    </Button>
                  )}
                  <DirectionsButtons
                    coords={
                      coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
                        ? [coords.lat, coords.lng]
                        : null
                    }
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      document
                        .getElementById("business-experiences")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    <Compass className="size-4 mr-1" />
                    {pt ? "Ver experiências" : "View experiences"}
                  </Button>
                </div>
              </div>
            </Card>

            <section id="business-experiences" className="space-y-3">
              <h2 className="text-xl font-bold">{pt ? "Experiências" : "Experiences"}</h2>
              {exps.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  {pt ? "Nenhuma experiência disponível." : "No experiences available."}
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {exps.map((e) => (
                    <Link key={e.id} to="/experience/$id" params={{ id: e.id }}>
                      <Card className="p-4 h-full flex gap-3 hover:shadow-[var(--shadow-elegant)] transition-shadow">
                        {e.image ? (
                          <img
                            src={e.image}
                            alt={e.title[lang]}
                            className="size-20 rounded-lg object-cover shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Compass className="size-6 opacity-50" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold">{e.title[lang]}</p>
                          {e.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3" />
                              {e.location}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {e.durationHours}h
                          </p>
                          <p className="text-sm font-bold text-primary">
                            {formatPrice(e.priceMzn, lang)}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <BusinessFreeActivities
              provinceId={b.provinceId}
              provinceName={b.province?.[lang] ?? null}
            />
          </>
        )}
      </main>
    </div>
  );
}
