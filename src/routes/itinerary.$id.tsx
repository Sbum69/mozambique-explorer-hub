import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Store,
  Eye,
  BookOpen,
  Star,
  Phone,
  Globe,
  Lightbulb,
  Circle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
  Download,
  Compass,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { findItineraryById, type Difficulty, type Itinerary } from "@/data/itineraries";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ItineraryMap } from "@/components/ItineraryMap";
import { useLang } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/itinerary/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Roteiro ${params.id} — Ekaya Explore` }],
  }),
  loader: ({ params }) => {
    const it = findItineraryById(params.id);
    if (!it) throw notFound();
    return it;
  },
  component: ItineraryDetailPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Roteiro não encontrado</h1>
        <Link
          to="/itineraries"
          className="text-primary hover:underline mt-4 inline-block"
        >
          Voltar aos roteiros
        </Link>
      </div>
    </div>
  ),
});

const difficultyColor: Record<Difficulty, string> = {
  Fácil: "bg-green-100 text-green-700 border-green-200",
  Moderado: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Difícil: "bg-red-100 text-red-700 border-red-200",
};

function ItineraryDetailPage() {
  const it = Route.useLoaderData() as Itinerary;
  const { lang } = useLang();
  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  const [completedStops, setCompletedStops] = useState<number[]>([]);

  const toggleStory = (id: number) =>
    setExpandedStory((prev) => (prev === id ? null : id));
  const toggleStop = (id: number) =>
    setCompletedStops((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const completableStops = it.route.filter((s) => s.type !== "story");
  const progress =
    completableStops.length === 0
      ? 0
      : (completedStops.length / completableStops.length) * 100;

  const counts = useMemo(
    () => ({
      business: it.route.filter((s) => s.type === "business").length,
      waypoint: it.route.filter((s) => s.type === "waypoint").length,
      story: it.route.filter((s) => s.type === "story").length,
    }),
    [it],
  );

  // Build SVG path between stops
  const pathD = it.route
    .map((s, i) => `${i === 0 ? "M" : "L"} ${s.x} ${s.y}`)
    .join(" ");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={it.image}
          alt={it.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <Link
          to="/itineraries"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-md text-sm backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" /> Roteiros
        </Link>
        <div className="absolute top-6 right-6">
          <FavoriteButton
            itemId={it.id}
            itemType="itinerary"
            itemData={{
              name: it.name,
              description: it.description,
              image: it.image,
              duration: it.duration,
              rating: it.rating,
              location: it.code,
            }}
            size="md"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
          <div className="container mx-auto">
            <div className="flex gap-2 mb-3">
              <Badge className={difficultyColor[it.difficulty]}>
                {it.difficulty}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                {it.stops} paragens
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                {it.rating}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{it.name}</h1>
            <p className="text-lg text-white/90 max-w-2xl mb-3">
              {it.description}
            </p>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {it.duration}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> ${it.cost} por pessoa
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Real interactive map with GPS */}
            <Card className="overflow-hidden p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {lang === "pt" ? "Mapa do Roteiro" : "Itinerary Map"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {lang === "pt"
                      ? "GPS real · escolhe o modo de transporte para traçar a rota"
                      : "Real GPS · pick a travel mode to draw the route"}
                  </p>
                </div>
                <Compass className="h-5 w-5 text-muted-foreground" />
              </div>
              <ItineraryMap itinerary={it} lang={lang} />
            </Card>

            {/* Stops list */}
            <div className="space-y-4">
              {it.route.map((s, i) => {
                if (s.type === "story") {
                  const expanded = expandedStory === s.id;
                  return (
                    <Card
                      key={s.id}
                      className="overflow-hidden border-orange-200"
                    >
                      <button
                        onClick={() => toggleStory(s.id)}
                        className="w-full p-4 flex items-center gap-4 text-left hover:bg-orange-50/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-orange-600">
                            HISTÓRIA LOCAL
                          </p>
                          <h3 className="font-bold">{s.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {s.location}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-0">
                              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
                                <p className="text-sm text-orange-900 leading-relaxed">
                                  {s.story}
                                </p>
                                {s.culturalContext && (
                                  <div className="mt-3 inline-flex items-center gap-2 bg-orange-100 text-orange-800 text-xs px-3 py-1.5 rounded-full">
                                    <Sparkles className="h-3 w-3" />
                                    {s.culturalContext}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                }

                const done = completedStops.includes(s.id);
                const isBusiness = s.type === "business";
                return (
                  <Card
                    key={s.id}
                    className={`p-5 transition-colors ${
                      done ? "bg-green-50 border-green-200" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full ${
                          isBusiness ? "bg-blue-500" : "bg-purple-500"
                        } text-white flex items-center justify-center shrink-0 font-bold`}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {isBusiness ? "NEGÓCIO LOCAL" : "WAYPOINT"}
                          </span>
                          {s.sponsored && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">
                              ⭐ Patrocinado
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-lg">{s.name}</h3>
                        {s.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {s.description}
                          </p>
                        )}
                        {s.rating && (
                          <div className="flex items-center gap-1 mt-2 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {s.rating}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          {s.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {s.duration}
                            </div>
                          )}
                          {s.entryFee && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              {s.entryFee}
                            </div>
                          )}
                        </div>

                        {s.tips && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md flex gap-2">
                            <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-900">{s.tips}</p>
                          </div>
                        )}

                        {(s.phone || s.website) && (
                          <div className="flex gap-2 mt-3">
                            {s.phone && (
                              <Button asChild variant="outline" size="sm">
                                <a href={`tel:${s.phone}`}>
                                  <Phone className="h-3 w-3" /> Ligar
                                </a>
                              </Button>
                            )}
                            {s.website && (
                              <Button asChild variant="outline" size="sm">
                                <a
                                  href={s.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Globe className="h-3 w-3" /> Website
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleStop(s.id)}
                        className="shrink-0"
                        title={done ? "Concluído" : "Marcar como concluído"}
                      >
                        {done ? (
                          <CheckCircle2 className="h-7 w-7 text-green-600" />
                        ) : (
                          <Circle className="h-7 w-7 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <Card className="p-5">
                <h3 className="font-bold mb-3">Progresso</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {completedStops.length}/{completableStops.length} paragens
                  completadas
                </p>
                <Progress value={progress} className="h-2 mb-4" />

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-blue-500" /> Negócios
                    </span>
                    <span className="font-semibold">{counts.business}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" /> Waypoints
                    </span>
                    <span className="font-semibold">{counts.waypoint}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-orange-500" /> Histórias
                    </span>
                    <span className="font-semibold">{counts.story}</span>
                  </div>
                </div>

                <Button className="w-full mb-2 bg-gradient-to-r from-primary to-orange-600 gap-2">
                  <Play className="h-4 w-4" /> Iniciar Roteiro
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" /> Descarregar Offline
                </Button>

                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
                  <p>📴 Modo Offline disponível</p>
                  <p>✅ Marca paragens à medida que completas</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
