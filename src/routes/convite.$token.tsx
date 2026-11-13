import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { claimInvite, previewInvite } from "@/lib/content";
import { CONTENT_TXT, LEGAL_TXT, SIGNUP_TXT } from "@/lib/page-texts";

/** Owner invite: the person signs in and takes over the business the admin imported. */
export const Route = createFileRoute("/convite/$token")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Convite — EKAYA" }, { name: "robots", content: "noindex" }],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { lang } = useLang();
  const t = CONTENT_TXT[lang];
  const { authUser, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const q = useQuery({
    queryKey: ["business-invite", token, authUser?.id],
    queryFn: () => previewInvite(token),
    enabled: !!authUser,
    retry: false,
  });

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await claimInvite(token);
      await refreshProfile();
      setDone(true);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setError(
        /USER_HAS_BUSINESS/.test(m)
          ? t.claimHasBusiness
          : /USER_IS_ADMIN/.test(m)
            ? t.claimAdmin
            : /INVITE_INVALID|ALREADY_OWNED/.test(m)
              ? t.claimInvalid
              : t.errGeneric,
      );
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode;
  if (isLoading)
    body = <Loader2 className="size-6 animate-spin text-primary" aria-label={t.loading} />;
  else if (!authUser)
    body = (
      <>
        <p>{t.claimLogin}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/login">{SIGNUP_TXT[lang].signIn}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup">{SIGNUP_TXT[lang].create}</Link>
          </Button>
        </div>
      </>
    );
  else if (q.isLoading)
    body = <Loader2 className="size-6 animate-spin text-primary" aria-label={t.loading} />;
  else if (q.isError || !q.data) body = <p role="alert">{t.claimInvalid}</p>;
  else if (done)
    body = (
      <>
        <p role="status">{t.claimDone}</p>
        <Button
          onClick={() => void navigate({ to: "/business-dashboard", search: { status: "all" } })}
        >
          {t.goDashboard}
        </Button>
      </>
    );
  else
    body = (
      <>
        <p>{t.claimBody(q.data.businessName)}</p>
        <Button onClick={() => void accept()} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t.claimAccept}
        </Button>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label={LEGAL_TXT[lang].back}>
              <Link to="/home">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="min-w-0 truncate font-bold text-base sm:text-lg ml-1">{t.claimTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-10">
        <Card className="p-6 space-y-4">
          <Store className="size-8 text-primary" aria-hidden="true" />
          {body}
        </Card>
      </main>
    </div>
  );
}
