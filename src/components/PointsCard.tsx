import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Compass, Footprints, Globe, History, Sprout, Star, Trophy } from "lucide-react";

const LEVEL_ICONS = [Sprout, Compass, Footprints, Globe, Trophy];
const iconFor = (level: number) => LEVEL_ICONS[Math.min(LEVEL_ICONS.length, Math.max(1, level)) - 1];
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { fetchMyPoints, levelFor, LEVELS, POINT_VALUES, REASON_LABELS } from "@/lib/points";

export function PointsCard({ historyLimit = 5, showLevels = false }: { historyLimit?: number; showLevels?: boolean }) {
  const { authUser, isGuest } = useAuth();
  const { lang } = useLang();
  const uid = authUser?.id;
  const q = useQuery({
    queryKey: ["my-points", uid, historyLimit],
    queryFn: () => fetchMyPoints(historyLimit),
    enabled: !!uid && !isGuest,
  });
  const pt = lang === "pt";
  if (!uid || isGuest) return null;

  if (q.isLoading) {
    return (
      <Card className="p-6 border-0 shadow-[var(--shadow-soft)] space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-16 w-full" />
      </Card>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Card className="p-6 border-0 shadow-[var(--shadow-soft)] flex flex-wrap items-center gap-3">
        <AlertCircle className="size-5 text-destructive" />
        <p className="text-sm flex-1">{pt ? "Não foi possível carregar os teus pontos." : "We couldn't load your points."}</p>
        <Button size="sm" variant="outline" onClick={() => q.refetch()}>{pt ? "Tentar novamente" : "Try again"}</Button>
      </Card>
    );
  }

  const { total, balance, recent } = q.data;
  const lv = levelFor(total);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(pt ? "pt-PT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Card className="p-6 border-0 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-4">
        <motion.div
          key={lv.current.level}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="size-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground"
          aria-hidden="true"
        >
          {(() => { const I = iconFor(lv.current.level); return <I className="size-8" />; })()}
        </motion.div>
        <div className="flex-1 min-w-[10rem]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {pt ? "Nível" : "Level"} {lv.current.level}
          </p>
          <p className="text-xl font-bold">{lv.current.name[lang]}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold flex items-center gap-1 justify-end"><Star className="size-5 text-primary fill-current" />{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">XP</p>
          <p className="text-xs mt-1"><span className="font-semibold">{balance.toLocaleString()}</span> {pt ? "pontos resgatáveis" : "redeemable points"}</p>
        </div>
      </div>

      <div className="mt-5">
        <Progress value={lv.progress} className="h-2" aria-label={pt ? "Progresso de nível" : "Level progress"} />
        <p className="text-xs text-muted-foreground mt-2">
          {lv.next
            ? (pt ? `Faltam ${lv.toNext} XP para ${lv.next.name.pt}` : `${lv.toNext} XP to ${lv.next.name.en}`)
            : (pt ? "Atingiste o nível máximo." : "You reached the top level.")}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><History className="size-4" />{pt ? "Últimas transações" : "Recent transactions"}</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {pt
              ? `Ainda sem pontos. Ganhas ${POINT_VALUES.booking_completed} por atividade concluída, ${POINT_VALUES.route_stop_proof} por paragem de roteiro com foto, ${POINT_VALUES.route_completed} por roteiro concluído com todas as provas e XP por cada jogo verificado concluído.`
              : `No points yet. You earn ${POINT_VALUES.booking_completed} per completed activity, ${POINT_VALUES.route_stop_proof} per route stop with a photo, ${POINT_VALUES.route_completed} per route completed with every proof and XP for each verified game completed.`}
          </p>
        ) : (
          <ul className="divide-y">
            {recent.map((tx) => (
              <li key={tx.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    {REASON_LABELS[tx.reason]?.[lang] ?? tx.reason}
                    {tx.kind === "reversal" && <span className="text-muted-foreground"> · {pt ? "revertido" : "reversed"}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</p>
                </div>
                <span className={tx.points > 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                  {tx.points > 0 ? "+" : ""}{tx.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showLevels && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">{pt ? "Níveis e emblemas" : "Levels and badges"}</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {LEVELS.map((l) => {
              const reached = total >= l.minPoints;
              return (
                <li key={l.level} className={`rounded-xl border p-3 text-center ${reached ? "bg-accent/40" : "opacity-60"}`}>
                  {(() => { const I = iconFor(l.level); return <I className="size-6 mx-auto text-primary" aria-hidden="true" />; })()}
                  <p className="text-xs font-semibold mt-1">{l.name[lang]}</p>
                  <p className="text-[11px] text-muted-foreground">{l.minPoints} {pt ? "pts" : "pts"} · {reached ? (pt ? "alcançado" : "reached") : (pt ? "bloqueado" : "locked")}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
