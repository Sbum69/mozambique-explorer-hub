import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ResendConfirmation } from "@/components/ResendConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { roleLandingTarget } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirmar email — Ekaya Explore" },
      { name: "description", content: "Confirmação da tua conta Ekaya Explore." },
      { property: "og:title", content: "Confirmar email — Ekaya Explore" },
      { property: "og:description", content: "Confirmação da tua conta Ekaya Explore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

type Status = "loading" | "confirmed" | "redirecting" | "expired" | "invalid";

const TXT = {
  pt: {
    loading: "A confirmar o teu email…",
    confirmed: "Email confirmado!",
    confirmedSub: "A tua conta está ativa. Entra com o teu email e palavra-passe.",
    redirecting: "Email confirmado! A abrir a tua conta…",
    expired: "Esta ligação expirou ou já foi usada",
    expiredSub: "Se já confirmaste a conta, podes entrar. Caso contrário, pede uma nova ligação.",
    invalid: "Ligação de confirmação inválida",
    invalidSub: "A ligação está incompleta ou não é válida. Pede uma nova ligação ou volta ao login.",
    login: "Ir para o login",
  },
  en: {
    loading: "Confirming your email…",
    confirmed: "Email confirmed!",
    confirmedSub: "Your account is active. Sign in with your email and password.",
    redirecting: "Email confirmed! Opening your account…",
    expired: "This link has expired or was already used",
    expiredSub: "If you already confirmed your account, you can sign in. Otherwise request a new link.",
    invalid: "Invalid confirmation link",
    invalidSub: "The link is incomplete or not valid. Request a new link or go back to login.",
    login: "Go to login",
  },
};

const EMAIL_OTP_TYPES = ["signup", "email", "invite", "magiclink", "email_change"] as const;
type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function AuthCallbackPage() {
  const { lang } = useLang();
  const t = TXT[lang];
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode / re-render guard: process once.
    ran.current = true;

    const run = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorCode = search.get("error_code") ?? hash.get("error_code");
      const hasError = !!(search.get("error") ?? hash.get("error") ?? errorCode);
      const code = search.get("code");
      const tokenHash = search.get("token_hash");
      const type = search.get("type") as EmailOtpType | null;
      const hasHashTokens = hash.has("access_token");

      // Remove tokens/codes from the address bar so a refresh never re-processes them.
      window.history.replaceState(null, "", window.location.pathname);

      let confirmedNow = false;
      if (hasError) {
        setStatus(errorCode === "otp_expired" || errorCode === "access_denied" ? "expired" : "invalid");
        return;
      }
      if (tokenHash && type && EMAIL_OTP_TYPES.includes(type)) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) return setStatus(/expired|invalid/i.test(error.message) ? "expired" : "invalid");
        confirmedNow = true;
      } else if (code) {
        const { data: existing } = await supabase.auth.getSession();
        if (!existing.session) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          // The PKCE verifier lives in the browser that signed up: another device confirms
          // the email server-side but cannot open a session here.
          if (error) {
            confirmedNow = false;
            if (/code verifier|both auth code/i.test(error.message)) return setStatus("confirmed");
            return setStatus("expired");
          }
        }
        confirmedNow = true;
      } else if (hasHashTokens) {
        confirmedNow = true; // Session is established by the client from the URL fragment.
      }

      // Supabase Auth is the only source of truth: re-validate the user server-side.
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user && user.email_confirmed_at) {
        setStatus("redirecting");
        navigate({ to: await roleLandingTarget(user.id), replace: true });
        return;
      }
      setStatus(confirmedNow ? "confirmed" : "invalid");
    };

    void run().catch(() => setStatus("invalid"));
  }, [navigate]);

  const busy = status === "loading" || status === "redirecting";
  const ok = status === "confirmed" || status === "redirecting";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-background via-card to-accent/30">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        {busy && <Loader2 className="mx-auto size-12 animate-spin text-primary" />}
        {!busy && ok && <CheckCircle2 className="mx-auto size-14 text-success" />}
        {!busy && !ok && <AlertTriangle className="mx-auto size-14 text-destructive" />}

        <h1 className="text-2xl font-bold tracking-tight">
          {status === "loading" && t.loading}
          {status === "redirecting" && t.redirecting}
          {status === "confirmed" && t.confirmed}
          {status === "expired" && t.expired}
          {status === "invalid" && t.invalid}
        </h1>
        {status === "confirmed" && <p className="text-muted-foreground text-sm">{t.confirmedSub}</p>}
        {status === "expired" && <p className="text-muted-foreground text-sm">{t.expiredSub}</p>}
        {status === "invalid" && <p className="text-muted-foreground text-sm">{t.invalidSub}</p>}

        {(status === "expired" || status === "invalid") && <ResendConfirmation />}
        {!busy && (
          <Button asChild size="lg" className="w-full">
            <Link to="/login" replace>{t.login}</Link>
          </Button>
        )}
      </Card>
    </div>
  );
}
