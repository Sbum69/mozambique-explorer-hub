import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import type { FaqKind, FaqLink } from "@/lib/assistant/engine";
import {
  fetchFaq,
  fetchFeedbackStats,
  fetchUnanswered,
  markUnansweredHandled,
  saveFaq,
  splitKeywords,
  type AdminFaqEntry,
  type FaqDraft,
} from "@/lib/assistant/faq";
import { ASSISTANT_TXT } from "@/lib/page-texts";

const KINDS: FaqKind[] = ["faq", "support", "refuse", "live"];

const emptyDraft = (q = "", lang: "pt" | "en" = "pt"): FaqDraft => ({
  slug: "",
  topic: "",
  kind: "faq",
  qPt: lang === "pt" ? q : "",
  qEn: lang === "en" ? q : "",
  aPt: "",
  aEn: "",
  kwPt: [],
  kwEn: [],
  links: [],
  validate: true,
  active: true,
});

const linksToText = (links: FaqLink[]) =>
  links.map((l) => `${l.path} | ${l.pt} | ${l.en}`).join("\n");
const textToLinks = (s: string): FaqLink[] =>
  s
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p[0]?.startsWith("/") && !p[0].startsWith("//"))
    .map(([path, pt, en]) => ({ path, pt: pt || path, en: en || pt || path }));

