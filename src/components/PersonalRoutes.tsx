import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Compass, Loader2, MapPinned, SlidersHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePersonalPrefs } from "@/hooks/usePersonalPrefs";
import { useProvinces } from "@/hooks/useProvinces";
import { personalizeRoutes, routeInterestMeta, type ItineraryRoute } from "@/lib/routes";
import { INTERESTS } from "@/data/destinations";
import { useLang } from "@/contexts/LanguageContext";

interface Props {
  routes: ItineraryRoute[];
  loading: boolean;
  error: string | null;
  lang: "pt" | "en";
  renderCard: (route: ItineraryRoute, idx: number) => ReactNode;
  onShowAll: () => void;
  user?: unknown;
}

function Grid({ routes, renderCard }: { routes: ItineraryRoute[]; renderCard: Props["renderCard"] }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{routes.map(renderCard)}</div>;
}

/** "Ver completo": every eligible route for the saved preferences, then other regions in a separate section. */
export function PersonalSections({ routes, loading, error, lang, renderCard, onShowAll }: Props) {
  const pt = lang === "pt";
  const { t } = useLang();
  const prefs = usePersonalPrefs();
  const { provinces } = useProvinces();

  const provinceNames = prefs.provinces
    .map((c) => provinces.find((p) => p.code === c)?.name[lang] ?? c)
    .join(", ");
  const interestNames = prefs.interests
    .map((i) => {
      const it = INTERESTS.find((x) => x.id === i);
      return it ? t(it.labelKey) : routeInterestMeta(i).label[lang];
    })
    .join(", ");

  if (!prefs.hasPrefs) {
    return (
      <Card className="p-6 mb-8 text-center space-y-3">
        <SlidersHorizontal className="size-8 mx-auto text-primary" />
        <p className="font-semibold">{pt ? "Ainda não tens preferências de viagem guardadas." : "You haven't saved travel preferences yet."}</p>
        <p className="text-sm text-muted-foreground">{pt ? "Escolhe a província, os dias e os interesses para veres roteiros feitos para ti." : "Pick a province, days and interests to see itineraries made for you."}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/preferences">{pt ? "Configurar preferências" : "Set preferences"}</Link></Button>
          <Button variant="outline" onClick={onShowAll}>{pt ? "Ver todos os roteiros" : "See all itineraries"}</Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <Loader2 className="size-5 animate-spin" />{pt ? "A carregar roteiros..." : "Loading itineraries..."}
      </div>
    );
  }
  if (error) {
    return <Card className="p-6 mb-8 text-center text-destructive">{pt ? "Não foi possível carregar os roteiros." : "Couldn't load the itineraries."}</Card>;
  }

  const res = personalizeRoutes(routes, prefs);
  const days = prefs.durationDays;
  const mainCount = res.exact.length + res.otherDuration.length + res.otherInProvince.length;

  return (
    <div className="space-y-8 mb-10">
      <Card className="p-4 bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 justify-between">
        <p className="text-sm">
          <Sparkles className="size-4 text-primary inline mr-1" />
          <strong>{provinceNames}</strong>
          {days ? ` · ${days} ${pt ? "dias" : "days"}` : ""}
          {interestNames ? ` · ${interestNames}` : ""}
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/preferences">{pt ? "Editar preferências" : "Edit preferences"}</Link></Button>
          <Button size="sm" variant="ghost" onClick={onShowAll}>{pt ? "Catálogo completo" : "Full catalogue"}</Button>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Compass className="size-6 text-primary" />{pt ? "Roteiros para ti" : "Itineraries for you"}</h2>
        {mainCount === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            {pt ? "Ainda não existem resultados para estas preferências nesta província." : "There are no results for these preferences in this province yet."}
          </Card>
        )}
        {res.exact.length > 0 && <Grid routes={res.exact} renderCard={renderCard} />}
        {days && res.exact.length === 0 && res.otherDuration.length > 0 && (
          <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 text-sm">
            {pt
              ? `Não há roteiros de exatamente ${days} dias. Vê abaixo alternativas com outra duração.`
              : `No itineraries of exactly ${days} days. See alternatives with a different length below.`}
          </Card>
        )}
        {res.otherDuration.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">{pt ? `Com outra duração (pediste ${days} dias)` : `Different length (you chose ${days} days)`}</h3>
            <Grid routes={res.otherDuration} renderCard={renderCard} />
          </div>
        )}
        {res.otherInProvince.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">{pt ? `Outros roteiros em ${provinceNames}` : `Other itineraries in ${provinceNames}`}</h3>
            <p className="text-sm text-muted-foreground">{pt ? "Não correspondem aos teus interesses, mas são da tua província." : "They don't match your interests, but are in your province."}</p>
            <Grid routes={res.otherInProvince} renderCard={renderCard} />
          </div>
        )}
      </section>

      {res.otherRegions.length > 0 && (
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><MapPinned className="size-6 text-primary" />{pt ? "Descobre outras regiões de Moçambique" : "Discover other regions of Mozambique"}</h2>
          <p className="text-sm text-muted-foreground">{pt ? "Sugestões noutras províncias — não fazem parte da tua seleção." : "Suggestions in other provinces — not part of your selection."}</p>
          <Grid routes={res.otherRegions} renderCard={renderCard} />
        </section>
      )}
    </div>
  );
}
