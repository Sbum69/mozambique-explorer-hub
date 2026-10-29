import { useState, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { getAuthCallbackUrl } from "@/lib/app-url";

const COOLDOWN_MS = 60_000;

const TXT = {
  pt: {
    title: "Reenviar email de confirmação",
    hint: "Indica o email com que te registaste.",
    send: "Reenviar",
    sending: "A enviar…",
    invalid: "Introduz um email válido.",
    done: "Se existir uma conta por confirmar com este email, enviámos uma nova ligação. Verifica também o spam.",
    rate: "Demasiados pedidos. Aguarda alguns minutos e tenta novamente.",
    error: "Não foi possível enviar agora. Tenta novamente mais tarde.",
    wait: "Aguarda um minuto antes de pedir outro email.",
  },
  en: {
    title: "Resend confirmation email",
    hint: "Enter the email you signed up with.",
    send: "Resend",
    sending: "Sending…",
    invalid: "Enter a valid email.",
    done: "If an unconfirmed account exists for this email, we sent a new link. Check your spam folder too.",
    rate: "Too many requests. Wait a few minutes and try again.",
    error: "Could not send right now. Please try again later.",
    wait: "Wait a minute before requesting another email.",
  },
};

export function ResendConfirmation({ initialEmail = "" }: { initialEmail?: string }) {
  const { lang } = useLang();
  const t = TXT[lang];
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [lastSent, setLastSent] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState("error");
      setMsg(t.invalid);
      return;
    }
    if (Date.now() - lastSent < COOLDOWN_MS) {
      setState("error");
      setMsg(t.wait);
      return;
    }
    setState("loading");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: value,
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    if (error && (error.status === 429 || /rate limit|security purposes/i.test(error.message))) {
      setState("error");
      setMsg(t.rate);
      return;
    }
    if (error && (error.status ?? 500) >= 500) {
      setState("error");
      setMsg(t.error);
      return;
    }
    // Same neutral answer whether or not the account exists.
    setLastSent(Date.now());
    setState("done");
    setMsg(t.done);
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-xl border bg-card p-4 text-left"
      noValidate
    >
      <p className="font-semibold text-sm flex items-center gap-2">
        <MailCheck className="size-4 text-primary" /> {t.title}
      </p>
      <Label htmlFor="resend-email" className="text-xs text-muted-foreground font-normal">
        {t.hint}
      </Label>
      <div className="flex gap-2">
        <Input
          id="resend-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="h-10"
        />
        <Button type="submit" disabled={state === "loading"} className="h-10 shrink-0">
          {state === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t.sending}
            </>
          ) : (
            t.send
          )}
        </Button>
      </div>
      {msg && (
        <p
          role="status"
          className={`text-xs ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {msg}
        </p>
      )}
    </form>
  );
}
