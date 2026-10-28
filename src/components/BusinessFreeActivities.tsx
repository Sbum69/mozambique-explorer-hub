import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCommunityExperiences, type CommunityExperience } from "@/lib/community-experiences";
import {
  CommunityExperienceCard,
  CommunityExperienceDialog,
} from "@/components/CommunityExperienceCard";

/** Free community activities in the same province as the business — never other provinces. */
export function BusinessFreeActivities({
  provinceId,
  provinceName,
}: {
  provinceId: string | null;
  provinceName: string | null;
}) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const [items, setItems] = useState<CommunityExperience[]>([]);
  const [loading, setLoading] = useState(!!provinceId);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<CommunityExperience | null>(null);

  useEffect(() => {
    if (!provinceId) return;
    let active = true;
    setLoading(true);
    setError(false);
    fetchCommunityExperiences({ provinceId })
      .then((rows) => active && setItems(rows.filter((r) => r.provinceId === provinceId)))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [provinceId]);

  if (!provinceId) return null;

  return (
    <section id="business-free-activities" className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">
          {pt
            ? "O que podes fazer gratuitamente nesta província"
            : "What you can do for free in this province"}
        </h2>
        {provinceName && <p className="text-sm text-muted-foreground">{provinceName}</p>}
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-6 text-center text-muted-foreground">
          {pt ? "Não foi possível carregar as atividades." : "Couldn't load the activities."}
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          {pt
            ? "Ainda não há atividades gratuitas nesta província."
            : "No free activities in this province yet."}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <CommunityExperienceCard key={it.id} item={it} onOpen={() => setOpen(it)} />
          ))}
        </div>
      )}
      <CommunityExperienceDialog item={open} onClose={() => setOpen(null)} />
    </section>
  );
}
