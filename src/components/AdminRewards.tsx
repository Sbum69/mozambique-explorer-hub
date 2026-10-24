import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAllRewardsAdmin,
  isRewardRedeemable,
  rewardErrorText,
  setRewardActive,
} from "@/lib/rewards";

const TXT = {
  pt: {
    title: "Recompensas",
    desc: "Todas as recompensas dos negócios. O administrador pode desativá-las ou reativá-las.",
    loading: "A carregar…",
    error: "Não foi possível carregar as recompensas.",
    retry: "Tentar novamente",
    empty: "Ainda não há recompensas.",
    platform: "Plataforma",
    points: "pontos",
    stock: "Stock",
    unlimited: "ilimitado",
    until: "Válida até",
    active: "Ativa",
    inactive: "Inativa",
    unavailable: "Indisponível",
    deactivate: "Desativar",
    activate: "Reativar",
  },
  en: {
    title: "Rewards",
    desc: "Every business reward. The administrator can deactivate or reactivate them.",
    loading: "Loading…",
    error: "Could not load rewards.",
    retry: "Try again",
    empty: "No rewards yet.",
    platform: "Platform",
    points: "points",
    stock: "Stock",
    unlimited: "unlimited",
    until: "Valid until",
    active: "Active",
    inactive: "Inactive",
    unavailable: "Unavailable",
    deactivate: "Deactivate",
    activate: "Reactivate",
  },
} as const;

export function AdminRewardsModal({ onClose }: { onClose: () => void }) {
  const { authUser } = useAuth();
  const { lang } = useLang();
  const t = TXT[lang];
  const qc = useQueryClient();
  const key = ["admin-rewards", authUser?.id];
  const q = useQuery({ queryKey: key, queryFn: fetchAllRewardsAdmin, enabled: !!authUser?.id });
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (id: string, active: boolean) => {
    setBusy(id);
    try {
      await setRewardActive(id, !active);
      await qc.invalidateQueries({ queryKey: key });
    } catch (err) {
      toast.error(rewardErrorText(err instanceof Error ? err.message : "", lang));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        {q.isPending ? (
          <p aria-busy="true">{t.loading}</p>
        ) : q.isError ? (
          <div role="alert">
            <p>{t.error}</p>
            <Button variant="outline" onClick={() => void q.refetch()}>
              {t.retry}
            </Button>
          </div>
        ) : !q.data.length ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="divide-y">
            {q.data.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {(lang === "en" && r.titleEn) || r.titlePt}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.businessName ?? t.platform} · {r.costPoints} {t.points} · {t.stock}:{" "}
                    {r.stock ?? t.unlimited}
                    {r.validUntil ? ` · ${t.until} ${r.validUntil}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isRewardRedeemable(r) ? "default" : "secondary"}>
                    {!r.active ? t.inactive : isRewardRedeemable(r) ? t.active : t.unavailable}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={() => void toggle(r.id, r.active)}
                  >
                    {r.active ? t.deactivate : t.activate}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
