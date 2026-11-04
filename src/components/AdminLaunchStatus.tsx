import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";

import { ContentChecklist } from "@/components/ContentChecklist";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { fetchAppErrors, fetchLaunchStatus, launchChecks, toReadiness } from "@/lib/launch";
import { LAUNCH_TXT } from "@/lib/page-texts";

/** Admin → Launch status: minimum content, what each business is missing, to-dos and errors. */
export function AdminLaunchStatus() {
  const { lang } = useLang();
  const t = LAUNCH_TXT[lang];
  const q = useQuery({
    queryKey: ["admin-launch-status"],
    queryFn: async () => ({ status: await fetchLaunchStatus(), errors: await fetchAppErrors(50) }),
  });

  if (q.isLoading) return <p aria-busy="true">{t.loading}</p>;
  if (q.isError || !q.data)
    return (
      <div role="alert" className="space-y-2">
        <p>{t.errLoad}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t.retry}
        </Button>
      </div>
    );

  const { status: s, errors } = q.data;
  const checks = launchChecks(s);
  const ready = checks.filter((c) => c.blocking).every((c) => c.ok);
  const value = (key: string) =>
    key === "businesses"
      ? t.businesses(s.approvedBusinesses, s.minBusinesses)
      : key === "experiences"
        ? t.experiences(s.activeExperiences, s.minExperiences)
        : key === "admins2fa"
          ? t.admins2fa(s.adminsWithout2fa)
          : key === "leads"
            ? t.leads(s.pendingLeads)
            : t.placements(s.placementsWaiting);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="flex items-center gap-2 font-semibold">
          {ready ? (
            <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          ) : (
            <CircleAlert className="size-5 text-destructive" aria-hidden="true" />
          )}
          {ready ? t.ready : t.notReady}
        </p>
        <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t.refresh}
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.key}
            className="flex items-start gap-2 rounded-[10px] border border-border p-3 text-sm"
          >
            {c.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <span>
              <span className="sr-only">{c.ok ? t.ok : t.todo}: </span>
              {value(c.key)}
              {!c.blocking && <span className="text-muted-foreground"> ({t.notBlocking})</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t.readAt(new Date(s.readAt).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB"))}
      </p>

      <section className="space-y-3" aria-labelledby="launch-biz">
        <h3 id="launch-biz" className="font-semibold">
          {t.businessesTitle}
        </h3>
        {!s.businesses.length && <p className="text-sm text-muted-foreground">{t.noBusinesses}</p>}
        {s.businesses.map((b) => (
          <Card key={b.id} className="p-4 space-y-2">
            <p className="font-medium break-words">
              {b.name} <span className="text-sm text-muted-foreground">· {b.status}</span>
            </p>
            <ContentChecklist readiness={toReadiness(b)} />
          </Card>
        ))}
      </section>

      <section className="space-y-2" aria-labelledby="launch-errors">
        <h3 id="launch-errors" className="font-semibold">
          {t.errorsTitle(s.errors7d)}
        </h3>
        <p className="text-xs text-muted-foreground">{t.errorsIntro}</p>
        {!errors.length ? (
          <p className="text-sm">{t.noErrors}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {errors.map((e) => (
              <li key={e.id} className="rounded-md border border-border p-2 break-words">
                <span className="font-mono text-xs">{e.route}</span> · {e.message}
                <span className="block text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB")} ·{" "}
                  {e.kind}
                  {e.release ? ` · v${e.release}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
