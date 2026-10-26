import { useId, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BROADCAST_LIMITS,
  adminErrorText,
  broadcastProblems,
  fetchBroadcasts,
  sendBroadcast,
  type BroadcastAudience,
  type BroadcastInput,
} from "@/lib/admin";
import { BROADCASTS_TXT } from "@/lib/admin-texts";
import { listPlatformUsers } from "@/lib/platform-users.functions";

const AUDIENCES: BroadcastAudience[] = ["user", "business_owners", "all"];
const EMPTY: BroadcastInput = {
  audience: "all",
  userId: null,
  titlePt: "",
  titleEn: "",
  bodyPt: "",
  bodyEn: "",
  link: "",
};

/** Admin notices: one user, every business owner or everyone; PT and EN; recorded with the sender. */
export function AdminBroadcastsModal({ onClose }: { onClose: () => void }) {
  const { authUser } = useAuth();
  const { lang } = useLang();
  const t = BROADCASTS_TXT[lang];
  const id = useId();
  const qc = useQueryClient();
  const [confirm, confirmDialog] = useConfirm();
  const [form, setForm] = useState<BroadcastInput>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userQuery, setUserQuery] = useState("");

  const history = useQuery({
    queryKey: ["admin-broadcasts", authUser?.id],
    queryFn: fetchBroadcasts,
    enabled: !!authUser?.id,
  });
  const users = useQuery({
    queryKey: ["admin-broadcast-users", authUser?.id],
    queryFn: () => listPlatformUsers(),
    enabled: !!authUser?.id && form.audience === "user",
    staleTime: 5 * 60 * 1000,
  });

  const matches = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return [];
    return (users.data ?? []).filter((u) => u.email.toLowerCase().includes(q)).slice(0, 8);
  }, [users.data, userQuery]);
  const chosen = (users.data ?? []).find((u) => u.id === form.userId);

  const problems = broadcastProblems(form);
  const show = (p: (typeof problems)[number]) => touched && problems.includes(p);
  const set = <K extends keyof BroadcastInput>(k: K, v: BroadcastInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setTouched(true);
    if (problems.length) return;
    const who =
      form.audience === "user" ? (chosen?.email ?? "") : t.audience[form.audience].toLowerCase();
    if (
      !(await confirm({
        title: t.confirmTitle,
        description: t.confirmText(who),
        confirmLabel: t.send,
      }))
    )
      return;
    setBusy(true);
    try {
      const n = await sendBroadcast(form);
      toast.success(t.sent(n));
      setForm(EMPTY);
      setUserQuery("");
      setTouched(false);
      await qc.invalidateQueries({ queryKey: ["admin-broadcasts", authUser?.id] });
    } catch (e) {
      toast.error(adminErrorText(e instanceof Error ? e.message : "", lang));
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });
  const counter = (v: string, max: number) => `${v.trim().length}/${max}`;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {confirmDialog}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" aria-hidden="true" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <section className="space-y-4" aria-labelledby={`${id}-new`}>
          <h3 id={`${id}-new`} className="font-semibold">
            {t.newNotice}
          </h3>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">{t.audienceLabel}</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {AUDIENCES.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  role="radio"
                  aria-checked={form.audience === a}
                  variant={form.audience === a ? "default" : "outline"}
                  onClick={() => set("audience", a)}
                >
                  {t.audience[a]}
                </Button>
              ))}
            </div>
          </fieldset>

          {form.audience === "user" && (
            <div className="space-y-2">
              <label htmlFor={`${id}-email`} className="text-sm font-medium">
                {t.userLabel}
              </label>
              {chosen ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="font-medium">{chosen.displayName}</span>
                  <span className="text-muted-foreground break-all">{chosen.email}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => set("userId", null)}
                  >
                    {t.change}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id={`${id}-email`}
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder={t.userSearch}
                      className="pl-9"
                      aria-invalid={show("user")}
                    />
                  </div>
                  {users.isPending && userQuery && (
                    <p className="text-xs text-muted-foreground" aria-busy="true">
                      {t.loadingUsers}
                    </p>
                  )}
                  {users.isError && (
                    <p role="alert" className="text-xs text-destructive">
                      {t.usersError}
                    </p>
                  )}
                  {matches.length > 0 && (
                    <ul className="rounded-md border divide-y" aria-label={t.userLabel}>
                      {matches.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => set("userId", u.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                          >
                            <span className="font-medium">{u.displayName}</span>{" "}
                            <span className="text-muted-foreground break-all">{u.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {userQuery.trim() && !users.isPending && !users.isError && !matches.length && (
                    <p className="text-xs text-muted-foreground">{t.noUser}</p>
                  )}
                  {show("user") && <p className="text-xs text-destructive">{t.pickUser}</p>}
                </>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["titlePt", t.titlePt, BROADCAST_LIMITS.title],
                ["titleEn", t.titleEn, BROADCAST_LIMITS.title],
              ] as const
            ).map(([k, label, max]) => (
              <div key={k} className="space-y-1.5">
                <label htmlFor={`${id}-${k}`} className="text-sm font-medium">
                  {label}
                </label>
                <Input
                  id={`${id}-${k}`}
                  value={form[k]}
                  maxLength={max}
                  onChange={(e) => set(k, e.target.value)}
                  aria-invalid={show(k)}
                  aria-describedby={`${id}-${k}-count`}
                />
                <p
                  id={`${id}-${k}-count`}
                  className={show(k) ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                >
                  {show(k) ? t.lengthRule(BROADCAST_LIMITS.min, max) : counter(form[k], max)}
                </p>
              </div>
            ))}
            {(
              [
                ["bodyPt", t.bodyPt],
                ["bodyEn", t.bodyEn],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <label htmlFor={`${id}-${k}`} className="text-sm font-medium">
                  {label}
                </label>
                <Textarea
                  id={`${id}-${k}`}
                  rows={4}
                  value={form[k]}
                  maxLength={BROADCAST_LIMITS.body}
                  onChange={(e) => set(k, e.target.value)}
                  aria-invalid={show(k)}
                  aria-describedby={`${id}-${k}-count`}
                />
                <p
                  id={`${id}-${k}-count`}
                  className={show(k) ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                >
                  {show(k)
                    ? t.lengthRule(BROADCAST_LIMITS.min, BROADCAST_LIMITS.body)
                    : counter(form[k], BROADCAST_LIMITS.body)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-link`} className="text-sm font-medium">
              {t.link}
            </label>
            <Input
              id={`${id}-link`}
              value={form.link}
              placeholder="/news-alerts"
              onChange={(e) => set("link", e.target.value)}
              aria-invalid={show("link")}
              aria-describedby={`${id}-link-hint`}
            />
            <p
              id={`${id}-link-hint`}
              className={
                show("link") ? "text-xs text-destructive" : "text-xs text-muted-foreground"
              }
            >
              {t.linkHint}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t.preview}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["pt", "en"] as const).map((l) => {
                const title = l === "pt" ? form.titlePt : form.titleEn;
                const body = l === "pt" ? form.bodyPt : form.bodyEn;
                return (
                  <div key={l} className="rounded-lg border bg-muted/40 p-3">
                    <Badge variant="outline" className="mb-2">
                      {l.toUpperCase()}
                    </Badge>
                    <p className="font-semibold break-words">{title.trim() || "—"}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                      {body.trim() || "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void submit()} disabled={busy}>
              <Send className="size-4" aria-hidden="true" />
              {busy ? t.sending : t.send}
            </Button>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4" aria-labelledby={`${id}-history`}>
          <h3 id={`${id}-history`} className="font-semibold">
            {t.history}
          </h3>
          {history.isPending ? (
            <p className="text-sm text-muted-foreground" aria-busy="true">
              {t.loading}
            </p>
          ) : history.isError ? (
            <div role="alert" className="text-sm space-y-2">
              <p>{t.historyError}</p>
              <Button size="sm" variant="outline" onClick={() => void history.refetch()}>
                {t.retry}
              </Button>
            </div>
          ) : !history.data?.length ? (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <ul className="divide-y">
              {history.data.map((b) => (
                <li key={b.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium break-words">
                      {lang === "pt" ? b.titlePt : b.titleEn}
                    </p>
                    <Badge variant="secondary">
                      {b.audience === "user" && b.target
                        ? `${t.audience.user}: ${b.target}`
                        : t.audience[b.audience]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmt(b.createdAt)} · {t.by} {b.sender ?? "—"} · {t.recipients(b.recipients)}
                    {b.link ? ` · ${b.link}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
