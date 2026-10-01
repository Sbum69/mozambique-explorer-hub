import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, Users, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { useBackTarget } from "@/lib/nav";
import { useProvinces } from "@/hooks/useProvinces";
import {
  COMMUNITY_CATEGORIES,
  fetchCommunityExperiences,
  type CommunityCategory,
  type CommunityExperience,
} from "@/lib/community-experiences";
import { CommunityExperienceCard, CommunityExperienceDialog } from "@/components/CommunityExperienceCard";

export const Route = createFileRoute("/community-experiences")({
  head: () => ({
    meta: [
      { title: "Experiências Comunitárias gratuitas — Ekaya Explore" },
      { name: "description", content: "Atividades gratuitas e sem reserva em todas as províncias de Moçambique: praias, cultura, mercados, natureza e comunidades." },
      { property: "og:title", content: "Experiências Comunitárias gratuitas — Ekaya Explore" },
      { property: "og:description", content: "Atividades de lazer gratuitas, organizadas por província, em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: CommunityExperiencesPage,
});

const ALL = "all";

function CommunityExperiencesPage() {
  const { lang } = useLang();
  const pt = lang === "pt";
  const back = useBackTarget();
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
          <Button variant="ghost" size="icon" asChild aria-label={pt ? "Voltar" : "Back"}>
            <Link to={back}><ArrowLeft className="size-5" /></Link>
          </Button>
          <h1 className="font-bold text-lg flex items-center gap-2 flex-1 truncate">
            <Users className="size-5 text-primary" />
            {pt ? "Experiências Comunitárias" : "Community Experiences"}
          </h1>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <p className="text-muted-foreground">
          {pt
            ? "Atividades de lazer gratuitas, sem reserva, organizadas por província."
            : "Free leisure activities, no booking needed, organised by province."}
        </p>

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
                <SelectItem key={p.id} value={p.id}>{p.name[lang]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label={pt ? "Categoria" : "Category"}>
          {COMMUNITY_CATEGORIES.map((c) => (
            <Button
              key={c.id}
              size="sm"
              role="tab"
              aria-selected={category === c.id}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => setCategory(c.id)}
            >
              <span aria-hidden>{c.emoji}</span> {c.label[lang]}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <Card key={i} className="h-72 animate-pulse bg-muted/40" />)}
          </div>
        ) : error ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-muted-foreground">{pt ? "Não foi possível carregar as atividades." : "Couldn't load the activities."}</p>
            <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
              <RefreshCw className="size-4 mr-1" />{pt ? "Tentar novamente" : "Try again"}
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {pt ? "Sem atividades encontradas." : "No activities found."}
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{items.length} {pt ? "atividades" : "activities"}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <CommunityExperienceCard key={it.id} item={it} onOpen={() => setOpen(it)} />
              ))}
            </div>
          </>
        )}
      </main>

      <CommunityExperienceDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
