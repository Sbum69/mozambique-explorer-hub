import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, CalendarCheck, Map as MapIcon, Trophy, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { PointsCard } from "@/components/PointsCard";
import { requireAuthenticatedUser } from "@/lib/auth";
import { POINT_VALUES } from "@/lib/points";

export const Route = createFileRoute("/gamification")({
  head: () => ({
    meta: [
      { title: "Pontos e níveis — Ekaya Explore" },
      { name: "description", content: "Ganha pontos por atividades concluídas e roteiros comprovados em Moçambique." },
      { property: "og:title", content: "Pontos e níveis — Ekaya Explore" },
      { property: "og:description", content: "Ganha pontos por atividades concluídas e roteiros comprovados em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: GamificationPage,
});

function GamificationPage() {
  const { lang } = useLang();
  const pt = lang === "pt";
  const rules = [
    { icon: CalendarCheck, pts: POINT_VALUES.booking_completed, text: pt ? "Atividade reservada e marcada como concluída pelo anfitrião, depois da data." : "Booked activity marked completed by the host after its date." },
    { icon: Camera, pts: POINT_VALUES.route_stop_proof, text: pt ? "Paragem de roteiro concluída com foto de prova (uma vez por paragem)." : "Route stop completed with a proof photo (once per stop)." },
    { icon: MapIcon, pts: POINT_VALUES.route_completed, text: pt ? "Roteiro terminado com prova em todas as paragens (uma vez por roteiro)." : "Route finished with proof at every stop (once per route)." },
  ];
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AppSidebar />
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/dashboard"><ArrowLeft className="size-4" />{pt ? "Perfil" : "Profile"}</Link>
            </Button>
          </div>
          <LanguageToggle />
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="size-7 text-primary" /> {pt ? "Pontos e níveis" : "Points and levels"}
        </h1>
        <PointsCard historyLimit={20} showLevels />
        <Card className="p-6 border-0 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold mb-3">{pt ? "Como ganhar pontos" : "How to earn points"}</h2>
          <ul className="space-y-3">
            {rules.map((r) => (
              <li key={r.pts + r.text} className="flex items-start gap-3 text-sm">
                <r.icon className="size-5 text-primary shrink-0 mt-0.5" />
                <span className="flex-1">{r.text}</span>
                <span className="font-semibold text-primary">+{r.pts}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground flex gap-2">
            <Info className="size-4 shrink-0" />
            {pt
              ? "Os pontos são atribuídos automaticamente pelo sistema e não dão direito a descontos ou prémios. Se uma atividade concluída for revertida, os pontos são descontados no histórico."
              : "Points are awarded automatically by the system and do not entitle you to discounts or prizes. If a completed activity is reverted, the points are deducted in your history."}
          </p>
        </Card>
      </main>
    </div>
  );
}
