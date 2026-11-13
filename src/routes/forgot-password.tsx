import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Mail, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getAuthCallbackUrl } from "@/lib/app-url";
import { FORGOT_TXT } from "@/lib/page-texts";
import { RECOVERY_FLAG, isValidEmail, resetRequestError } from "@/lib/password-reset";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Esqueci-me da palavra-passe — EKAYA" },
      { name: "description", content: "Pede uma ligação para definir uma nova palavra-passe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { lang } = useLang();
  const t = FORGOT_TXT[lang];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError(t.errEmail);
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthCallbackUrl(),
    });
    setBusy(false);
    const kind = resetRequestError(err);
    if (kind) {
      setError(
        { rate: t.errRate, email: t.errEmail, network: t.errNetwork, generic: t.errGeneric }[kind],
      );
      return;
    }
    // UI marker only (no account data): lets the callback recognise a ?code= link as a recovery.
    try {
      localStorage.setItem(RECOVERY_FLAG, String(Date.now()));
    } catch {
      // Storage blocked: implicit/token-hash links still carry type=recovery.
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeToggle />
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md p-8 space-y-5">
        {sent ? (
          <div role="status" className="text-center space-y-3">
            <MailCheck className="mx-auto size-14 text-success" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">{t.sentTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.sent}</p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex size-14 rounded-[10px] bg-primary text-primary-foreground items-center justify-center">
                <KeyRound className="size-7" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">{t.email}</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    aria-invalid={!!error}
                    aria-describedby={error ? "forgot-error" : undefined}
                  />
                </div>
                {error && (
                  <p id="forgot-error" role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" size="lg" className="w-full h-11" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {busy ? t.sending : t.send}
              </Button>
            </form>
          </>
        )}
        <p className="text-center text-sm">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t.back}
          </Link>
        </p>
      </Card>
    </div>
  );
}
