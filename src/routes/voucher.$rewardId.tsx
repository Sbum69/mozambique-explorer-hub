import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gift, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/voucher/$rewardId")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({
    meta: [
      { title: "Resgate — Ekaya Explore" },
      { name: "description", content: "Detalhe de uma recompensa resgatada com pontos Ekaya." },
      { property: "og:title", content: "Resgate — Ekaya Explore" },
      { property: "og:description", content: "Detalhe de uma recompensa resgatada com pontos Ekaya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoucherPage,
});

/** Shows one real redemption (the param is the redemption id). */
function VoucherPage() {
  const { rewardId } = useParams({ from: "/voucher/$rewardId" });
  const { lang } = useLang();
  const pt = lang === "pt";
  const { authUser } = useAuth();
  const q = useQuery({
    queryKey: ["redemption", authUser?.id, rewardId],
    enabled: !!authUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("id, code, cost_points, created_at, used_at, rewards(title_pt, title_en, description_pt, description_en, valid_until, businesses(name))")
        .eq("id", rewardId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const rw = q.data?.rewards as {
    title_pt: string; title_en: string | null; description_pt: string | null; description_en: string | null;
    valid_until: string | null; businesses: { name: string } | null;
  } | null | undefined;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/gamification"><ArrowLeft className="size-4" />{pt ? "Conquistas" : "Achievements"}</Link>
        </Button>
        {q.isLoading ? <Skeleton className="h-48 w-full" /> : !q.data ? (
          <Card className="p-6 text-sm">{pt ? "Resgate não encontrado." : "Redemption not found."}</Card>
        ) : (
          <Card className="p-6 border-0 shadow-[var(--shadow-soft)] space-y-3 text-center">
            <Gift className="size-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold">{(lang === "en" && rw?.title_en) || rw?.title_pt}</h1>
            {((lang === "en" && rw?.description_en) || rw?.description_pt) && (
              <p className="text-sm text-muted-foreground">{(lang === "en" && rw?.description_en) || rw?.description_pt}</p>
            )}
            {rw?.businesses?.name && <p className="text-sm">{pt ? "Válido em" : "Valid at"} <strong>{rw.businesses.name}</strong></p>}
            <p className="font-mono text-2xl tracking-wider">{q.data.code}</p>
            <p className={`text-sm font-medium ${q.data.used_at ? "text-muted-foreground" : "text-primary"}`}>
              {q.data.used_at
                ? `${pt ? "Já usado em" : "Already used on"} ${new Date(q.data.used_at).toLocaleString(pt ? "pt-PT" : "en-GB")}`
                : pt ? "Por usar — mostra este código no negócio." : "Not used yet — show this code at the business."}
            </p>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard?.writeText(q.data!.code); toast.success(pt ? "Copiado" : "Copied"); }}>
              <Copy className="size-4" />{pt ? "Copiar código" : "Copy code"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {new Date(q.data.created_at).toLocaleString(pt ? "pt-PT" : "en-GB")} · -{q.data.cost_points} {pt ? "pontos" : "points"}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
