import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { roleLandingTarget } from "@/lib/auth";
import { RESET_TXT } from "@/lib/page-texts";
import {
  RECOVERY_FLAG,
  newPasswordError,
  newPasswordProblem,
  type NewPasswordError,
} from "@/lib/password-reset";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Nova palavra-passe — Ekaya Explore" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "expired" | "done";

function ResetPasswordPage() {
  const { lang } = useLang();
  const t = RESET_TXT[lang];
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<NewPasswordError | null>(null);

  // Only reachable with the session opened by the recovery link (see /auth/callback).
  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => setStatus(data.session ? "ready" : "expired"));
  }, []);

  const message: Record<NewPasswordError, string> = {
    short: t.errShort,
    mismatch: t.errMismatch,
    weak: t.errWeak,
    same: t.errSame,
    expired: t.expired,
    network: t.errNetwork,
    generic: t.errGeneric,
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = newPasswordProblem(password, confirm);
    setError(problem);
    if (problem) return;
    setBusy(true);
    const { data, error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    const kind = newPasswordError(err);
    if (kind === "expired") return setStatus("expired");
    if (kind) return setError(kind);
    try {
      localStorage.removeItem(RECOVERY_FLAG);
    } catch {
      // ignore
    }
    setStatus("done");
    if (data.user) navigate({ to: await roleLandingTarget(data.user.id), replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-background via-card to-accent/30">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeToggle />
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md p-8 space-y-5">
        {status === "checking" && (
          <div className="text-center space-y-3" aria-busy="true">
            <Loader2 className="mx-auto size-12 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t.checking}</p>
          </div>
        )}
        {status === "done" && (
          <div role="status" className="text-center space-y-3">
            <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden="true" />
            <p className="font-semibold">{t.done}</p>
          </div>
        )}
        {status === "expired" && (
          <div role="alert" className="text-center space-y-3">
            <AlertTriangle className="mx-auto size-14 text-destructive" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">{t.expiredTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.expired}</p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">{t.requestNew}</Link>
            </Button>
          </div>
        )}
        {status === "ready" && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground items-center justify-center">
                <KeyRound className="size-7" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {(
                [
                  ["new-password", t.password, password, setPassword],
                  ["confirm-password", t.confirm, confirm, setConfirm],
                ] as const
              ).map(([id, label, value, set]) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id={id}
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="pl-10 pr-10 h-11"
                      aria-invalid={!!error}
                      aria-describedby={error ? "reset-error" : undefined}
                    />
                    {id === "new-password" && (
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        aria-label={show ? t.hide : t.show}
                        aria-pressed={show}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded"
                      >
                        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {error && (
                <p id="reset-error" role="alert" className="text-sm text-destructive">
                  {message[error]}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full h-11" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {busy ? t.saving : t.save}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
