import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowLeft, DollarSign, Users, Globe2, Heart, TrendingUp,
  Sparkles, Wifi, Leaf, type LucideIcon,
} from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBackTarget } from "@/lib/nav";
import { useLang, type DictKey } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impacto Social — Ekaya Explore" },
      { name: "description", content: "Métricas e impacto social do turismo comunitário em Moçambique." },
      { property: "og:title", content: "Impacto Social — Ekaya Explore" },
      { property: "og:description", content: "Métricas e impacto social do turismo comunitário em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImpactPage,
});

interface KPI {
  id: string;
  icon: LucideIcon;
  target: number;
  prefix?: string;
  suffix?: string;
  format?: "money" | "int" | "percent";
  labelKey: DictKey;
  delta: string;
  gradient: string;
}

const KPIS: KPI[] = [
  { id: "rev", icon: DollarSign, target: 2.1, prefix: "$", suffix: "M", format: "money",
    labelKey: "kpiRevenue", delta: "+18%", gradient: "from-emerald-500 to-teal-600" },
  { id: "art", icon: Users, target: 342, format: "int",
    labelKey: "kpiArtisans", delta: "+24%", gradient: "from-blue-500 to-indigo-600" },
  { id: "com", icon: Globe2, target: 15, format: "int",
    labelKey: "kpiCommunities", delta: "+3", gradient: "from-orange-500 to-red-600" },
  { id: "sat", icon: Heart, target: 89, suffix: "%", format: "percent",
    labelKey: "kpiSatisfaction", delta: "+4%", gradient: "from-pink-500 to-rose-600" },
];

const PROVINCES: { name: string; pct: number }[] = [
  { name: "Maputo", pct: 34 },
  { name: "Inhambane", pct: 28 },
  { name: "Nampula", pct: 14 },
  { name: "Cabo Delgado", pct: 10 },
  { name: "Sofala", pct: 8 },
  { name: "Outras", pct: 6 },
];

const AREAS: { icon: LucideIcon; title: { pt: string; en: string }; desc: { pt: string; en: string }; gradient: string }[] = [
  { icon: Users, gradient: "from-blue-500 to-indigo-600",
    title: { pt: "Comunidades Locais", en: "Local Communities" },
    desc: { pt: "Receitas vão diretamente para artesãos, guias e pequenos negócios.", en: "Revenue flows directly to artisans, guides and small businesses." } },
  { icon: Leaf, gradient: "from-green-500 to-emerald-600",
    title: { pt: "Sustentabilidade", en: "Sustainability" },
    desc: { pt: "Promovemos turismo de baixo impacto e proteção do património.", en: "We promote low-impact tourism and heritage protection." } },
  { icon: Wifi, gradient: "from-purple-500 to-pink-600",
    title: { pt: "Inclusão Digital", en: "Digital Inclusion" },
    desc: { pt: "Funciona offline para alcançar zonas com conectividade limitada.", en: "Works offline to reach areas with limited connectivity." } },
];

function useCounter(target: number, delay = 0, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tStart = performance.now() + delay;
    const step = (now: number) => {
      if (now < tStart) { raf = requestAnimationFrame(step); return; }
      if (!start) start = now;
      const p = Math.min(1, (now - tStart) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, delay, duration]);
  return val;
}

function formatKpi(v: number, k: KPI) {
  if (k.format === "money") return `${k.prefix ?? ""}${v.toFixed(1)}${k.suffix ?? ""}`;
  if (k.format === "percent") return `${Math.round(v)}${k.suffix ?? ""}`;
  return `${Math.round(v).toLocaleString()}`;
}

function ImpactPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const backTarget = useBackTarget();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.header
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: backTarget })}>
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">{t("impactTitle")}</h1>
              <p className="text-xs text-muted-foreground truncate">{t("impactSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <LanguageToggle />
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Quick overview pills */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
            {t("overviewQuick")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { k: "pill11Provinces" as DictKey, bg: "bg-blue-50 text-blue-700 border-blue-100" },
              { k: "pillResponsible" as DictKey, bg: "bg-green-50 text-green-700 border-green-100" },
              { k: "pillOffline" as DictKey, bg: "bg-purple-50 text-purple-700 border-purple-100" },
            ].map((p, i) => (
              <motion.div
                key={p.k}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-full px-5 py-2.5 text-sm font-medium border ${p.bg}`}
              >
                {t(p.k)}
              </motion.div>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("kpiTitle")}</h2>
            <p className="text-gray-600 mt-1">{t("kpiSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {KPIS.map((k, i) => (
              <KpiCard key={k.id} kpi={k} delay={i * 200} t={t} />
            ))}
          </div>
        </section>

        {/* Province impact map */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("provinceImpact")}</h2>
          </div>
          <Card className="p-6 rounded-2xl shadow-lg border border-gray-100 bg-white">
            <div className="space-y-4">
              {PROVINCES.map((p, i) => (
                <div key={p.name}>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-gray-700">{p.name}</span>
                    <span className="text-gray-500">{p.pct}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-green-500 to-teal-600 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Impact Areas */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("impactAreas")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {AREAS.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="p-6 rounded-2xl shadow-lg border border-gray-100 h-full">
                    <div className={`size-12 rounded-xl bg-gradient-to-br ${a.gradient} text-white flex items-center justify-center mb-4`}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{a.title[lang]}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{a.desc[lang]}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Why not just an app */}
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-8 sm:p-12 shadow-xl">
          <Sparkles className="size-12 mb-4 opacity-90" />
          <h2 className="text-2xl sm:text-3xl font-bold">{t("whyNotJustApp")}</h2>
          <p className="mt-3 text-white/90 max-w-2xl">
            {lang === "pt"
              ? "A Ekaya combina tecnologia offline-first, gamificação e impacto social mensurável para criar valor real para visitantes e comunidades."
              : "Ekaya combines offline-first technology, gamification and measurable social impact to create real value for visitors and communities."}
          </p>
        </section>
      </main>
    </div>
  );
}

function KpiCard({ kpi, delay, t }: { kpi: KPI; delay: number; t: (k: DictKey) => string }) {
  const v = useCounter(kpi.target, delay);
  const Icon = kpi.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
      whileHover={{ y: -5 }}
    >
      <Card className={`p-6 rounded-2xl shadow-lg border border-gray-100 bg-gradient-to-br ${kpi.gradient} text-white h-full`}>
        <div className="flex items-center justify-between">
          <Icon className="size-7 opacity-90" />
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 rounded-full px-2 py-0.5">
            <TrendingUp className="size-3" />
            {kpi.delta}
          </span>
        </div>
        <p className="mt-4 text-3xl font-bold tabular-nums">{formatKpi(v, kpi)}</p>
        <p className="text-sm opacity-90 mt-1">{t(kpi.labelKey)}</p>
        <p className="text-[10px] uppercase tracking-wider opacity-70 mt-3">{t("vsLastMonth")}</p>
      </Card>
    </motion.div>
  );
}
