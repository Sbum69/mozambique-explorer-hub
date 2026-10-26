import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Store, Search, MapPin, Compass, BadgeCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { useBackTarget } from "@/lib/nav";
import { useBusinessCategories, useProvinces } from "@/hooks/useProvinces";
import { fetchPublicBusinesses, type PublicBusiness } from "@/lib/local-businesses";

export const Route = createFileRoute("/businesses")({
  head: () => ({
    meta: [
      { title: "Negócios Locais — Ekaya Explore" },
      {
        name: "description",
        content:
          "Descobre negócios locais registados no Ekaya em todas as províncias de Moçambique.",
      },
      { property: "og:title", content: "Negócios Locais — Ekaya Explore" },
      {
        property: "og:description",
        content: "Descobre negócios locais registados no Ekaya em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: BusinessesPage,
});

const ALL = "all";

function BusinessesPage() {
  const { lang } = useLang();
  const pt = lang === "pt";
  const back = useBackTarget();
  const { provinces } = useProvinces();
  const { categories } = useBusinessCategories();
  const [provinceId, setProvinceId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<PublicBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPublicBusinesses({
      provinceId: provinceId === ALL ? undefined : provinceId,
      categoryCode: category === ALL ? undefined : category,
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
            <Link to={back}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="font-bold text-lg flex items-center gap-2 flex-1">
            <Store className="size-5 text-primary" />
            {pt ? "Negócios Locais" : "Local Businesses"}
          </h1>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <p className="text-muted-foreground">
          {pt
            ? "Descobre os negócios comunitários registados no Ekaya e as experiências que oferecem."
            : "Discover the community businesses registered on Ekaya and the experiences they offer."}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={pt ? "Pesquisar negócios" : "Search businesses"}
              className="pl-9"
              aria-label={pt ? "Pesquisar negócios" : "Search businesses"}
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label={pt ? "Categoria" : "Category"}>
              <SelectValue placeholder={pt ? "Categoria" : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{pt ? "Todas as categorias" : "All categories"}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
            ))}
            <span className="sr-only">{pt ? "A carregar negócios…" : "Loading businesses…"}</span>
          </div>
        ) : error ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-destructive font-medium">
              {pt ? "Não foi possível carregar os negócios." : "Could not load businesses."}
            </p>
            <Button variant="outline" onClick={() => setTick((t) => t + 1)}>
              <RefreshCw className="size-4 mr-1" />
              {pt ? "Tentar novamente" : "Try again"}
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Store className="size-10 mx-auto mb-2 opacity-50" />
            {pt ? "Sem negócios encontrados." : "No businesses found."}
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {items.length}{" "}
              {pt
                ? items.length === 1
                  ? "negócio"
                  : "negócios"
                : items.length === 1
                  ? "business"
                  : "businesses"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((b) => (
                <BusinessCard key={b.id} b={b} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function BusinessCard({ b }: { b: PublicBusiness }) {
  const { lang } = useLang();
  const pt = lang === "pt";
  return (
    <Link to="/business/$id" params={{ id: b.id }} className="block h-full">
      <Card className="overflow-hidden h-full flex flex-col border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-shadow">
        <div className="h-32 bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center">
          {b.image ? (
            <img src={b.image} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Store className="size-10 text-primary/50" />
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <h2 className="font-bold flex-1">{b.name}</h2>
            {b.verified && (
              <BadgeCheck
                className="size-4 text-primary shrink-0"
                aria-label={pt ? "Verificado" : "Verified"}
              />
            )}
          </div>
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
            <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Compass className="size-4" />
              {b.experienceCount} {pt ? "experiências" : "experiences"}
            </span>
            <span className="text-primary font-medium">
              {pt ? "Ver detalhes" : "View details"} →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
