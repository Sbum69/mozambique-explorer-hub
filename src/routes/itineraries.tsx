import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
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
  Pencil,
  MessageCircle,
  Facebook,
  Twitter,
  Mail,
  Send,
  Bluetooth,
  Smartphone,
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
  updateUserItinerary,
  deleteUserItinerary,
  findItineraryByCode,
  generateCode,
  type Itinerary,
  type ItineraryStop,
  type StopType,
  type Difficulty,
} from "@/data/itineraries";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { DESTINATION_ITINERARY, ITINERARY_DESTINATIONS } from "@/data/destination-itinerary-map";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/itineraries")({
  head: () => ({
    meta: [
      { title: "Roteiros — Ekaya Explore" },
      { name: "description", content: "Explora, cria, partilha e importa roteiros de viagem por Moçambique." },
      { property: "og:title", content: "Roteiros — Ekaya Explore" },
      { property: "og:description", content: "Explora, cria, partilha e importa roteiros de viagem por Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
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
  const { lang } = useLang();
  const navigate = useNavigate();
  const [userItins, setUserItins] = useState<Itinerary[]>(() => getUserItineraries());
  const provinceId = user?.preferences?.province;
  const recommendedId = provinceId ? DESTINATION_ITINERARY[provinceId] : undefined;

  const [showAllDestinations, setShowAllDestinations] = useState(!provinceId);

  const filteredSamples = useMemo(() => {
    let list = SAMPLE_ITINERARIES;
    if (provinceId && !showAllDestinations) {
      list = list.filter((it) => ITINERARY_DESTINATIONS[it.id]?.includes(provinceId));
    }
    return [...list].sort((a, b) =>
      a.id === recommendedId ? -1 : b.id === recommendedId ? 1 : 0,
    );
  }, [provinceId, showAllDestinations, recommendedId]);

  const all = [...filteredSamples, ...userItins];

  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItin, setEditingItin] = useState<Itinerary | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Itinerary | null>(null);
  const [importCode, setImportCode] = useState("");
  const [quickCode, setQuickCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const isGuest = !user || user.role === "guest";
  const isUserItin = (id: string) => userItins.some((x) => x.id === id);

  const copyCode = () => {
    if (!selectedRoute) return;
    navigator.clipboard.writeText(selectedRoute.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const doImport = (code: string) => {
    if (isGuest) {
      toast.error(lang === "pt" ? "Faça login para importar roteiros" : "Sign in to import itineraries");
      return false;
    }
    const found = findItineraryByCode(code.trim());
    if (!found) {
      toast.error(lang === "pt" ? "Roteiro não encontrado" : "Itinerary not found", {
        description: (lang === "pt" ? "Nenhum roteiro com código " : "No itinerary with code ") + `"${code}".`,
      });
      return false;
    }
    addUserItinerary(found);
    setUserItins(getUserItineraries());
    toast.success(lang === "pt" ? "Roteiro importado!" : "Itinerary imported!", { description: found.name });
    return true;
  };

  const handleImport = () => {
    if (doImport(importCode)) {
      setImportCode("");
      setShowImportModal(false);
    }
  };

  const handleQuickPaste = () => {
    if (!quickCode.trim()) return;
    const found = findItineraryByCode(quickCode.trim());
    if (found) {
      // Navigate directly to the itinerary
      navigate({ to: "/itinerary/$id", params: { id: found.id } });
      setQuickCode("");
    } else {
      toast.error(lang === "pt" ? "Código inválido" : "Invalid code");
    }
  };

  const openShare = (it: Itinerary) => {
    setSelectedRoute(it);
    setShowShareModal(true);
  };

  const handleDelete = (it: Itinerary) => {
    if (!confirm(lang === "pt" ? `Apagar "${it.name}"?` : `Delete "${it.name}"?`)) return;
    deleteUserItinerary(it.id);
    setUserItins(getUserItineraries());
    toast.success(lang === "pt" ? "Roteiro apagado" : "Itinerary deleted");
  };

  const shareUrl = typeof window !== "undefined" && selectedRoute
    ? `${window.location.origin}/itinerary/${selectedRoute.id}`
    : "";
  const shareText = selectedRoute
    ? `${selectedRoute.name} — ${lang === "pt" ? "Código" : "Code"}: ${selectedRoute.code} · Ekaya Explore`
    : "";

  const nativeShare = async () => {
    if (!selectedRoute) return;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: selectedRoute.name,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      toast.info(lang === "pt" ? "Partilha nativa não disponível neste dispositivo" : "Native share not available on this device");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors ml-2"
            >
              <ArrowLeft className="size-4" /> {lang === "pt" ? "Voltar ao painel" : "Back to dashboard"}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">
              {lang === "pt" ? "Roteiros" : "Itineraries"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {lang === "pt"
                ? "Descobre, cria, edita e partilha roteiros únicos por Moçambique."
                : "Discover, create, edit and share unique itineraries across Mozambique."}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
              <Download className="h-4 w-4" />
              {lang === "pt" ? "Importar Roteiro" : "Import Itinerary"}
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-gradient-to-r from-primary to-orange-600"
            >
              <Plus className="h-4 w-4" />
              {lang === "pt" ? "Criar Roteiro" : "Create Itinerary"}
            </Button>
          </div>
        </div>

        {/* Quick paste code */}
        <Card className="p-4 mb-6 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-sm font-semibold">
              {lang === "pt" ? "Tens um código de roteiro?" : "Got an itinerary code?"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder={lang === "pt" ? "Cola aqui o código (ex: INH001)" : "Paste code here (e.g. INH001)"}
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleQuickPaste()}
              className="font-mono flex-1 min-w-[200px]"
            />
            <Button onClick={handleQuickPaste} disabled={!quickCode.trim()}>
              {lang === "pt" ? "Abrir Roteiro" : "Open Itinerary"}
            </Button>
          </div>
        </Card>

        {provinceId && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm">
              <Sparkles className="inline size-4 text-primary mr-1" />
              {showAllDestinations
                ? (lang === "pt" ? "A mostrar roteiros de todos os destinos" : "Showing itineraries from all destinations")
                : (lang === "pt" ? <>A mostrar apenas roteiros em <strong>{provinceId}</strong></> : <>Showing only itineraries in <strong>{provinceId}</strong></>)}
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowAllDestinations((s) => !s)}>
              {showAllDestinations
                ? (lang === "pt" ? "Filtrar pelo meu destino" : "Filter by my destination")
                : (lang === "pt" ? "Ver todos os destinos" : "Show all destinations")}
            </Button>
          </div>
        )}

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
                <div className="relative h-48 overflow-hidden">
                  <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${it.gradient} opacity-40`} />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={difficultyColor[it.difficulty]}>{it.difficulty}</Badge>
                    {it.id === recommendedId && (
                      <Badge className="bg-gradient-to-r from-primary to-orange-600 text-white border-0">
                        ⭐ {lang === "pt" ? "Recomendado" : "Recommended"}
                      </Badge>
                    )}
                    {isUserItin(it.id) && (
                      <Badge className="bg-emerald-500 text-white border-0">
                        {lang === "pt" ? "Meu" : "Mine"}
                      </Badge>
                    )}
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
                  <p className="text-sm text-muted-foreground mb-4">{it.description}</p>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{it.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{it.stops} {lang === "pt" ? "paragens" : "stops"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${it.cost}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-purple-500" />
                      {it.waypoints} waypoints
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-orange-500" />
                      {it.storyStops} {lang === "pt" ? "histórias" : "stories"}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {it.route.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        {s.type === "business" ? (
                          <Store className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : s.type === "waypoint" ? (
                          <Eye className="h-4 w-4 text-purple-500 shrink-0" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        <span className="truncate flex-1">{s.name ?? s.title}</span>
                      </div>
                    ))}
                    {it.route.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        + {it.route.length - 3} {lang === "pt" ? "mais paragens" : "more stops"}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto flex-wrap">
                    <Button asChild className="flex-1 min-w-[140px]">
                      <Link to="/itinerary/$id" params={{ id: it.id }}>
                        {lang === "pt" ? "Ver Roteiro" : "View Itinerary"}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openShare(it)}
                      title={lang === "pt" ? "Partilhar" : "Share"}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {isUserItin(it.id) && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingItin(it)}
                          title={lang === "pt" ? "Editar" : "Edit"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(it)}
                          title={lang === "pt" ? "Apagar" : "Delete"}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Share Modal (enhanced) */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Partilhar Roteiro" : "Share Itinerary"}</DialogTitle>
            <DialogDescription>
              {lang === "pt"
                ? "Escolhe uma forma de partilhar este roteiro."
                : "Choose how to share this itinerary."}
            </DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <>
              <div className="rounded-lg border bg-muted/50 p-3 flex items-center gap-3">
                <img src={selectedRoute.image} alt="" className="size-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedRoute.name}</p>
                  <p className="text-xs text-muted-foreground">{lang === "pt" ? "Código" : "Code"}: <span className="font-mono">{selectedRoute.code}</span></p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  {lang === "pt" ? "Copiar código" : "Copy code"}
                </p>
                <div className="flex gap-2">
                  <Input value={selectedRoute.code} readOnly className="font-mono text-lg" />
                  <Button onClick={copyCode} variant="outline" size="icon">
                    {codeCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {codeCopied && <p className="text-sm text-green-600 mt-1">{lang === "pt" ? "Copiado!" : "Copied!"}</p>}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  {lang === "pt" ? "Partilhar em" : "Share on"}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <ShareBtn
                    icon={MessageCircle}
                    label="WhatsApp"
                    color="text-green-600"
                    href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
                  />
                  <ShareBtn
                    icon={Send}
                    label="Telegram"
                    color="text-sky-500"
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                  />
                  <ShareBtn
                    icon={Facebook}
                    label="Facebook"
                    color="text-blue-600"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  />
                  <ShareBtn
                    icon={Twitter}
                    label="X / Twitter"
                    color="text-foreground"
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  />
                  <ShareBtn
                    icon={Mail}
                    label="Email"
                    color="text-orange-500"
                    href={`mailto:?subject=${encodeURIComponent(selectedRoute.name)}&body=${encodeURIComponent(shareText + "\n" + shareUrl)}`}
                  />
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="flex flex-col items-center gap-1 rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition"
                  >
                    <Smartphone className="size-5 text-primary" />
                    <span className="text-[11px] font-medium">{lang === "pt" ? "AirDrop / Sistema" : "AirDrop / System"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="flex flex-col items-center gap-1 rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition"
                  >
                    <Bluetooth className="size-5 text-blue-500" />
                    <span className="text-[11px] font-medium">Bluetooth</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success(lang === "pt" ? "Link copiado!" : "Link copied!");
                    }}
                    className="flex flex-col items-center gap-1 rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition"
                  >
                    <Copy className="size-5 text-muted-foreground" />
                    <span className="text-[11px] font-medium">{lang === "pt" ? "Copiar link" : "Copy link"}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)}>
              {lang === "pt" ? "Fechar" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Importar Roteiro" : "Import Itinerary"}</DialogTitle>
            <DialogDescription>
              {lang === "pt"
                ? "Digite o código único do roteiro que pretende importar."
                : "Enter the unique code of the itinerary you want to import."}
            </DialogDescription>
          </DialogHeader>
          {isGuest ? (
            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
              {lang === "pt"
                ? "Faça login para partilhar e importar roteiros."
                : "Sign in to share and import itineraries."}
            </p>
          ) : (
            <Input
              placeholder={lang === "pt" ? "Ex: INH001" : "E.g. INH001"}
              value={importCode}
              onChange={(e) => setImportCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              {lang === "pt" ? "Fechar" : "Close"}
            </Button>
            {!isGuest && (
              <Button onClick={handleImport} disabled={!importCode.trim()}>
                {lang === "pt" ? "Carregar Roteiro" : "Load Itinerary"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <ItineraryFormModal
        open={showCreateModal || !!editingItin}
        editing={editingItin}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItin(null);
        }}
        onSaved={(it, isEdit) => {
          setUserItins(getUserItineraries());
          setSelectedRoute(it);
          toast.success(
            isEdit
              ? lang === "pt" ? "🎉 Roteiro atualizado!" : "🎉 Itinerary updated!"
              : lang === "pt" ? "🎉 Roteiro criado com sucesso!" : "🎉 Itinerary created!",
            { description: `${lang === "pt" ? "Código" : "Code"}: ${it.code}` },
          );
        }}
      />
    </div>
  );
}

function ShareBtn({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition"
    >
      <Icon className={`size-5 ${color}`} />
      <span className="text-[11px] font-medium">{label}</span>
    </a>
  );
}

interface FormProps {
  open: boolean;
  editing: Itinerary | null;
  onClose: () => void;
  onSaved: (it: Itinerary, isEdit: boolean) => void;
}

function ItineraryFormModal({ open, editing, onClose, onSaved }: FormProps) {
  const { lang } = useLang();
  const isEdit = !!editing;
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [duration, setDuration] = useState(editing?.duration ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(editing?.difficulty ?? "Fácil");
  const [stops, setStops] = useState<{ name: string; type: StopType }[]>(
    editing?.route.map((s) => ({ name: s.name ?? s.title ?? "", type: s.type })) ?? [],
  );
  const [currentName, setCurrentName] = useState("");
  const [currentType, setCurrentType] = useState<StopType>("business");

  // Sync when opening for edit
  useMemo(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
      setDuration(editing.duration);
      setDifficulty(editing.difficulty);
      setStops(editing.route.map((s) => ({ name: s.name ?? s.title ?? "", type: s.type })));
    } else {
      setName("");
      setDescription("");
      setDuration("");
      setDifficulty("Fácil");
      setStops([]);
    }
    setCurrentName("");
    setCurrentType("business");
  }, [editing]);

  const addStop = () => {
    if (!currentName.trim()) return;
    setStops([...stops, { name: currentName.trim(), type: currentType }]);
    setCurrentName("");
  };

  const removeStop = (i: number) => setStops(stops.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name.trim() || !description.trim()) {
      toast.error(lang === "pt" ? "Nome e descrição são obrigatórios" : "Name and description are required");
      return;
    }
    if (stops.length === 0) {
      toast.error(lang === "pt" ? "Adiciona pelo menos uma paragem" : "Add at least one stop");
      return;
    }
    const route: ItineraryStop[] = stops.map((s, i) => ({
      id: i + 1,
      type: s.type,
      name: s.name,
      description: "",
      duration: "60 min",
      x: 20 + ((i * 60) % 70),
      y: 20 + ((i * 35) % 60),
    }));
    const base: Itinerary = editing ?? {
      id: "",
      code: generateCode(),
      name: "",
      description: "",
      image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
      duration: "",
      cost: 0,
      stops: 0,
      waypoints: 0,
      storyStops: 0,
      difficulty: "Fácil",
      rating: 0,
      totalReviews: 0,
      gradient: "from-emerald-500 to-teal-700",
      route: [],
    };
    const code = base.code || generateCode();
    const saved: Itinerary = {
      ...base,
      id: base.id || code.toLowerCase(),
      code,
      name: name.trim(),
      description: description.trim(),
      duration: duration.trim() || `${stops.length} horas`,
      cost: stops.length * 15,
      stops: stops.length,
      waypoints: stops.filter((s) => s.type === "waypoint").length,
      storyStops: stops.filter((s) => s.type === "story").length,
      difficulty,
      route,
    };
    if (isEdit) updateUserItinerary(saved);
    else addUserItinerary(saved);
    onSaved(saved, isEdit);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isEdit
              ? lang === "pt" ? "Editar Roteiro" : "Edit Itinerary"
              : lang === "pt" ? "Criar Novo Roteiro" : "Create New Itinerary"}
          </DialogTitle>
          <DialogDescription>
            {lang === "pt" ? "Desenha o teu próprio roteiro autêntico." : "Design your own authentic itinerary."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">1. {lang === "pt" ? "Informações básicas" : "Basic info"}</h4>
          <Input
            placeholder={lang === "pt" ? "Ex: Aventura Cultural em Maputo" : "E.g. Cultural Adventure in Maputo"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder={lang === "pt" ? "Descreve o que torna este roteiro especial..." : "Describe what makes this itinerary special..."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={lang === "pt" ? "Ex: 6 horas" : "E.g. 6 hours"}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
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

        <div className="space-y-3 pt-2">
          <h4 className="font-semibold text-sm">2. {lang === "pt" ? "Adicionar paragens" : "Add stops"}</h4>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder={lang === "pt" ? "Nome do local" : "Place name"}
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStop())}
              className="flex-1 min-w-[160px]"
            />
            <Select value={currentType} onValueChange={(v) => setCurrentType(v as StopType)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">🏪 {lang === "pt" ? "Negócio Local" : "Local Business"}</SelectItem>
                <SelectItem value="waypoint">📍 Waypoint</SelectItem>
                <SelectItem value="story">📖 {lang === "pt" ? "História" : "Story"}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addStop} type="button">
              {lang === "pt" ? "Adicionar" : "Add"}
            </Button>
          </div>
        </div>

        {stops.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-sm">
              3. {lang === "pt" ? "Paragens" : "Stops"} ({stops.length})
            </h4>
            <div className="space-y-2">
              {stops.map((s, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50"
                >
                  <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                  {s.type === "business" ? (
                    <Store className="h-4 w-4 text-blue-500" />
                  ) : s.type === "waypoint" ? (
                    <Eye className="h-4 w-4 text-purple-500" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-orange-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
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
            {lang === "pt" ? "Cancelar" : "Cancel"}
          </Button>
          <Button onClick={submit} className="bg-gradient-to-r from-primary to-orange-600">
            {isEdit ? (lang === "pt" ? "Guardar Alterações" : "Save Changes") : (lang === "pt" ? "Criar Roteiro" : "Create Itinerary")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
