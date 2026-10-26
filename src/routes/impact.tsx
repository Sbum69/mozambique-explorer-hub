import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, Suspense, type ReactNode } from "react";
import {
  ArrowLeft,
  MapPin,
  Store,
  Building2,
  Users,
  Route as RouteIcon,
  CalendarCheck,
  CheckCircle2,
  Camera,
  Flag,
  Leaf,
  Wifi,
  Database,
  type LucideIcon,
} from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBackTarget } from "@/lib/nav";
import { useLang } from "@/contexts/LanguageContext";
import { deriveImpactView, impactStatsQuery, type ImpactStats } from "@/lib/impact-stats";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impacto Social — Ekaya Explore" },
      {
        name: "description",
        content:
          "Métricas reais da plataforma e impacto verificado do turismo comunitário em Moçambique.",
      },
      { property: "og:title", content: "Impacto Social — Ekaya Explore" },
      {
        property: "og:description",
        content:
          "Métricas reais da plataforma e impacto verificado do turismo comunitário em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImpactPage,
});

type L = { pt: string; en: string };

function ImpactPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const backTarget = useBackTarget();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppSidebar />
            <Button
              variant="ghost"
              size="icon"
              aria-label={lang === "pt" ? "Voltar" : "Back"}
              onClick={() => navigate({ to: backTarget })}
            >
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
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <StatsBoundary />
        <Areas />
      </main>
    </div>
  );
}

function StatsBoundary() {
  const { lang } = useLang();
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorCatcher onReset={reset} lang={lang}>
      <Suspense
        fallback={
          <p className="text-muted-foreground" role="status">
            {lang === "pt" ? "A carregar estatísticas…" : "Loading statistics…"}
          </p>
        }
      >
        <Stats />
      </Suspense>
    </ErrorCatcher>
  );
}

class ErrorCatcher extends Component<
  { children: ReactNode; onReset: () => void; lang: "pt" | "en" },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    if (!this.state.err) return this.props.children;
    const pt = this.props.lang === "pt";
    return (
      <Card className="p-6 text-center space-y-3" role="alert">
        <p>
          {pt ? "Não foi possível carregar as estatísticas." : "Could not load the statistics."}
        </p>
        <Button
          onClick={() => {
            this.props.onReset();
            this.setState({ err: false });
          }}
        >
          {pt ? "Tentar novamente" : "Try again"}
        </Button>
      </Card>
    );
  }
}

