import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Compass,
  Clock,
  MapPin,
  Star,
  Store,
  Users,
  Map as MapIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchExperienceById, type Experience } from "@/lib/experiences";

export const Route = createFileRoute("/experience/$id")({
  head: () => ({
    meta: [
      { title: "Experiência — Ekaya Explore" },
      {
        name: "description",
        content: "Detalhes de uma atividade comercial em Moçambique e reserva.",
      },
      { property: "og:title", content: "Experiência — Ekaya Explore" },
      {
        property: "og:description",
        content: "Detalhes de uma atividade comercial em Moçambique e reserva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: ExperienceDetailPage,
});

function ExperienceDetailPage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const pt = lang === "pt";
  const navigate = useNavigate();
  const router = useRouter();
  const [exp, setExp] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setExp(null);
    fetchExperienceById(id)
      .then((e) => active && setExp(e))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={pt ? "Voltar" : "Back"}
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <span className="font-bold flex-1 truncate">{pt ? "Experiência" : "Experience"}</span>
          <LanguageToggle />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="h-72 rounded-xl bg-muted animate-pulse" aria-busy="true" />
        ) : error ? (
          <Card className="p-6 text-center text-destructive">
            {pt ? "Não foi possível carregar a experiência." : "Could not load the experience."}
          </Card>
        ) : !exp ? (
          <Card className="p-8 text-center space-y-3">
            <Compass className="size-10 mx-auto opacity-50" />
            <p>
              {pt
                ? "Experiência não encontrada ou indisponível."
                : "Experience not found or unavailable."}
            </p>
            <Button variant="outline" asChild>
              <Link to="/experiences">{pt ? "Ver experiências" : "Browse experiences"}</Link>
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)]">
            <div className="relative h-56 sm:h-72 bg-muted">
              {exp.image && (
                <img src={exp.image} alt={exp.title[lang]} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-5 space-y-4">
              <h1 className="text-2xl font-bold">{exp.title[lang]}</h1>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {exp.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {exp.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {exp.durationHours}h
                </span>
                {exp.capacity != null && (
                  <span className="flex items-center gap-1">
                    <Users className="size-4" />
                    {exp.capacity}
                  </span>
                )}
                {exp.reviews > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="size-4" />
                    {exp.rating.toFixed(1)} ({exp.reviews})
                  </span>
                )}
              </div>
              {exp.host && (
                <Link to="/business/$id" params={{ id: exp.businessId }}>
                  <Badge variant="secondary" className="gap-1 cursor-pointer">
                    <Store className="size-3" />
                    {exp.host}
                  </Badge>
                </Link>
              )}
              {exp.description[lang] && (
                <p className="text-muted-foreground whitespace-pre-line">{exp.description[lang]}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-2xl font-bold text-primary">
                  {exp.priceMzn.toLocaleString("pt-PT")} MZN
                </span>
                <span className="text-sm text-muted-foreground">
                  {pt ? "por pessoa" : "per person"}
                </span>
                <div className="flex-1" />
                {exp.destinationId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (exp.destinationId)
                        void navigate({ to: "/map", search: { destination: exp.destinationId } });
                    }}
                  >
                    <MapIcon className="size-4 mr-1" />
                    {pt ? "Ver no mapa" : "View on map"}
                  </Button>
                )}
                <Button onClick={() => navigate({ to: "/experiences", search: { book: exp.id } })}>
                  {pt ? "Reservar" : "Book"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
