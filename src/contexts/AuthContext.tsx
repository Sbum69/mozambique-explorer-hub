import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { parseAuthReturn, type AppRole, type AuthReturnPath } from "@/lib/auth";
import { getAuthCallbackUrl } from "@/lib/app-url";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { useLang, type Lang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export type UserRole = "guest" | "user" | "admin" | "business-small" | "business-large";

export interface UserPreferences {
  province?: string;
  /** Province codes (provinces.code) chosen by the tourist — several are allowed. */
  provinces?: string[];
  durationDays?: number;
  interests?: string[];
}

/** Points, levels and visits are read from the database (points_ledger, destination_visits), never kept here. */
export interface AppUser {
  username: string;
  role: UserRole;
  displayName: string;
  email?: string;
  /** Public URL of the profile photo (avatars bucket), if any. */
  avatarUrl?: string;
  phone?: string;
  preferences?: UserPreferences;
}

interface AuthContextValue {
  user: AppUser | null;
  authUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Set when the signed-in user's profile/roles could not be read; the app is blocked until a retry succeeds. */
  loadError: string | null;
  retryLoad: () => void;
  /** Re-reads profile, roles and preferences after the user changed them (no loading screen). */
  refreshProfile: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; role?: UserRole; unconfirmed?: boolean }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  setPreferences: (prefs: UserPreferences) => Promise<void>;
  needsOnboarding: boolean;
  registerUser: (data: {
    username: string;
    password: string;
    displayName: string;
    email: string;
    /** Allow-listed page to open after the email is confirmed (kept in the account metadata). */
    returnTo?: AuthReturnPath;
    /** The person ticked the Terms/Privacy box; the server records it with the versions in force. */
    acceptedLegal: boolean;
  }) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;

  isGuest: boolean;
  isUser: boolean;
  isAdmin: boolean;
  isBusinessSmall: boolean;
  isBusinessLarge: boolean;
  isBusiness: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
/** Session-only flag: guest mode is a browsing mode, never an account. */
const GUEST_MODE_KEY = "ekaya.guest-mode";
/** Keys written by older builds that kept user state in the browser; removed on load. */
const LEGACY_LOCAL_PREFIX = "ekaya.user-state:";
const LEGACY_LOCAL_KEYS = ["ekaya.game.logs", "ekaya.treasure.stops"];

const GUEST_USER: AppUser = {
  username: "Convidado",
  role: "guest",
  displayName: "Convidado",
};

function clearLegacyLocalState() {
  try {
    const stale = Object.keys(localStorage).filter(
      (key) => key.startsWith(LEGACY_LOCAL_PREFIX) || LEGACY_LOCAL_KEYS.includes(key),
    );
    for (const key of stale) localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function isGuestModeActive() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(GUEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

const rolePriority: AppRole[] = ["admin", "business_large", "business_small", "tourist"];

function toLegacyRole(roles: AppRole[]): UserRole {
  const role = rolePriority.find((candidate) => roles.includes(candidate)) ?? "tourist";
  if (role === "business_large") return "business-large";
  if (role === "business_small") return "business-small";
  if (role === "tourist") return "user";
  return role;
}

const AUTH_ERRORS = {
  credentials: ["Email ou palavra-passe incorretos.", "Incorrect email or password."],
  unconfirmed: [
    "Confirma primeiro o teu email para entrar.",
    "Confirm your email before signing in.",
  ],
  registered: ["Este email já está registado.", "This email is already registered."],
  email: ["Introduz um email válido.", "Enter a valid email."],
  shortAndPwned: [
    "Usa pelo menos 6 caracteres e escolhe uma palavra-passe diferente: esta aparece em fugas de dados conhecidas.",
    "Use at least 6 characters and choose a different password: this one appears in known data leaks.",
  ],
  pwned: [
    "Esta palavra-passe aparece em fugas de dados conhecidas. Escolhe outra (podes juntar palavras ou números que só tu saibas).",
    "This password appears in known data leaks. Choose another (you can combine words or numbers only you know).",
  ],
  short: [
    "A palavra-passe precisa de pelo menos 6 caracteres.",
    "The password needs at least 6 characters.",
  ],
  network: [
    "Sem ligação. Verifica a internet e tenta novamente.",
    "No connection. Check the internet and try again.",
  ],
  generic: ["Não foi possível concluir. Tenta novamente.", "Could not complete. Please try again."],
} as const;

function authErrorMessage(message: string, lang: Lang = "pt") {
  const pick = (k: keyof typeof AUTH_ERRORS) => AUTH_ERRORS[k][lang === "pt" ? 0 : 1];
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return pick("credentials");
  if (normalized.includes("email not confirmed")) return pick("unconfirmed");
  if (normalized.includes("already registered") || normalized.includes("already been registered"))
    return pick("registered");
  if (normalized.includes("valid email")) return pick("email");
  const tooShort =
    normalized.includes("at least 6 characters") ||
    (normalized.includes("password") && normalized.includes("characters"));
  const pwned =
    normalized.includes("known to be weak") ||
    normalized.includes("easy to guess") ||
    normalized.includes("pwned");
  if (tooShort && pwned) return pick("shortAndPwned");
  if (pwned) return pick("pwned");
  if (tooShort) return pick("short");
  if (normalized.includes("network") || normalized.includes("fetch")) return pick("network");
  return pick("generic");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { t, lang } = useLang();

  /** Resolves to the user's role, or null when there is no session or the account could not be read. */
  const loadAuthenticatedUser = useCallback(async (currentAuthUser: User | null) => {
    setAuthUser(currentAuthUser);
    setLoadError(null);
    if (!currentAuthUser) {
      // Anyone without a session browses as a guest (public content only; RLS still applies).
      setUser(GUEST_USER);
      setIsLoading(false);
      return null;
    }
    try {
      sessionStorage.removeItem(GUEST_MODE_KEY);
    } catch {
      /* ignore */
    }

    let results;
    try {
      results = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, phone, locale, province, duration_days, interests")
          .eq("id", currentAuthUser.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", currentAuthUser.id),
        supabase
          .from("profile_provinces")
          .select("provinces(code)")
          .eq("profile_id", currentAuthUser.id),
      ]);
    } catch (e) {
      results = null;
      setLoadError(e instanceof Error ? e.message : String(e));
    }
    const failed = results?.find((r) => r.error)?.error;
    if (!results || failed) {
      // Never guess: a failed read must not demote the role to tourist or send the user to onboarding.
      if (failed) setLoadError(failed.message);
      setUser(null);
      setIsLoading(false);
      return null;
    }
    const [{ data: profile }, { data: roleRows }, { data: provinceRows }] = results;
    const provinceCodes = (provinceRows ?? [])
      .map((row) => {
        const rel = row.provinces as { code: string } | { code: string }[] | null;
        const one = Array.isArray(rel) ? rel[0] : rel;
        return one?.code ?? null;
      })
      .filter((code): code is string => !!code);
    const roles = (roleRows ?? []).map(({ role }) => role) as AppRole[];

    const email = currentAuthUser.email ?? "";
    const appUser: AppUser = {
      username: String(
        currentAuthUser.user_metadata?.username ?? email.split("@")[0] ?? "explorador",
      ),
      role: toLegacyRole(roles),
      displayName:
        profile?.display_name ??
        String(currentAuthUser.user_metadata?.display_name ?? email.split("@")[0] ?? "Explorador"),
      email,
      avatarUrl: profile?.avatar_url ?? undefined,
      phone: profile?.phone ?? undefined,
      preferences: {
        province: profile?.province ?? undefined,
        provinces: provinceCodes,
        durationDays: profile?.duration_days ?? undefined,
        interests: profile?.interests ?? undefined,
      },
    };
    setUser(appUser);
    setIsLoading(false);
    return appUser.role;
  }, []);

  useEffect(() => {
    clearLegacyLocalState();
    void supabase.auth
      .getSession()
      .then(({ data }) => loadAuthenticatedUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      queueMicrotask(() => void loadAuthenticatedUser(session?.user ?? null));
    });
    return () => listener.subscription.unsubscribe();
  }, [loadAuthenticatedUser]);

  const retryLoad = () => {
    setIsLoading(true);
    void loadAuthenticatedUser(authUser);
  };

  const refreshProfile = async () => {
    await loadAuthenticatedUser(authUser);
  };

  // In-memory only: user state is no longer persisted in the browser (the database is the source of truth).
  const persistLocalState = (u: AppUser | null) => setUser(u);

  const login: AuthContextValue["login"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      const unconfirmed =
        /email not confirmed/i.test(error?.message ?? "") || error?.code === "email_not_confirmed";
      return { ok: false, error: authErrorMessage(error?.message ?? "", lang), unconfirmed };
    }
    const role = await loadAuthenticatedUser(data.user);
    if (!role) return { ok: false, error: t("accountLoadError") };
    return { ok: true, role };
  };

  const loginAsGuest = () => {
    try {
      sessionStorage.setItem(GUEST_MODE_KEY, "1");
    } catch {
      /* ignore */
    }
    setUser(GUEST_USER);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    try {
      sessionStorage.removeItem(GUEST_MODE_KEY);
    } catch {
      /* ignore */
    }
    setAuthUser(null);
    setUser(null);
    setLoadError(null);
  };

  const setPreferences: AuthContextValue["setPreferences"] = async (prefs) => {
    if (!user) return;
    const next = { ...user, preferences: { ...user.preferences, ...prefs } };
    if (authUser) {
      // One transaction on the server: profile and provinces are saved together or not at all.
      const p = next.preferences ?? {};
      const { error } = await supabase.rpc("save_my_preferences", {
        _province: p.province ?? "",
        _duration_days: p.durationDays ?? 0,
        _interests: p.interests ?? [],
        _provinces: prefs.provinces ? [...new Set(prefs.provinces)] : undefined,
      });
      if (error) throw new Error(error.message);
    }
    persistLocalState(next);
  };

  const registerUser: AuthContextValue["registerUser"] = async ({
    username,
    password,
    displayName,
    email,
    returnTo,
    acceptedLegal,
  }) => {
    const key = username.trim().toLowerCase();
    if (!key)
      return {
        ok: false,
        error: lang === "pt" ? "Escolhe um nome de utilizador" : "Choose a username",
      };
    if (/\s/.test(key))
      return {
        ok: false,
        error: lang === "pt" ? "Sem espaços no nome de utilizador" : "No spaces in the username",
      };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          display_name: displayName.trim(),
          username: key,
          ...(parseAuthReturn(returnTo) ? { return_to: returnTo } : {}),
          ...(acceptedLegal
            ? { terms_version: LEGAL_VERSIONS.terms, privacy_version: LEGAL_VERSIONS.privacy }
            : {}),
        },
      },
    });
    if (error) return { ok: false, error: authErrorMessage(error.message, lang) };
    if (data.session && data.user) await loadAuthenticatedUser(data.user);
    return { ok: true, needsConfirmation: data.session === null };
  };

  // Guests never see onboarding: they have no profile and save nothing.
  const needsOnboarding =
    !!authUser && !!user && user.role === "user" && !user.preferences?.province;

  const isGuest = user?.role === "guest";
  const isUser = user?.role === "user";
  const isAdmin = user?.role === "admin";
  const isBusinessSmall = user?.role === "business-small";
  const isBusinessLarge = user?.role === "business-large";
  const isBusiness = isBusinessSmall || isBusinessLarge;

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        isAuthenticated: !!authUser,
        isLoading,
        loadError,
        retryLoad,
        refreshProfile,
        login,
        loginAsGuest,
        logout,
        setPreferences,
        needsOnboarding,
        registerUser,

        isGuest,
        isUser,
        isAdmin,
        isBusinessSmall,
        isBusinessLarge,
        isBusiness,
      }}
    >
      {authUser && loadError ? (
        <AccountLoadError retrying={isLoading} onRetry={retryLoad} onLogout={() => void logout()} />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

/** Blocks the app while the signed-in account cannot be read, instead of guessing a role or preferences. */
function AccountLoadError({
  retrying,
  onRetry,
  onLogout,
}: {
  retrying: boolean;
  onRetry: () => void;
  onLogout: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div role="alert" className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("accountLoadErrorTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("accountLoadError")}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={onRetry} disabled={retrying}>
            {t("retry")}
          </Button>
          <Button variant="outline" onClick={onLogout}>
            {t("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
