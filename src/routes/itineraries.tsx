import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  MapPin,
  Coins,
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
  Smartphone,
  Loader2,
  Compass,
  Search,
  Lock,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useProvinces } from "@/hooks/useProvinces";
import { useDestinations } from "@/hooks/useDestinations";
import { useExperiences } from "@/hooks/useExperiences";
import { useRouteCatalogue } from "@/hooks/useRoutes";
import {
  createRoute,
  deleteRoute,
  importRouteByCode,
  fetchRouteByCode,
  routeCover,
  routePriceMzn,
  routeStopCount,
  updateRoute,
  type ItineraryRoute,
  type RouteDayInput,
  type RouteStopKind,
} from "@/lib/routes";
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

function ItinerariesPage() {
  const { user, authUser } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const userId = authUser?.id ?? null;
  const isGuest = !user || user.role === "guest" || !userId;

  const { all, loading, error, reload } = useRouteCatalogue(userId);
  const { provinces } = useProvinces();

  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [quickCode, setQuickCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<ItineraryRoute | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<ItineraryRoute | null>(null);
  const [importCode, setImportCode] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((route) => {
      if (provinceFilter !== "all" && route.provinceId !== provinceFilter) return false;
      if (!term) return true;
      return (
        route.title.toLowerCase().includes(term) ||
        route.code.toLowerCase().includes(term) ||
        (route.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [all, provinceFilter, search]);

  const isMine = (route: ItineraryRoute) => !!userId && route.ownerId === userId;

  const copyCode = () => {
    if (!selectedRoute) return;
    navigator.clipboard.writeText(selectedRoute.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const openByCode = async (code: string) => {
    if (!code.trim()) return;
    setCodeBusy(true);
    try {
      const found = await fetchRouteByCode(code);
      if (!found) {
        toast.error(lang === "pt" ? "Código inválido" : "Invalid code", {
          description:
            lang === "pt"
              ? "Nenhum roteiro público com este código."
              : "No public itinerary with this code.",
        });
        return;
      }
      setQuickCode("");
      navigate({ to: "/itinerary/$id", params: { id: found.id } });
    } catch {
      toast.error(lang === "pt" ? "Não foi possível pesquisar agora" : "Search failed");
    } finally {
      setCodeBusy(false);
    }
  };

  const handleImport = async () => {
    if (isGuest || !userId) {
      toast.error(lang === "pt" ? "Entra na conta para importar roteiros" : "Sign in to import itineraries");
      return;
    }
    setImportBusy(true);
    try {
      const copy = await importRouteByCode(importCode, userId);
      toast.success(lang === "pt" ? "Roteiro importado!" : "Itinerary imported!", {
        description: `${copy.title} · ${copy.code}`,
      });
      setImportCode("");
      setShowImportModal(false);
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "NOT_FOUND") {
        toast.error(lang === "pt" ? "Roteiro não encontrado" : "Itinerary not found", {
          description:
            lang === "pt"
              ? "O código não existe ou o roteiro não é público."
              : "The code does not exist or the itinerary is not public.",
        });
      } else if (message === "ALREADY_OWN") {
        toast.info(lang === "pt" ? "Este roteiro já é teu" : "This itinerary is already yours");
      } else {
        toast.error(lang === "pt" ? "Não foi possível importar" : "Import failed");
      }
    } finally {
      setImportBusy(false);
    }
  };

  const handleDelete = async (route: ItineraryRoute) => {
    if (!confirm(lang === "pt" ? `Apagar "${route.title}"?` : `Delete "${route.title}"?`)) return;
    try {
      await deleteRoute(route.id);
      toast.success(lang === "pt" ? "Roteiro apagado" : "Itinerary deleted");
      await reload();
    } catch {
      toast.error(lang === "pt" ? "Não foi possível apagar" : "Delete failed");
    }
  };

  const shareUrl =
    typeof window !== "undefined" && selectedRoute
      ? `${window.location.origin}/itinerary/${selectedRoute.id}`
      : "";
  const shareText = selectedRoute
    ? `${selectedRoute.title} — ${lang === "pt" ? "Código" : "Code"}: ${selectedRoute.code} · Ekaya Explore`
    : "";

  const nativeShare = async () => {
    if (!selectedRoute) return;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: selectedRoute.title, text: shareText, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      toast.info(
        lang === "pt" ? "Partilha nativa não disponível neste dispositivo" : "Native share not available on this device",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
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
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">{lang === "pt" ? "Roteiros" : "Itineraries"}</h1>
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
              onClick={() => {
                if (isGuest) {
                  toast.error(lang === "pt" ? "Entra na conta para criar roteiros" : "Sign in to create itineraries");
                  return;
                }
                setShowCreateModal(true);
              }}
              className="gap-2 bg-gradient-to-r from-primary to-orange-600"
            >
              <Plus className="h-4 w-4" />
              {lang === "pt" ? "Criar Roteiro" : "Create Itinerary"}
            </Button>
          </div>
        </div>

        {/* Quick code search */}
        <Card className="p-4 mb-4 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-sm font-semibold">
              {lang === "pt" ? "Tens um código de roteiro?" : "Got an itinerary code?"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder={lang === "pt" ? "Cola aqui o código (ex: EK-INH001)" : "Paste code here (e.g. EK-INH001)"}
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && void openByCode(quickCode)}
              className="font-mono flex-1 min-w-[200px]"
            />
            <Button onClick={() => void openByCode(quickCode)} disabled={!quickCode.trim() || codeBusy}>
              {codeBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {lang === "pt" ? "Abrir Roteiro" : "Open Itinerary"}
            </Button>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={lang === "pt" ? "Pesquisar por nome ou código" : "Search by name or code"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={lang === "pt" ? "Província" : "Province"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "pt" ? "Todas as províncias" : "All provinces"}</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {lang === "pt" ? p.name.pt : p.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
            <Loader2 className="size-5 animate-spin" />
            {lang === "pt" ? "A carregar roteiros..." : "Loading itineraries..."}
          </div>
        )}

        {error && !loading && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {lang === "pt" ? "Não foi possível carregar os roteiros." : "Could not load itineraries."}
            </p>
            <Button variant="outline" onClick={() => void reload()}>
              {lang === "pt" ? "Tentar novamente" : "Try again"}
            </Button>
          </Card>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Card className="p-10 text-center">
            <Compass className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">{lang === "pt" ? "Sem roteiros para mostrar" : "No itineraries to show"}</p>
            <p className="text-sm text-muted-foreground">
              {lang === "pt"
                ? "Ajusta a pesquisa ou cria o teu primeiro roteiro com destinos e experiências reais."
                : "Adjust the search or create your first itinerary from real destinations and experiences."}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((route, idx) => {
            const cover = routeCover(route);
            const stops = routeStopCount(route);
            const price = routePriceMzn(route);
            return (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.4 }}
                whileHover={{ y: -10 }}
                className="transition-shadow hover:shadow-2xl rounded-xl"
              >
                <Card className="overflow-hidden h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {cover ? (
                      <img src={cover} alt={route.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Compass className="size-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                      {route.isCurated && (
                        <Badge className="bg-gradient-to-r from-primary to-orange-600 text-white border-0 gap-1">
                          <ShieldCheck className="size-3" /> {lang === "pt" ? "Oficial" : "Official"}
                        </Badge>
                      )}
                      {isMine(route) && (
                        <Badge className="bg-emerald-500 text-white border-0">{lang === "pt" ? "Meu" : "Mine"}</Badge>
                      )}
                      {!route.isPublic && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="size-3" /> {lang === "pt" ? "Privado" : "Private"}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <div className="bg-black/60 text-white px-2 py-1 rounded-md text-xs font-mono">{route.code}</div>
                      <FavoriteButton
                        itemId={route.id}
                        itemType="itinerary"
                        itemData={{
                          name: route.title,
                          description: route.description ?? "",
                          image: cover,
                          duration: `${route.durationDays} ${lang === "pt" ? "dias" : "days"}`,
                          location: route.province ? (lang === "pt" ? route.province.name.pt : route.province.name.en) : route.code,
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="text-xl font-bold">{route.title}</h3>
                      {route.province && (
                        <p className="text-xs text-white/80">
                          {lang === "pt" ? route.province.name.pt : route.province.name.en}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    {route.description && <p className="text-sm text-muted-foreground mb-4">{route.description}</p>}

                    <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {route.durationDays} {lang === "pt" ? "dias" : "days"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {stops} {lang === "pt" ? "paragens" : "stops"}
                        </span>
                      </div>
                      {price > 0 && (
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <span>{price.toLocaleString("pt-PT")} MZN</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {route.days.flatMap((d) => d.stops).slice(0, 3).map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          {s.kind === "experience" ? (
                            <Store className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : (
                            <MapPin className="h-4 w-4 text-purple-500 shrink-0" />
                          )}
                          <span className="truncate flex-1">{s.title}</span>
                        </div>
                      ))}
                      {stops > 3 && (
                        <p className="text-xs text-muted-foreground">
                          + {stops - 3} {lang === "pt" ? "mais paragens" : "more stops"}
                        </p>
                      )}
                      {stops === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {lang === "pt" ? "Ainda sem paragens." : "No stops yet."}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-auto flex-wrap">
                      <Button asChild className="flex-1 min-w-[140px]">
                        <Link to="/itinerary/$id" params={{ id: route.id }}>
                          {lang === "pt" ? "Ver Roteiro" : "View Itinerary"}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedRoute(route);
                          setShowShareModal(true);
                        }}
                        title={lang === "pt" ? "Partilhar" : "Share"}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {isMine(route) && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditing(route)}
                            title={lang === "pt" ? "Editar" : "Edit"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => void handleDelete(route)}
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
            );
          })}
        </div>
      </div>

      {/* Share */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Partilhar Roteiro" : "Share Itinerary"}</DialogTitle>
            <DialogDescription>
              {lang === "pt" ? "Escolhe uma forma de partilhar este roteiro." : "Choose how to share this itinerary."}
            </DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <>
              {!selectedRoute.isPublic && (
                <p className="text-xs rounded-md bg-muted p-3 text-muted-foreground">
                  {lang === "pt"
                    ? "Este roteiro é privado: o link só funciona para ti. Torna-o público na edição para o partilhares."
                    : "This itinerary is private: the link only works for you. Make it public in the edit form to share it."}
                </p>
              )}
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
                    href={`mailto:?subject=${encodeURIComponent(selectedRoute.title)}&body=${encodeURIComponent(shareText + "\n" + shareUrl)}`}
                  />
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="flex flex-col items-center gap-1 rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition"
                  >
                    <Smartphone className="size-5 text-primary" />
                    <span className="text-[11px] font-medium">{lang === "pt" ? "Sistema" : "System"}</span>
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

      {/* Import */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Importar Roteiro" : "Import Itinerary"}</DialogTitle>
            <DialogDescription>
              {lang === "pt"
                ? "Introduz o código único do roteiro público. Fica uma cópia na tua conta; o original não é alterado."
                : "Enter the public itinerary code. A copy is added to your account; the original is untouched."}
            </DialogDescription>
          </DialogHeader>
          {isGuest ? (
            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
              {lang === "pt" ? "Entra na conta para importar roteiros." : "Sign in to import itineraries."}
            </p>
          ) : (
            <Input
              placeholder="EK-INH001"
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
              <Button onClick={() => void handleImport()} disabled={!importCode.trim() || importBusy}>
                {importBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {lang === "pt" ? "Importar" : "Import"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RouteFormModal
        open={showCreateModal || !!editing}
        editing={editing}
        ownerId={userId}
        onClose={() => {
          setShowCreateModal(false);
          setEditing(null);
        }}
        onSaved={async (route, isEdit) => {
          toast.success(
            isEdit
              ? lang === "pt" ? "Roteiro atualizado!" : "Itinerary updated!"
              : lang === "pt" ? "Roteiro criado!" : "Itinerary created!",
            { description: `${lang === "pt" ? "Código" : "Code"}: ${route.code}` },
          );
          await reload();
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

interface DraftStop {
  kind: RouteStopKind;
  refId: string;
  title: string;
}

interface DraftDay {
  title: string;
  stops: DraftStop[];
}

interface FormProps {
  open: boolean;
  editing: ItineraryRoute | null;
  ownerId: string | null;
  onClose: () => void;
  onSaved: (route: ItineraryRoute, isEdit: boolean) => void | Promise<void>;
}

/** Create / edit form. Stops can only be picked from real destinations and experiences. */
function RouteFormModal({ open, editing, ownerId, onClose, onSaved }: FormProps) {
  const { lang } = useLang();
  const { provinces } = useProvinces();
  const { destinations } = useDestinations();
  const { experiences } = useExperiences();
  const isEdit = !!editing;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [provinceId, setProvinceId] = useState<string>("none");
  const [isPublic, setIsPublic] = useState(false);
  const [days, setDays] = useState<DraftDay[]>([{ title: "", stops: [] }]);
  const [pickerDay, setPickerDay] = useState(0);
  const [pickerValue, setPickerValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setProvinceId(editing.provinceId ?? "none");
      setIsPublic(editing.isPublic);
      setDays(
        editing.days.length > 0
          ? editing.days.map((d) => ({
              title: d.title ?? "",
              stops: d.stops.map((s) => ({ kind: s.kind, refId: s.refId, title: s.title })),
            }))
          : [{ title: "", stops: [] }],
      );
    } else {
      setTitle("");
      setDescription("");
      setProvinceId("none");
      setIsPublic(false);
      setDays([{ title: "", stops: [] }]);
    }
    setPickerDay(0);
    setPickerValue("");
  }, [open, editing]);

  const addStop = () => {
    if (!pickerValue) return;
    const [kind, refId] = pickerValue.split("::") as [RouteStopKind, string];
    const label =
      kind === "destination"
        ? destinations.find((d) => d.id === refId)?.name
        : experiences.find((e) => e.id === refId)?.title[lang === "pt" ? "pt" : "en"];
    if (!label) return;
    setDays((prev) =>
      prev.map((day, index) =>
        index === pickerDay ? { ...day, stops: [...day.stops, { kind, refId, title: label }] } : day,
      ),
    );
    setPickerValue("");
  };

  const removeStop = (dayIndex: number, stopIndex: number) =>
    setDays((prev) =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, stops: day.stops.filter((_, i) => i !== stopIndex) } : day,
      ),
    );

  const moveStop = (dayIndex: number, stopIndex: number, delta: number) =>
    setDays((prev) =>
      prev.map((day, index) => {
        if (index !== dayIndex) return day;
        const target = stopIndex + delta;
        if (target < 0 || target >= day.stops.length) return day;
        const stops = [...day.stops];
        const [moved] = stops.splice(stopIndex, 1);
        stops.splice(target, 0, moved);
        return { ...day, stops };
      }),
    );

  const submit = async () => {
    if (!ownerId) return;
    if (!title.trim()) {
      toast.error(lang === "pt" ? "O título é obrigatório" : "Title is required");
      return;
    }
    const payloadDays: RouteDayInput[] = days.map((day) => ({
      title: day.title.trim() || null,
      stops: day.stops.map((s) => ({ kind: s.kind, refId: s.refId })),
    }));
    if (payloadDays.every((d) => d.stops.length === 0)) {
      toast.error(lang === "pt" ? "Adiciona pelo menos uma paragem real" : "Add at least one real stop");
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || null,
        provinceId: provinceId === "none" ? null : provinceId,
        isPublic,
        days: payloadDays,
      };
      const saved = editing ? await updateRoute(editing.id, input) : await createRoute(input, ownerId);
      await onSaved(saved, isEdit);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      toast.error(
        message === "DUPLICATE_CODE"
          ? lang === "pt" ? "Esse código já existe" : "That code already exists"
          : lang === "pt" ? "Não foi possível guardar" : "Could not save",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isEdit
              ? lang === "pt" ? "Editar Roteiro" : "Edit Itinerary"
              : lang === "pt" ? "Criar Novo Roteiro" : "Create New Itinerary"}
          </DialogTitle>
          <DialogDescription>
            {lang === "pt"
              ? "As paragens são escolhidas entre os destinos e experiências que existem no Ekaya."
              : "Stops are picked from the destinations and experiences that exist in Ekaya."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">1. {lang === "pt" ? "Informações básicas" : "Basic info"}</h4>
          <Input
            placeholder={lang === "pt" ? "Título do roteiro" : "Itinerary title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder={lang === "pt" ? "Descrição" : "Description"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Select value={provinceId} onValueChange={setProvinceId}>
            <SelectTrigger>
              <SelectValue placeholder={lang === "pt" ? "Província principal" : "Main province"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{lang === "pt" ? "Sem província definida" : "No province"}</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {lang === "pt" ? p.name.pt : p.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch id="route-public" checked={isPublic} onCheckedChange={setIsPublic} />
            <Label htmlFor="route-public" className="flex items-center gap-2 text-sm">
              {isPublic ? <Globe2 className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
              {isPublic
                ? lang === "pt" ? "Público — qualquer pessoa com o código pode abrir" : "Public — anyone with the code can open it"
                : lang === "pt" ? "Privado — só tu vês este roteiro" : "Private — only you can see it"}
            </Label>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">2. {lang === "pt" ? "Dias e paragens" : "Days and stops"}</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDays((prev) => [...prev, { title: "", stops: [] }])}
            >
              <Plus className="size-4 mr-1" /> {lang === "pt" ? "Adicionar dia" : "Add day"}
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={String(pickerDay)} onValueChange={(v) => setPickerDay(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {days.map((_, index) => (
                  <SelectItem key={index} value={String(index)}>
                    {lang === "pt" ? "Dia" : "Day"} {index + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pickerValue} onValueChange={setPickerValue}>
              <SelectTrigger className="flex-1 min-w-[200px]">
                <SelectValue placeholder={lang === "pt" ? "Escolher destino ou experiência" : "Pick destination or experience"} />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={`destination::${d.id}`}>
                    📍 {d.name}
                  </SelectItem>
                ))}
                {experiences.map((e) => (
                  <SelectItem key={e.id} value={`experience::${e.id}`}>
                    🏪 {lang === "pt" ? e.title.pt : e.title.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={addStop} disabled={!pickerValue}>
              {lang === "pt" ? "Adicionar" : "Add"}
            </Button>
          </div>

          <div className="space-y-3">
            {days.map((day, dayIndex) => (
              <div key={dayIndex} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    {lang === "pt" ? "Dia" : "Day"} {dayIndex + 1}
                  </span>
                  <Input
                    className="h-8 flex-1"
                    placeholder={lang === "pt" ? "Título do dia (opcional)" : "Day title (optional)"}
                    value={day.title}
                    onChange={(e) =>
                      setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, title: e.target.value } : d)))
                    }
                  />
                  {days.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        setDays((prev) => prev.filter((_, i) => i !== dayIndex));
                        setPickerDay(0);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                {day.stops.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {lang === "pt" ? "Sem paragens neste dia." : "No stops on this day."}
                  </p>
                ) : (
                  day.stops.map((stop, stopIndex) => (
                    <div key={`${stop.refId}-${stopIndex}`} className="flex items-center gap-2 rounded-md border bg-card p-2">
                      <span className="text-xs font-mono text-muted-foreground">#{stopIndex + 1}</span>
                      {stop.kind === "experience" ? (
                        <Store className="size-4 text-blue-500" />
                      ) : (
                        <MapPin className="size-4 text-purple-500" />
                      )}
                      <span className="flex-1 text-sm truncate">{stop.title}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveStop(dayIndex, stopIndex, -1)}>
                        ↑
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveStop(dayIndex, stopIndex, 1)}>
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeStop(dayIndex, stopIndex)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {lang === "pt" ? "Cancelar" : "Cancel"}
          </Button>
          <Button onClick={() => void submit()} disabled={saving} className="bg-gradient-to-r from-primary to-orange-600">
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            {isEdit
              ? lang === "pt" ? "Guardar Alterações" : "Save Changes"
              : lang === "pt" ? "Criar Roteiro" : "Create Itinerary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