function Stats() {
  const { lang } = useLang();
  const { data } = useSuspenseQuery(impactStatsQuery());
  const view = deriveImpactView(data);
  const p = data.platform,
    v = data.verified;
  const tx = (x: L) => x[lang];
  const when = new Date(data.generated_at).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
    timeZone: "Africa/Maputo",
  });
  const s = p.bookings_by_status;

  const platform: { icon: LucideIcon; n: number; label: L; note?: L }[] = [
    {
      icon: MapPin,
      n: p.destinations,
      label: { pt: "Destinos publicados", en: "Published destinations" },
    },
    {
      icon: Store,
      n: p.active_activities,
      label: { pt: "Atividades ativas", en: "Active activities" },
      note: { pt: "De negócios aprovados", en: "From approved businesses" },
    },
    {
      icon: Building2,
      n: p.approved_businesses,
      label: { pt: "Negócios aprovados", en: "Approved businesses" },
    },
    {
      icon: Leaf,
      n: p.community_experiences,
      label: { pt: "Experiências comunitárias", en: "Community experiences" },
      note: { pt: "Aprovadas", en: "Approved" },
    },
    {
      icon: RouteIcon,
      n: p.public_routes,
      label: { pt: "Roteiros públicos", en: "Public routes" },
      note: { pt: "Aprovados e ativos", en: "Approved and active" },
    },
    {
      icon: Users,
      n: p.accounts,
      label: { pt: "Contas registadas", en: "Registered accounts" },
      note: { pt: "Inclui contas internas e de teste", en: "Includes internal and test accounts" },
    },
    {
      icon: CalendarCheck,
      n: p.bookings_total,
      label: { pt: "Reservas registadas", en: "Bookings recorded" },
      note: {
        pt: `${s.pending} pendentes · ${s.confirmed} confirmadas · ${s.completed} concluídas · ${s.no_show ?? 0} não compareceram · ${s.rejected} rejeitadas · ${s.cancelled} canceladas`,
        en: `${s.pending} pending · ${s.confirmed} confirmed · ${s.completed} completed · ${s.no_show ?? 0} no-shows · ${s.rejected} rejected · ${s.cancelled} cancelled`,
      },
    },
  ];
  const verified: { icon: LucideIcon; n: number; label: L; rule: L }[] = [
    {
      icon: CheckCircle2,
      n: v.completed_bookings,
      label: { pt: "Reservas concluídas", en: "Completed bookings" },
      rule: {
        pt: "Estado concluída e data já passada",
        en: "Status completed and date already passed",
      },
    },
    {
      icon: Users,
      n: v.completed_people,
      label: {
        pt: "Participantes em reservas concluídas",
        en: "Participants in completed bookings",
      },
      rule: {
        pt: "Soma de pessoas das reservas concluídas",
        en: "Sum of people in completed bookings",
      },
    },
    {
      icon: Building2,
      n: v.businesses_with_completed,
      label: { pt: "Negócios com atividade realizada", en: "Businesses with a delivered activity" },
      rule: { pt: "Pelo menos uma reserva concluída", en: "At least one completed booking" },
    },
    {
      icon: Flag,
      n: v.completed_routes,
      label: { pt: "Roteiros concluídos", en: "Completed routes" },
      rule: { pt: "Progresso marcado como concluído", en: "Progress marked as completed" },
    },
    {
      icon: Camera,
      n: v.stops_with_proof,
      label: { pt: "Paragens com prova fotográfica", en: "Stops with photo proof" },
      rule: { pt: "Foto privada registada na paragem", en: "Private photo recorded at the stop" },
    },
  ];

  const Source = () => (
    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
      <Database className="size-3.5" />
      {lang === "pt"
        ? `Dados de ${when} · Base de dados Ekaya, contagem em tempo real`
        : `Data as of ${when} · Ekaya database, live count`}
    </p>
  );

  return (
    <>
      <section aria-labelledby="platform-h">
        <h2 id="platform-h" className="text-2xl sm:text-3xl font-bold">
          {lang === "pt" ? "Métricas da plataforma" : "Platform metrics"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {lang === "pt"
            ? "O que existe hoje no catálogo e na plataforma. Não representa turismo realizado."
            : "What exists today in the catalogue and platform. This is not realised tourism."}
        </p>
        <Source />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {platform.map((k) => (
            <Card key={k.label.en} className="p-5">
              <k.icon className="size-6 text-primary" aria-hidden />
              <p className="mt-3 text-3xl font-bold tabular-nums">{k.n.toLocaleString()}</p>
              <p className="text-sm font-medium">{tx(k.label)}</p>
              {k.note && <p className="text-xs text-muted-foreground mt-1">{tx(k.note)}</p>}
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="verified-h">
        <h2 id="verified-h" className="text-2xl sm:text-3xl font-bold">
          {lang === "pt" ? "Impacto verificado" : "Verified impact"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {lang === "pt"
            ? "Só conta o que foi comprovadamente realizado. Pendentes, confirmadas futuras, rejeitadas e canceladas não entram."
            : "Only what was provably delivered counts. Pending, future confirmed, rejected and cancelled bookings are excluded."}
        </p>
        <Source />
        {!view.hasVerifiedImpact && (
          <Card className="p-5 mt-5 border-dashed">
            <p className="font-medium">
              {lang === "pt"
                ? "Ainda não há impacto verificado registado."
                : "No verified impact recorded yet."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "pt"
                ? "Ainda não existem reservas concluídas, roteiros concluídos nem provas de visita. Os números aparecem aqui assim que houver registos reais."
                : "There are no completed bookings, completed routes or visit proofs yet. Figures will appear here as soon as real records exist."}
            </p>
          </Card>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-5">
          {verified.map((k) => (
            <Card key={k.label.en} className="p-5">
              <k.icon className="size-6 text-primary" aria-hidden />
              <p className="mt-3 text-3xl font-bold tabular-nums">{k.n.toLocaleString()}</p>
              <p className="text-sm font-medium">{tx(k.label)}</p>
              <p className="text-xs text-muted-foreground mt-1">{tx(k.rule)}</p>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {lang === "pt"
            ? "Sem valores monetários: a plataforma não regista pagamentos, por isso não mostramos receita. Sem satisfação nem crescimento: não existem avaliações verificadas nem histórico."
            : "No money figures: the platform records no payments, so no revenue is shown. No satisfaction or growth: there are no verified reviews or history."}
        </p>
      </section>

      <ProvinceSection stats={data} view={view} />
    </>
  );
}

function ProvinceSection({
  view,
}: {
  stats: ImpactStats;
  view: ReturnType<typeof deriveImpactView>;
}) {
  const { lang } = useLang();
  return (
    <section aria-labelledby="prov-h">
      <h2 id="prov-h" className="text-2xl sm:text-3xl font-bold">
        {lang === "pt" ? "Atividades ativas por província" : "Active activities by province"}
      </h2>
      <Card className="p-6 mt-5">
        {view.provinceRows.length === 0 ? (
          <p className="text-muted-foreground">
            {lang === "pt" ? "Ainda não há atividades ativas." : "No active activities yet."}
          </p>
        ) : (
          <div className="space-y-4">
            {view.provinceRows.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-sm font-medium mb-1.5">
                  <span className="capitalize">{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.count} · {r.pct}%
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-5">
          {view.verifiedProvinceRows.length === 0
            ? lang === "pt"
              ? "Reservas concluídas por província: aparecem quando uma província tiver pelo menos 3 (para proteger a privacidade)."
              : "Completed bookings by province: shown once a province has at least 3 (to protect privacy)."
            : view.verifiedProvinceRows.map((r) => `${r.name}: ${r.count}`).join(" · ")}
        </p>
      </Card>
    </section>
  );
}

const AREAS: { icon: LucideIcon; title: L; desc: L }[] = [
  {
    icon: Users,
    title: { pt: "Comunidades Locais", en: "Local Communities" },
    desc: {
      pt: "Ligamos visitantes a artesãos, guias e pequenos negócios locais.",
      en: "We connect visitors with local artisans, guides and small businesses.",
    },
  },
  {
    icon: Leaf,
    title: { pt: "Sustentabilidade", en: "Sustainability" },
    desc: {
      pt: "Promovemos turismo de baixo impacto e proteção do património.",
      en: "We promote low-impact tourism and heritage protection.",
    },
  },
  {
    icon: Wifi,
    title: { pt: "Inclusão Digital", en: "Digital Inclusion" },
    desc: {
      pt: "Pensado para zonas com conectividade limitada.",
      en: "Designed for areas with limited connectivity.",
    },
  },
];

function Areas() {
  const { t, lang } = useLang();
  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-bold mb-5">{t("impactAreas")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {AREAS.map((a) => (
          <Card key={a.title.en} className="p-6 h-full">
            <a.icon className="size-7 text-primary mb-3" aria-hidden />
            <h3 className="font-bold text-lg">{a.title[lang]}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.desc[lang]}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
