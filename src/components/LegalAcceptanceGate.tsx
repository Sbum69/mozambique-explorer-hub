import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { LEGAL_TXT } from "@/lib/page-texts";

/** Pages that must stay readable while the prompt is pending. */
const OPEN_PATHS = new Set(["/terms", "/privacy"]);

/** True when the signed-in person accepted the Terms and the Privacy Policy versions in force. */
async function hasAcceptedCurrent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("document, version")
    .eq("user_id", userId)
    .in("version", [LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy]);
  if (error) throw new Error(error.message);
  const has = (doc: "terms" | "privacy") =>
    (data ?? []).some((r) => r.document === doc && r.version === LEGAL_VERSIONS[doc]);
  return has("terms") && has("privacy");
}

/**
 * Accounts created before LEGAL-1 (or before a new version of the texts) must accept the
 * documents in force before using the app. Sign-up records the acceptance on the server.
 */
export function LegalAcceptanceGate() {
  const { authUser, logout } = useAuth();
  const { lang } = useLang();
  const t = LEGAL_TXT[lang];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const uid = authUser?.id;
  const key = ["legal-acceptance", uid, LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy];
  const q = useQuery({
    queryKey: key,
    queryFn: () => hasAcceptedCurrent(uid as string),
    enabled: !!uid,
    staleTime: Infinity,
  });

  if (!uid || OPEN_PATHS.has(path) || q.isLoading || q.data === true) return null;

  const accept = async () => {
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase.rpc("accept_legal_documents", {
      _terms_version: LEGAL_VERSIONS.terms,
      _privacy_version: LEGAL_VERSIONS.privacy,
    });
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    queryClient.setQueryData(key, true);
  };

  const signOut = () => {
    void logout().then(() => navigate({ to: "/login", replace: true }));
  };

  return (
    <AlertDialog open>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            {t.promptTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>{q.isError ? t.errLoad : t.promptBody}</AlertDialogDescription>
        </AlertDialogHeader>

        {!q.isError && (
          <ul className="space-y-1.5 text-sm">
            {(
              [
                ["/terms", t.readTerms],
                ["/privacy", t.readPrivacy],
              ] as const
            ).map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold underline underline-offset-2"
                >
                  {label} <span className="sr-only">{t.opensNewTab}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {saveError && (
          <p role="alert" className="text-destructive text-sm">
            {t.errAccept}
          </p>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={signOut}>
            {t.signOut}
          </Button>
          {q.isError ? (
            <Button onClick={() => void q.refetch()}>{t.retry}</Button>
          ) : (
            <Button onClick={() => void accept()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {saving ? t.accepting : t.accept}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
