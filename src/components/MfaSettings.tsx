import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import {
  getAal,
  getVerifiedTotp,
  normaliseCode,
  removeTotp,
  startTotpEnrollment,
  verifyCode,
  type TotpEnrollment,
} from "@/lib/mfa";
import { MFA_TXT } from "@/lib/page-texts";

export const MFA_QUERY_KEY = ["mfa-state"] as const;

/** Settings → Security: turn two-step verification (TOTP) on or off. */
export function MfaSettings({ required }: { required: boolean }) {
  const { lang } = useLang();
  const t = MFA_TXT[lang];
  const { authUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [askConfirm, confirmDialog] = useConfirm();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: [...MFA_QUERY_KEY, authUser?.id],
    queryFn: async () => ({ factor: await getVerifiedTotp(), aal: await getAal() }),
    enabled: !!authUser,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: MFA_QUERY_KEY });

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnrollment(await startTotpEnrollment());
      setCode("");
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  const confirmEnrollment = async () => {
    if (!enrollment) return;
    const c = normaliseCode(code);
    if (!c) {
      setError(t.errCode);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyCode(enrollment.factorId, c);
      setEnrollment(null);
      setCode("");
      toast.success(t.enabled);
      await refresh();
      // The session is now aal2: admin data can be read again.
      await queryClient.invalidateQueries();
    } catch {
      setError(t.errWrong);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    const factor = q.data?.factor;
    if (!factor) return;
    const answer = await askConfirm({
      title: t.disableTitle,
      description: t.disableBody,
      confirmLabel: t.disable,
      destructive: true,
    });
    if (!answer) return;
    setBusy(true);
    setError(null);
    try {
      await removeTotp(factor.id);
      toast.success(t.disabled);
      await refresh();
    } catch {
      setError(q.data?.aal.current === "aal2" ? t.errGeneric : t.errDisableAal);
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      toast.success(t.copied);
    } catch {
      setError(t.errGeneric);
    }
  };

  const on = !!q.data?.factor;
  return (
    <div className="space-y-4">
      {confirmDialog}
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      {required && (
        <p role="note" className="rounded-md border border-foreground/40 p-3 text-sm">
          {t.required}
        </p>
      )}

      {q.isLoading ? (
        <Loader2 className="size-5 animate-spin text-primary" aria-label={t.verifying} />
      ) : q.isError ? (
        <div className="space-y-2">
          <p role="alert" className="text-destructive text-sm">
            {t.errGeneric}
          </p>
          <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
            {t.retry}
          </Button>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 font-medium">
            {on ? (
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            ) : (
              <ShieldOff className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
            {on ? t.statusOn : t.statusOff}
          </p>

          {on && isAdmin && q.data?.aal.current === "aal2" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin">{t.openAdmin}</Link>
            </Button>
          )}

          {!on && !enrollment && (
            <Button onClick={() => void begin()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.enable}
            </Button>
          )}

          {enrollment && (
            <div className="space-y-4 rounded-[10px] border border-border p-4">
              <p className="text-sm">{t.step1}</p>
              {/* Fixed white behind the QR in both themes: scanners need dark modules on light. */}
              <img
                src={enrollment.qr}
                alt={t.qrAlt}
                width={192}
                height={192}
                className="size-48 rounded-md border border-border bg-white p-2"
              />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t.manual}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all rounded-md border border-border px-2 py-1 text-sm">
                    {enrollment.secret}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => void copySecret()}>
                    <Copy className="size-4" aria-hidden="true" />
                    {t.copy}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm">{t.step2}</p>
                <Label htmlFor="mfa-enroll-code">{t.codeLabel}</Label>
                <Input
                  id="mfa-enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11 max-w-40 tracking-widest"
                  aria-invalid={!!error}
                  aria-describedby={error ? "mfa-error" : undefined}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void confirmEnrollment()} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {busy ? t.verifying : t.confirm}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnrollment(null);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          )}

          {on && (
            <Button variant="outline" size="sm" onClick={() => void disable()} disabled={busy}>
              {t.disable}
            </Button>
          )}
        </>
      )}

      {error && (
        <p id="mfa-error" role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
