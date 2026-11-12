import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Users, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InterestIcon } from "@/components/InterestIcon";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { useProvinces } from "@/hooks/useProvinces";
import {
  COMMUNITY_CATEGORIES,
  fetchCommunityExperiences,
  type CommunityCategory,
  type CommunityExperience,
} from "@/lib/community-experiences";
import {
  CommunityExperienceCard,
  CommunityExperienceDialog,
} from "@/components/CommunityExperienceCard";
import { CommunitySubmitDialog } from "@/components/CommunitySubmitDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Map as MapIcon } from "lucide-react";
import { usePersonalPrefs } from "@/hooks/usePersonalPrefs";
import { communityInterestMatches } from "@/lib/recommendations";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/community-experiences")({
  head: () => ({
    meta: [
      { title: "Experiências Comunitárias gratuitas — EKAYA" },
      {
        name: "description",
        content:
          "Atividades gratuitas e sem reserva em todas as províncias de Moçambique: praias, cultura, mercados, natureza e comunidades.",
      },
      { property: "og:title", content: "Experiências Comunitárias gratuitas — EKAYA" },
      {
        property: "og:description",
        content: "Atividades de lazer gratuitas, organizadas por província, em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { open?: string } =>
    typeof search.open === "string" && /^[0-9a-f-]{36}$/i.test(search.open)
      ? { open: search.open }
      : {},
  component: CommunityExperiencesPage,
});

const ALL = "all";

function CommunityExperiencesPage() {
  const { lang } = useLang();
  const pt = lang === "pt";
  const { provinces } = useProvinces();
  const [provinceId, setProvinceId] = useState(ALL);
  const [category, setCategory] = useState<CommunityCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<CommunityExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<CommunityExperience | null>(null);
  const [proposing, setProposing] = useState(false);
  const { isAuthenticated, authUser } = useAuth();
  const { requireAccount } = useAuthGate();
  const navigate = useNavigate();
  const prefs = usePersonalPrefs();
  const { open: openId } = Route.useSearch();

  // Deep link (e.g. from the map): open exactly that approved community experience, never a fallback.
  useEffect(() => {
    if (!openId) return;
    let active = true;
    fetchCommunityExperiences()
      .then((rows) => {
        if (!active) return;
        const hit = rows.find((r) => r.id === openId);
        if (hit) setOpen(hit);
        else {
          console.warn("[community-experiences] deep link id not found or not public", openId);
          toast.error(
            pt
              ? "Esta experiência comunitária não está disponível."
              : "This community experience is not available.",
          );
        }
      })
      .catch(
        () =>
          active &&
          toast.error(
            pt ? "Não foi possível abrir a experiência." : "Couldn't open the experience.",
          ),
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);
  // Personalised split only while no explicit province is chosen; never mixes other provinces into the main list.
  const personal = prefs.hasPrefs && provinceId === ALL;
  const fit = (it: CommunityExperience) =>
    communityInterestMatches(it.category, prefs.interests).length;
  const mainItems = personal
    ? items
        .filter((it) => prefs.provinces.includes(it.provinceCode))
        .sort((a, b) => fit(b) - fit(a))
    : items;
  const otherItems = personal
    ? items
        .filter((it) => !prefs.provinces.includes(it.provinceCode))
        .sort((a, b) => fit(b) - fit(a))
    : [];
  const provinceNames = prefs.provinces
    .map((c) => provinces.find((p) => p.code === c)?.name[lang] ?? c)
    .join(", ");
  const propose = () => {
    if (requireAccount(pt ? "propor uma experiência" : "propose an experience")) setProposing(true);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchCommunityExperiences({
      provinceId: provinceId === ALL ? undefined : provinceId,
      category: category === "all" ? undefined : category,
      search: debounced,
    })
      .then((rows) => active && setItems(rows))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [provinceId, category, debounced, tick]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <AppSidebar />
          <BackButton fallback="auto" showLabel />
          <h1 className="font-bold text-lg flex items-center gap-2 flex-1 truncate">
            <Users className="size-5 text-primary" />
            {pt ? "Experiências Comunitárias" : "Community Experiences"}
          </h1>
          <ThemeToggle />
          <LanguageToggle />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <p className="text-muted-foreground">
          {pt
            ? "Atividades de lazer gratuitas, sem reserva, organizadas por província."
            : "Free leisure activities, no booking needed, organised by province."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={propose}>
            <Plus className="size-4" />
            {pt ? "propor uma experiência" : "propose an experience"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/map",
                search: { category: category === "all" ? undefined : category },
              })
            }
          >
            <MapIcon className="size-4" />
            {pt ? "Ver no mapa" : "View on map"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={pt ? "Pesquisar atividades" : "Search activities"}
              className="pl-9"
              aria-label={pt ? "Pesquisar atividades" : "Search activities"}
            />
          </div>
          <Select value={provinceId} onValueChange={setProvinceId}>
            <SelectTrigger aria-label={pt ? "Província" : "Province"}>
              <SelectValue placeholder={pt ? "Província" : "Province"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{pt ? "Todas as províncias" : "All provinces"}</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label={pt ? "Categoria" : "Category"}
        >
          {COMMUNITY_CATEGORIES.map((c) => (
            <Button
              key={c.id}
              size="sm"
              role="tab"
              aria-selected={category === c.id}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => setCategory(c.id)}
            >
              <InterestIcon id={c.id} /> {c.label[lang]}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="h-72 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-muted-foreground">
              {pt ? "Não foi possível carregar as atividades." : "Couldn't load the activities."}
            </p>
            <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
              <RefreshCw className="size-4 mr-1" />
              {pt ? "Tentar novamente" : "Try again"}
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {pt ? "Sem atividades encontradas." : "No activities found."}
          </Card>
        ) : (
          <>
            {personal && (
              <h2 className="text-xl font-bold">
                {pt
                  ? `Experiências comunitárias perto do teu destino — ${provinceNames}`
                  : `Community experiences near your destination — ${provinceNames}`}
              </h2>
            )}
            <p className="text-sm text-muted-foreground">
              {mainItems.length} {pt ? "atividades" : "activities"}
            </p>
            {mainItems.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                {pt
                  ? "Ainda não existem experiências comunitárias para estas preferências na tua província."
                  : "There are no community experiences for these preferences in your province yet."}
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mainItems.map((it) => (
                  <CommunityExperienceCard key={it.id} item={it} onOpen={() => setOpen(it)} />
                ))}
              </div>
            )}
            {otherItems.length > 0 && (
              <section className="space-y-3 border-t pt-6">
                <h2 className="text-xl font-bold">
                  {pt ? "Descobre outras regiões" : "Discover other regions"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {pt
                    ? "Experiências noutras províncias — não fazem parte da tua seleção."
                    : "Experiences in other provinces — not part of your selection."}{" "}
                  ({otherItems.length})
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otherItems.map((it) => (
                    <CommunityExperienceCard key={it.id} item={it} onOpen={() => setOpen(it)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <CommunityExperienceDialog
        item={open}
        onClose={() => {
          setOpen(null);
          if (openId) void navigate({ to: "/community-experiences", search: {}, replace: true });
        }}
        mapCategory={category}
      />
      {isAuthenticated && authUser && (
        <CommunitySubmitDialog
          open={proposing}
          onClose={() => setProposing(false)}
          userId={authUser.id}
        />
      )}
    </div>
  );
}
