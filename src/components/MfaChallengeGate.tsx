import { useState, type FormEvent } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { getAal, getVerifiedTotp, needsCode, normaliseCode, verifyCode } from "@/lib/mfa";
import { MFA_TXT } from "@/lib/page-texts";

/**
 * After a password sign-in (or on a restored session), accounts with two-step verification must
 * enter the code before using the app. Covers the login step and every page in one place.
 */
export function MfaChallengeGate() {
  const { authUser, logout } = useAuth();
  const { lang } = useLang();
  const t = MFA_TXT[lang];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uid = authUser?.id;
  const key = ["mfa-challenge", uid];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => needsCode(await getAal()),
    enabled: !!uid,
    staleTime: Infinity,
  });

  if (!uid || q.data !== true) return null;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const c = normaliseCode(code);
    if (!c) {
      setError(t.errCode);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const factor = await getVerifiedTotp();
      if (!factor) throw new Error("NO_FACTOR");
      await verifyCode(factor.id, c);
      setCode("");
      queryClient.setQueryData(key, false);
      // Session is now aal2: refetch everything that depends on it (admin data, MFA state).
      await queryClient.invalidateQueries();
      // Sent to Settings by the admin guard (next=/admin), possibly while the code was being
      // checked: read where we are now, then go back to the admin panel.
      const here = router.state.location;
      if ((here.search as { next?: string }).next === "/admin")
        void navigate({ to: "/admin", replace: true });
    } catch {
      setError(t.errWrong);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    void logout().then(() => navigate({ to: "/login", replace: true }));
  };

  return (
    <AlertDialog open>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" aria-hidden="true" />
              {t.promptTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{t.promptBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="mfa-code">{t.codeLabel}</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 max-w-40 tracking-widest"
              aria-invalid={!!error}
              aria-describedby={error ? "mfa-code-error" : undefined}
            />
            {error && (
              <p id="mfa-code-error" role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={signOut}>
              {t.signOut}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? t.verifying : t.confirm}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
