import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Clock,
  MapPin,
  DollarSign,
  Eye,
  BookOpen,
  Star,
  Plus,
  Share2,
  Download,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Store,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAMPLE_ITINERARIES,
  getUserItineraries,
  addUserItinerary,
  findItineraryByCode,
  generateCode,
  type Itinerary,
  type ItineraryStop,
  type StopType,
  type Difficulty,
} from "@/data/itineraries";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/itineraries")({
  head: () => ({
    meta: [{ title: "Roteiros — Ekaya Explore" }],
  }),
  component: ItinerariesPage,
});

const difficultyColor: Record<Difficulty, string> = {
  Fácil: "bg-green-100 text-green-700 border-green-200",
  Moderado: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Difícil: "bg-red-100 text-red-700 border-red-200",
};

function ItinerariesPage() {
  const { user } = useAuth();
  const [userItins, setUserItins] = useState<Itinerary[]>(() =>
    getUserItineraries(),
  );
  const provinceId = user?.preferences?.province;
  const recommendedId = provinceId ? DESTINATION_ITINERARY[provinceId] : undefined;
  const samples = [...SAMPLE_ITINERARIES].sort((a, b) =>
    a.id === recommendedId ? -1 : b.id === recommendedId ? 1 : 0,
  );
  const all = [...samples, ...userItins];



  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRouteCode, setSelectedRouteCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const isGuest = !user || user.role === "guest";

  const copyCode = () => {
    navigator.clipboard.writeText(selectedRouteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleImport = () => {
    if (isGuest) {
      toast.error("Faça login para partilhar e importar roteiros");
      return;
    }
    const found = findItineraryByCode(importCode.trim());
    if (!found) {
      toast.error("Roteiro não encontrado", {
        description: `Nenhum roteiro com código "${importCode}".`,
      });
      return;
    }
    addUserItinerary(found);
    setUserItins(getUserItineraries());
    toast.success("Roteiro importado!", { description: found.name });
    setImportCode("");
    setShowImportModal(false);
  };

  const openShare = (code: string) => {
    setSelectedRouteCode(code);
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao painel
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold">Roteiros</h1>
            <p className="text-muted-foreground mt-2">
              Descobre, cria e partilha roteiros únicos por Moçambique.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Importar Roteiro
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-gradient-to-r from-primary to-orange-600"
            >
              <Plus className="h-4 w-4" />
              Criar Roteiro
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {all.map((it, idx) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              whileHover={{ y: -10 }}
              className="transition-shadow hover:shadow-2xl rounded-xl"
            >
              <Card className="overflow-hidden h-full flex flex-col">
                {/* Cover */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-t ${it.gradient} opacity-40`}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={difficultyColor[it.difficulty]}>
                      {it.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-md text-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {it.rating}
                    </div>
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
                      size="sm"
                    />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-xl font-bold">{it.name}</h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4">
                    {it.description}
                  </p>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{it.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{it.stops} paragens</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${it.cost}</span>
                    </div>
                  </div>

                  {/* Specific counters */}
                  <div className="flex gap-3 mb-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-purple-500" />
                      {it.waypoints} waypoints
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-orange-500" />
                      {it.storyStops} histórias
                    </span>
                  </div>

                  {/* Stops preview */}
                  <div className="space-y-1.5 mb-4">
                    {it.route.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        {s.type === "business" ? (
                          <Store className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : s.type === "waypoint" ? (
                          <Eye className="h-4 w-4 text-purple-500 shrink-0" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        <span className="truncate flex-1">
                          {s.name ?? s.title}
                        </span>
                        {s.sponsored && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">
                            ⭐ Patrocinado
                          </Badge>
                        )}
                      </div>
                    ))}
                    {it.route.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        + {it.route.length - 3} mais paragens
                      </p>
                    )}
                  </div>

                  {/* Stories preview */}
                  {it.route.find((s) => s.type === "story") && (
                    <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
                      <div className="flex items-center gap-1 text-orange-700 text-xs font-semibold mb-1">
                        <BookOpen className="h-3 w-3" />
                        HISTÓRIA LOCAL
                      </div>
                      {(() => {
                        const story = it.route.find((s) => s.type === "story");
                        return (
                          <>
                            <p className="text-sm font-semibold text-orange-900">
                              {story?.title}
                            </p>
                            <p className="text-xs text-orange-800/80 line-clamp-2 mt-1">
                              {story?.story}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <Button asChild className="flex-1">
                      <Link to="/itinerary/$id" params={{ id: it.id }}>
                        Ver Roteiro Completo
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openShare(it.code)}
                      title="Partilhar"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partilhar Roteiro</DialogTitle>
            <DialogDescription>
              Partilha este código com amigos para que possam importar o
              roteiro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={selectedRouteCode} readOnly className="font-mono text-lg" />
            <Button onClick={copyCode} variant="outline" size="icon">
              {codeCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {codeCopied && (
            <p className="text-sm text-green-600">Copiado!</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Roteiro</DialogTitle>
            <DialogDescription>
              Digite o código único do roteiro que pretende importar.
            </DialogDescription>
          </DialogHeader>
          {isGuest ? (
            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
              Faça login para partilhar e importar roteiros.
            </p>
          ) : (
            <Input
              placeholder="Digite o código do roteiro (ex: INH001)"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              className="font-mono"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Fechar
            </Button>
            {!isGuest && (
              <Button onClick={handleImport} disabled={!importCode.trim()}>
                Carregar Roteiro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <CreateItineraryModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(it) => {
          setUserItins(getUserItineraries());
          setSelectedRouteCode(it.code);
          toast.success("🎉 Roteiro criado com sucesso!", {
            description: `Código: ${it.code}. Partilha com amigos!`,
          });
        }}
      />
    </div>
  );
}

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: (it: Itinerary) => void;
}

function CreateItineraryModal({ open, onClose, onCreated }: CreateProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Fácil");
  const [stops, setStops] = useState<{ name: string; type: StopType }[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [currentType, setCurrentType] = useState<StopType>("business");

  const reset = () => {
    setName("");
    setDescription("");
    setDuration("");
    setDifficulty("Fácil");
    setStops([]);
    setCurrentName("");
    setCurrentType("business");
  };

  const addStop = () => {
    if (!currentName.trim()) return;
    setStops([...stops, { name: currentName.trim(), type: currentType }]);
    setCurrentName("");
  };

  const removeStop = (i: number) =>
    setStops(stops.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name.trim() || !description.trim()) {
      toast.error("Nome e descrição são obrigatórios");
      return;
    }
    if (stops.length === 0) {
      toast.error("Adiciona pelo menos uma paragem");
      return;
    }
    const code = generateCode();
    const route: ItineraryStop[] = stops.map((s, i) => ({
      id: i + 1,
      type: s.type,
      name: s.name,
      description: "",
      duration: "60 min",
      x: 20 + ((i * 60) % 70),
      y: 20 + ((i * 35) % 60),
    }));
    const newIt: Itinerary = {
      id: code.toLowerCase(),
      code,
      name: name.trim(),
      description: description.trim(),
      image:
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
      duration: duration.trim() || `${stops.length} horas`,
      cost: stops.length * 15,
      stops: stops.length,
      waypoints: stops.filter((s) => s.type === "waypoint").length,
      storyStops: stops.filter((s) => s.type === "story").length,
      difficulty,
      rating: 0,
      totalReviews: 0,
      gradient: "from-emerald-500 to-teal-700",
      route,
    };
    addUserItinerary(newIt);
    onCreated(newIt);
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar Novo Roteiro
          </DialogTitle>
          <DialogDescription>
            Desenha o teu próprio roteiro autêntico em três passos.
          </DialogDescription>
        </DialogHeader>

        {/* Section 1 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">1. Informações básicas</h4>
          <Input
            placeholder="Ex: Aventura Cultural em Maputo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder="Descreve o que torna este roteiro especial..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Ex: 6 horas"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fácil">Fácil</SelectItem>
                <SelectItem value="Moderado">Moderado</SelectItem>
                <SelectItem value="Difícil">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3 pt-2">
          <h4 className="font-semibold text-sm">2. Adicionar paragens</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do local"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStop())}
            />
            <Select
              value={currentType}
              onValueChange={(v) => setCurrentType(v as StopType)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">🏪 Negócio Local</SelectItem>
                <SelectItem value="waypoint">📍 Waypoint</SelectItem>
                <SelectItem value="story">📖 História</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addStop} type="button">
              Adicionar
            </Button>
          </div>
        </div>

        {/* Section 3 */}
        {stops.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-sm">
              3. Paragens ({stops.length})
            </h4>
            <div className="space-y-2">
              {stops.map((s, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50"
                >
                  <span className="text-xs font-mono text-muted-foreground">
                    #{i + 1}
                  </span>
                  {s.type === "business" ? (
                    <Store className="h-4 w-4 text-blue-500" />
                  ) : s.type === "waypoint" ? (
                    <Eye className="h-4 w-4 text-purple-500" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-orange-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.type === "business"
                        ? "Negócio Local"
                        : s.type === "waypoint"
                          ? "Waypoint"
                          : "História"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStop(i)}
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} className="bg-gradient-to-r from-primary to-orange-600">
            Criar Roteiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
