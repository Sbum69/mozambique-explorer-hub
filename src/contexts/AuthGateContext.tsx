import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, UserPlus, Compass, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { authReturnFor } from "@/lib/auth";

interface AuthGateContextValue {
  /**
   * Returns true when the visitor has a real account and the action may proceed.
   * When the visitor is a guest (or not signed in) it opens the "account needed"
   * dialog and returns false.
   */
  requireAccount: (feature?: string) => boolean;
  /** True when the current visitor cannot save personal data. */
  needsAccount: boolean;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | null>(null);

  const requireAccount = useCallback(
    (featureLabel?: string) => {
      if (isAuthenticated) return true;
      setFeature(featureLabel ?? null);
      setOpen(true);
      return false;
    },
    [isAuthenticated],
  );

  const pt = lang === "pt";
  // After signing in, come back to this page (only allow-listed paths).
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const back = authReturnFor(pathname);
  const returnSearch = back ? { redirect: back } : {};

  return (
    <AuthGateContext.Provider value={{ requireAccount, needsAccount: !isAuthenticated }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-6" />
            </div>
            <DialogTitle className="text-center">
              {pt ? "Esta funcionalidade requer uma conta." : "This feature requires an account."}
            </DialogTitle>
            <DialogDescription className="text-center">
              {feature ? `${feature} · ` : ""}
              {pt
                ? "Entra ou cria uma conta para continuar."
                : "Sign in or create an account to continue."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-2">
            <Button asChild className="gap-2">
              <Link to="/login" search={returnSearch} onClick={() => setOpen(false)}>
                <LogIn className="size-4" />
                {pt ? "Entrar" : "Sign in"}
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/signup" search={returnSearch} onClick={() => setOpen(false)}>
                <UserPlus className="size-4" />
                {pt ? "Criar conta" : "Create account"}
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => setOpen(false)}>
              <Compass className="size-4" />
              {pt ? "Continuar a explorar" : "Keep exploring"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthGateProvider");
  return ctx;
}
