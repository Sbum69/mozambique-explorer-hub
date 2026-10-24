import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminErrorText, fetchAdminExperiences, setExperienceActive } from "@/lib/admin";

const TXT = {
  pt: {
    title: "Atividades comerciais",
    desc: "Atividades reserváveis dos negócios. Só aparecem ao público quando estão ativas e o negócio está aprovado.",
    search: "Pesquisar atividade ou negócio…",
    loading: "A carregar…",
    error: "Não foi possível carregar as atividades.",
    retry: "Tentar novamente",
    empty: "Sem atividades.",
    active: "Ativa",
    inactive: "Inativa",
    hidden: "Oculta (negócio não aprovado)",
    deactivate: "Desativar",
    activate: "Ativar",
    okOn: "Atividade ativada.",
    okOff: "Atividade desativada.",
    biz: {
      approved: "aprovado",
      pending: "pendente",
      rejected: "rejeitado",
      suspended: "suspenso",
    } as Record<string, string>,
  },
  en: {
    title: "Commercial activities",
    desc: "Bookable business activities. They are public only while active and the business is approved.",
    search: "Search activity or business…",
    loading: "Loading…",
    error: "Could not load activities.",
    retry: "Try again",
    empty: "No activities.",
    active: "Active",
    inactive: "Inactive",
    hidden: "Hidden (business not approved)",
    deactivate: "Deactivate",
    activate: "Activate",
    okOn: "Activity activated.",
    okOff: "Activity deactivated.",
    biz: {
      approved: "approved",
      pending: "pending",
      rejected: "rejected",
      suspended: "suspended",
    } as Record<string, string>,
  },
} as const;

export function AdminExperiencesModal({ onClose }: { onClose: () => void }) {
  const { authUser } = useAuth();
  const { lang } = useLang();
  const t = TXT[lang];
  const qc = useQueryClient();
  const key = ["admin-experiences", authUser?.id];
  const q = useQuery({ queryKey: key, queryFn: fetchAdminExperiences, enabled: !!authUser?.id });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter(
      (e) =>
        !s || [e.titlePt, e.titleEn ?? "", e.businessName].some((v) => v.toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  const toggle = async (id: string, active: boolean) => {
    setBusy(id);
    try {
      await setExperienceActive(id, !active);
      toast.success(active ? t.okOff : t.okOn);
      await qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(adminErrorText(e instanceof Error ? e.message : "", lang));
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="pl-9"
          />
        </div>
        {q.isPending ? (
          <p aria-busy="true" className="text-sm">
            {t.loading}
          </p>
        ) : q.isError ? (
          <div role="alert" className="text-sm space-y-2">
            <p>{t.error}</p>
            <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
              {t.retry}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t.empty}</p>
        ) : (
          <ul className="divide-y">
            {list.map((e) => (
              <li key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {(lang === "en" && e.titleEn) || e.titlePt}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.businessName} ({t.biz[e.businessStatus] ?? e.businessStatus}) ·{" "}
                    {e.priceMzn.toLocaleString(lang)} MZN
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={e.active && e.businessStatus === "approved" ? "default" : "secondary"}
                  >
                    {!e.active ? t.inactive : e.businessStatus === "approved" ? t.active : t.hidden}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === e.id}
                    onClick={() => void toggle(e.id, e.active)}
                  >
                    {e.active ? t.deactivate : t.activate}
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
