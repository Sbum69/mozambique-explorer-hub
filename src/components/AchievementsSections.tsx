import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Lock, Medal, Gamepad2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { fetchMyPoints } from "@/lib/points";
import {
  BADGES,
  badgeStatus,
  fetchAchievements,
  fetchLeaderboard,
  fetchRewards,
  redeemReward,
  gameErrorText,
} from "@/lib/games";

function useUid() {
  const { authUser, isGuest } = useAuth();
  return !isGuest ? authUser?.id : undefined;
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  const { lang } = useLang();
  return (
    <div className="flex items-center gap-3 text-sm">
      <AlertCircle className="size-5 text-destructive" />
      <span className="flex-1">
        {lang === "pt" ? "Não foi possível carregar." : "Couldn't load."}
      </span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {lang === "pt" ? "Tentar novamente" : "Try again"}
      </Button>
    </div>
  );
}

export function ChallengesAndBadges() {
  const uid = useUid();
  const { lang } = useLang();
  const pt = lang === "pt";
  const q = useQuery({
    queryKey: ["achievements", uid],
    queryFn: fetchAchievements,
    enabled: !!uid,
  });
  if (!uid) return null;
  return (
    <Card className="p-6 border-0 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Medal className="size-5 text-primary" />
          {pt ? "Desafios e selos" : "Challenges and badges"}
        </h2>
        <Button asChild size="sm" variant="outline" className="gap-1">
          <Link to="/games">
            <Gamepad2 className="size-4" />
            {pt ? "Jogar" : "Play"}
          </Link>
        </Button>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : q.isError || !q.data ? (
        <ErrorRow onRetry={() => q.refetch()} />
      ) : (
        (() => {
          const { state, badgeInput } = q.data;
          const verifiable = state.catalog.filter((c) => c.xp > 0);
          const doneV = verifiable.filter((c) => state.completed[c.key]).length;
          const started = Object.keys(state.progress).filter((k) => !state.completed[k]).length;
          return (
            <>
              <p className="text-sm text-muted-foreground">
                {pt
                  ? `Jogos verificados concluídos: ${doneV}/${verifiable.length} · em progresso: ${started}`
                  : `Verified games completed: ${doneV}/${verifiable.length} · in progress: ${started}`}
              </p>
              <Progress
                value={verifiable.length ? (doneV / verifiable.length) * 100 : 0}
                className="h-2 mt-2"
              />
              <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BADGES.map((b) => {
                  const st = badgeStatus(b, badgeInput);
                  return (
                    <li
                      key={b.id}
                      className={`rounded-xl border p-3 text-center ${st.earned ? "bg-accent/40" : "border-dashed bg-muted/30"}`}
                    >
                      <div className="text-2xl" aria-hidden="true">
                        {st.earned ? (
                          b.emoji
                        ) : (
                          <Lock className="size-6 mx-auto text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs font-semibold mt-1">{b.name[lang]}</p>
                      <p className="text-[11px] text-muted-foreground">{b.requirement[lang]}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {st.earned ? (pt ? "desbloqueado" : "unlocked") : `${st.have}/${st.need}`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </>
          );
        })()
      )}
    </Card>
  );
}

export function Leaderboard() {
  const uid = useUid();
  const { lang } = useLang();
  const pt = lang === "pt";
  const q = useQuery({
    queryKey: ["leaderboard", uid],
    queryFn: () => fetchLeaderboard(20),
    enabled: !!uid,
  });
  if (!uid) return null;
  return (
    <Card className="p-6 border-0 shadow-[var(--shadow-soft)]">
      <h2 className="font-semibold mb-1">{pt ? "Placar" : "Leaderboard"}</h2>
      <p className="text-xs text-muted-foreground mb-3">
        {pt
          ? "Classificação por XP acumulado (resgates não reduzem o XP). Só é mostrado o primeiro nome."
          : "Ranked by accumulated XP (redemptions don't reduce XP). Only first names are shown."}
      </p>
      {q.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : q.isError ? (
        <ErrorRow onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {pt ? "Ainda ninguém ganhou XP." : "Nobody has earned XP yet."}
        </p>
      ) : (
        <ol className="divide-y">
          {q.data!.map((r) => (
            <li
              key={`${r.rank}-${r.isMe}-${r.name}`}
              className={`py-2 flex items-center gap-3 text-sm ${r.isMe ? "font-semibold text-primary" : ""}`}
            >
              <span className="w-8 text-right">#{r.rank}</span>
              <span className="flex-1 truncate">
                {r.name ?? (pt ? "Viajante" : "Traveller")}
                {r.isMe ? (pt ? " (tu)" : " (you)") : ""}
              </span>
              <span>{r.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function RewardsSection() {
  const uid = useUid();
  const { lang } = useLang();
  const pt = lang === "pt";
  const qc = useQueryClient();
  const rq = useQuery({ queryKey: ["rewards", uid], queryFn: fetchRewards, enabled: !!uid });
  const pq = useQuery({
    queryKey: ["my-points", uid, 20],
    queryFn: () => fetchMyPoints(20),
    enabled: !!uid,
  });
  const [busy, setBusy] = useState<string | null>(null);
  if (!uid) return null;
  const balance = pq.data?.balance ?? 0;

  const redeem = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      const r = await redeemReward(id, crypto.randomUUID());
      toast.success(pt ? `Resgatado! Código ${r.code}` : `Redeemed! Code ${r.code}`);
      qc.invalidateQueries({ queryKey: ["rewards", uid] });
      qc.invalidateQueries({ queryKey: ["my-points", uid] });
    } catch (e) {
      toast.error(gameErrorText((e as Error).message, pt));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-6 border-0 shadow-[var(--shadow-soft)]">
      <h2 className="font-semibold flex items-center gap-2 mb-1">
        <Gift className="size-5 text-primary" />
        {pt ? "Recompensas" : "Rewards"}
      </h2>
      <p className="text-sm mb-3">
        {pt ? "Saldo resgatável" : "Redeemable balance"}:{" "}
        <strong>{pq.isLoading ? "…" : balance.toLocaleString()}</strong> {pt ? "pontos" : "points"}
      </p>
      {rq.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : rq.isError || !rq.data ? (
        <ErrorRow onRetry={() => rq.refetch()} />
      ) : (
        <>
          {rq.data.rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pt
                ? "Ainda não há recompensas disponíveis. Os teus pontos ficam guardados até haver recompensas reais."
                : "No rewards available yet. Your points stay saved until real rewards are added."}
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {rq.data.rewards.map((r) => {
                const title = (lang === "en" && r.title_en) || r.title_pt;
                const desc = (lang === "en" && r.description_en) || r.description_pt;
                const soldOut = r.stock !== null && r.stock <= 0;
                return (
                  <li key={r.id} className="rounded-xl border p-4 flex flex-col gap-2">
                    <p className="font-semibold">{title}</p>
                    {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                    {(() => {
                      const biz = r.businesses as { name: string } | null;
                      const parts = [
                        biz?.name,
                        r.valid_until
                          ? `${pt ? "Válida até" : "Valid until"} ${r.valid_until}`
                          : null,
                      ].filter(Boolean);
                      return parts.length ? (
                        <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
                      ) : null;
                    })()}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-semibold text-primary">
                        {r.cost_points} {pt ? "pontos" : "points"}
                      </span>
                      <Button
                        size="sm"
                        disabled={soldOut || balance < r.cost_points || busy === r.id}
                        onClick={() => redeem(r.id)}
                      >
                        {soldOut
                          ? pt
                            ? "Esgotado"
                            : "Sold out"
                          : busy === r.id
                            ? "…"
                            : pt
                              ? "Resgatar"
                              : "Redeem"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <h3 className="text-sm font-semibold mt-5 mb-2">
            {pt ? "Histórico de resgates" : "Redemption history"}
          </h3>
          {rq.data.redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pt ? "Ainda sem resgates." : "No redemptions yet."}
            </p>
          ) : (
            <ul className="divide-y">
              {rq.data.redemptions.map((d) => {
                const rw = d.rewards as { title_pt: string; title_en: string | null } | null;
                return (
                  <li key={d.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <Link
                        to="/voucher/$rewardId"
                        params={{ rewardId: d.id }}
                        className="truncate underline-offset-2 hover:underline"
                      >
                        {(lang === "en" && rw?.title_en) || rw?.title_pt}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString(pt ? "pt-PT" : "en-GB")} ·{" "}
                        {d.code}
                      </p>
                    </div>
                    <span className="font-semibold text-destructive">-{d.cost_points}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