/** Admin → Assistant: FAQ entries (versioned) and unanswered questions. */
export function AdminAssistant() {
  const { lang } = useLang();
  const t = ASSISTANT_TXT[lang];
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"faq" | "unanswered">("faq");
  const [editing, setEditing] = useState<{
    id: string | null;
    draft: FaqDraft;
    unansweredId?: string;
  } | null>(null);
  const q = useQuery({
    queryKey: ["admin-assistant"],
    queryFn: async () => {
      const [faq, unanswered, stats] = await Promise.all([
        fetchFaq(),
        fetchUnanswered(),
        fetchFeedbackStats(),
      ]);
      return { faq, unanswered, stats };
    },
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-assistant"] });
    void queryClient.invalidateQueries({ queryKey: ["assistant-faq"] });
  };

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

  const toDraft = (e: AdminFaqEntry): FaqDraft => ({
    slug: e.slug,
    topic: e.topic,
    kind: e.kind,
    qPt: e.qPt,
    qEn: e.qEn,
    aPt: e.aPt,
    aEn: e.aEn,
    kwPt: e.kwPt,
    kwEn: e.kwEn,
    links: e.links,
    validate: e.validate,
    active: e.active,
  });
  const pending = q.data.unanswered.filter((u) => !u.handled);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.adminIntro}</p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t.adminTitle}>
        <Button
          role="tab"
          aria-selected={tab === "faq"}
          size="sm"
          variant={tab === "faq" ? "default" : "outline"}
          onClick={() => setTab("faq")}
        >
          {t.tabFaq} ({q.data.faq.length})
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "unanswered"}
          size="sm"
          variant={tab === "unanswered" ? "default" : "outline"}
          onClick={() => setTab("unanswered")}
        >
          {t.tabUnanswered} ({pending.length})
        </Button>
      </div>

      {editing && (
        <EntryForm
          id={editing.id}
          initial={editing.draft}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            if (editing.unansweredId)
              await markUnansweredHandled(editing.unansweredId).catch(() => undefined);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {tab === "faq" ? (
        <div className="space-y-3">
          <Button size="sm" onClick={() => setEditing({ id: null, draft: emptyDraft() })}>
            <Plus className="size-4" aria-hidden="true" />
            {t.newEntry}
          </Button>
          <ul className="space-y-2">
            {q.data.faq.map((e) => {
              const s = q.data.stats[e.slug];
              return (
                <li key={e.id} className="rounded-[10px] border border-border p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium break-words">{lang === "pt" ? e.qPt : e.qEn}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{t[`kind_${e.kind}`]}</Badge>
                      {e.validate && <Badge variant="outline">[VALIDAR]</Badge>}
                      {!e.active && <Badge variant="outline">{t.inactive}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.slug} · {e.topic} · {t.version(e.version)}
                    {s ? ` · ${t.feedback(s.up, s.down)}` : ""}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing({ id: e.id, draft: toDraft(e) })}
                  >
                    {t.edit}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.unansweredIntro}</p>
          {!q.data.unanswered.length && <p className="text-sm">{t.noUnanswered}</p>}
          <ul className="space-y-2">
            {q.data.unanswered.map((u) => (
              <li key={u.id} className="rounded-[10px] border border-border p-3 space-y-2">
                <p className="text-sm break-words">{u.question}</p>
                <p className="text-xs text-muted-foreground">
                  {u.lang.toUpperCase()} ·{" "}
                  {new Date(u.createdAt).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB")}
                  {u.handled ? ` · ${t.handled}` : ""}
                </p>
                {!u.handled && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setEditing({
                          id: null,
                          draft: emptyDraft(u.question, u.lang),
                          unansweredId: u.id,
                        })
                      }
                    >
                      {t.createFromQuestion}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void markUnansweredHandled(u.id).then(refresh, () => toast.error(t.errSave))
                      }
                    >
                      {t.markHandled}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EntryForm({
  id,
  initial,
  onCancel,
  onSaved,
}: {
  id: string | null;
  initial: FaqDraft;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { lang } = useLang();
  const t = ASSISTANT_TXT[lang];
  const [d, setD] = useState(initial);
  const [kwPt, setKwPt] = useState(initial.kwPt.join(", "));
  const [kwEn, setKwEn] = useState(initial.kwEn.join(", "));
  const [links, setLinks] = useState(linksToText(initial.links));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof FaqDraft) => (e: { target: { value: string } }) =>
    setD((o) => ({ ...o, [k]: e.target.value }));

  const save = async () => {
    setError(null);
    if (!/^[a-z0-9-]{3,60}$/.test(d.slug)) return setError(t.errSlug);
    setBusy(true);
    try {
      await saveFaq(
        id,
        { ...d, kwPt: splitKeywords(kwPt), kwEn: splitKeywords(kwEn), links: textToLinks(links) },
        reason.trim(),
      );
      toast.success(t.saved);
      await onSaved();
    } catch {
      setError(t.errSave);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="faq-slug">{t.slug}</Label>
          <Input id="faq-slug" value={d.slug} disabled={!!id} onChange={set("slug")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="faq-topic">{t.topic}</Label>
          <Input id="faq-topic" value={d.topic} onChange={set("topic")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="faq-kind">{t.kind}</Label>
          <select
            id="faq-kind"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={d.kind}
            onChange={(e) => setD((o) => ({ ...o, kind: e.target.value as FaqKind }))}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t[`kind_${k}`]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={d.validate}
              onCheckedChange={(v) => setD((o) => ({ ...o, validate: v }))}
            />
            {t.validate}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={d.active}
              onCheckedChange={(v) => setD((o) => ({ ...o, active: v }))}
            />
            {t.active}
          </label>
        </div>
        {(["qPt", "qEn"] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={`faq-${k}`}>{t[k]}</Label>
            <Input id={`faq-${k}`} maxLength={200} value={d[k]} onChange={set(k)} />
          </div>
        ))}
        {(["aPt", "aEn"] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={`faq-${k}`}>{t[k]}</Label>
            <Textarea id={`faq-${k}`} maxLength={1200} rows={4} value={d[k]} onChange={set(k)} />
          </div>
        ))}
        <div className="space-y-1">
          <Label htmlFor="faq-kwpt">{t.kwPt}</Label>
          <Input id="faq-kwpt" value={kwPt} onChange={(e) => setKwPt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="faq-kwen">{t.kwEn}</Label>
          <Input id="faq-kwen" value={kwEn} onChange={(e) => setKwEn(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="faq-links">{t.linksLabel}</Label>
          <Textarea
            id="faq-links"
            rows={2}
            value={links}
            onChange={(e) => setLinks(e.target.value)}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="faq-reason">{t.reason}</Label>
          <Input id="faq-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy || !reason.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t.save}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.cancel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
