import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import type { ExperienceMissing, Readiness } from "@/lib/content";
import { CONTENT_TXT } from "@/lib/page-texts";

/**
 * "Ready to publish" list for one business: what is missing on the business and on each activity.
 * The rules come from the database (content_readiness). Icons and words, never colour alone.
 */
export function ContentChecklist({
  readiness,
  onFixBusiness,
  onFixExperience,
  experienceActions,
}: {
  readiness: Readiness;
  onFixBusiness?: () => void;
  onFixExperience?: (experienceId: string, missing: ExperienceMissing[]) => void;
  experienceActions?: (e: Readiness["experiences"][number]) => ReactNode;
}) {
  const { lang } = useLang();
  const t = CONTENT_TXT[lang];
  const bizReady = readiness.missing.length === 0;
  return (
    <div className="space-y-4">
      <Item
        ready={bizReady}
        label={t.businessLabel}
        status={bizReady ? t.ready : t.notReady}
        missing={readiness.missing.map((m) => t.missing[m])}
        action={
          !bizReady && onFixBusiness ? (
            <Button variant="outline" size="sm" onClick={onFixBusiness}>
              {t.fix}
            </Button>
          ) : null
        }
      />
      {readiness.warnings.length > 0 && (
        <ul className="space-y-1 text-sm">
          {readiness.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2">
              <AlertTriangle
                className="size-4 shrink-0 mt-0.5 text-foreground"
                aria-hidden="true"
              />
              <span>{t.warnings[w]}</span>
            </li>
          ))}
        </ul>
      )}
      {readiness.experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noExperiences}</p>
      ) : (
        <ul className="space-y-3">
          {readiness.experiences.map((e) => (
            <li key={e.id}>
              <Item
                ready={e.missing.length === 0}
                label={`${t.experienceLabel}: ${e.titlePt}`}
                status={e.missing.length === 0 ? t.ready : t.notReady}
                missing={e.missing.map((m) => t.missing[m])}
                action={
                  <>
                    {e.missing.length > 0 && onFixExperience && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFixExperience(e.id, e.missing)}
                      >
                        {t.fix}
                      </Button>
                    )}
                    {experienceActions?.(e)}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Item({
  ready,
  label,
  status,
  missing,
  action,
}: {
  ready: boolean;
  label: string;
  status: string;
  missing: string[];
  action?: ReactNode;
}) {
  const Icon = ready ? CheckCircle2 : CircleDashed;
  return (
    <div className="rounded-[10px] border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icon
          className={`size-5 shrink-0 ${ready ? "text-primary" : "text-muted-foreground"}`}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 font-medium break-words">{label}</p>
        <span className="text-xs font-semibold uppercase tracking-wide">{status}</span>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
      {missing.length > 0 && (
        <ul className="mt-2 list-disc pl-9 text-sm text-muted-foreground space-y-0.5">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
