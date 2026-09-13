import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

export type UserRole = "guest" | "user" | "admin" | "business-small" | "business-large";

export interface UserPreferences {
  province?: string;
  durationDays?: number;
  interests?: string[];
}

export interface BusinessInfo {
  businessName: string;
  businessType: "small" | "large";
  category: string;
  location: string;
  description: string;
  contact: string;
  verified: boolean;
}

export interface AppUser {
  username: string;
  role: UserRole;
  displayName: string;
  email?: string;
  xp: number;
  level: number;
  visitedPlaces: number;
  completedItineraries: number;
  kmExplored: number;
  preferences?: UserPreferences;
  visitedIds?: string[];
  businessInfo?: BusinessInfo;
}



export function computeLevel(xp: number) {
  if (xp >= 5000) return 5;
  if (xp >= 3000) return 4;
  if (xp >= 1500) return 3;
  if (xp >= 500) return 2;
  return 1;
}

interface AuthContextValue {
  user: AppUser | null;
  authUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: UserRole }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  setPreferences: (prefs: UserPreferences) => void;
  needsOnboarding: boolean;
  addXP: (amount: number) => { newXp: number; leveledUp: boolean; newLevel: number };
  visitDestination: (id: string, km?: number) => { gained: number; alreadyVisited: boolean; leveledUp: boolean; newLevel: number } | null;
  registerBusiness: (businessData: BusinessInfo, username: string, code: string) => { ok: boolean; error?: string };
  registerUser: (data: { username: string; password: string; displayName: string; email: string }) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;

  isGuest: boolean;
  isUser: boolean;
  isAdmin: boolean;
  isBusinessSmall: boolean;
  isBusinessLarge: boolean;
  isBusiness: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LOCAL_STATE_PREFIX = "ekaya.user-state:";

const rolePriority: AppRole[] = ["admin", "business_large", "business_small", "tourist"];

function toLegacyRole(roles: AppRole[]): UserRole {
  const role = rolePriority.find((candidate) => roles.includes(candidate)) ?? "tourist";
  if (role === "business_large") return "business-large";
  if (role === "business_small") return "business-small";
  if (role === "tourist") return "user";
  return role;
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email ou palavra-passe incorretos.";
  if (normalized.includes("email not confirmed")) return "Confirma primeiro o teu email para entrar.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "Este email já está registado.";
  if (normalized.includes("valid email")) return "Introduz um email válido.";
  if (normalized.includes("password") && normalized.includes("characters")) return "A palavra-passe é demasiado curta.";
  if (normalized.includes("network") || normalized.includes("fetch")) return "Sem ligação. Verifica a internet e tenta novamente.";
  return "Não foi possível concluir. Tenta novamente.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAuthenticatedUser = useCallback(async (currentAuthUser: User | null) => {
    setAuthUser(currentAuthUser);
    if (!currentAuthUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, phone, locale, province, duration_days, interests").eq("id", currentAuthUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", currentAuthUser.id),
    ]);
    const roles = (roleRows ?? []).map(({ role }) => role) as AppRole[];
    const localKey = `${LOCAL_STATE_PREFIX}${currentAuthUser.id}`;
    let local: Partial<AppUser> = {};
    try {
      local = JSON.parse(localStorage.getItem(localKey) ?? "{}");
    } catch {
      local = {};
    }

    const email = currentAuthUser.email ?? "";
    const appUser: AppUser = {
      username: String(currentAuthUser.user_metadata?.username ?? email.split("@")[0] ?? "explorador"),
      role: toLegacyRole(roles),
      displayName: profile?.display_name ?? String(currentAuthUser.user_metadata?.display_name ?? email.split("@")[0] ?? "Explorador"),
      email,
      xp: local.xp ?? 0,
      level: local.level ?? 1,
      visitedPlaces: local.visitedPlaces ?? 0,
      completedItineraries: local.completedItineraries ?? 0,
      kmExplored: local.kmExplored ?? 0,
      visitedIds: local.visitedIds ?? [],
      businessInfo: local.businessInfo,
      preferences: {
        province: profile?.province ?? local.preferences?.province,
        durationDays: profile?.duration_days ?? local.preferences?.durationDays,
        interests: profile?.interests ?? local.preferences?.interests,
      },
    };
    setUser(appUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => loadAuthenticatedUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      queueMicrotask(() => void loadAuthenticatedUser(session?.user ?? null));
    });
    return () => listener.subscription.unsubscribe();
  }, [loadAuthenticatedUser]);

  const persistLocalState = (u: AppUser | null) => {
    setUser(u);
    if (u && authUser) localStorage.setItem(`${LOCAL_STATE_PREFIX}${authUser.id}`, JSON.stringify(u));
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { ok: false, error: authErrorMessage(error?.message ?? "") };
    await loadAuthenticatedUser(data.user);
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    return { ok: true, role: toLegacyRole((roleRows ?? []).map(({ role }) => role) as AppRole[]) };
  };


  const loginAsGuest = () => {
    setUser({
      username: "Convidado",
      role: "guest",
      displayName: "Convidado",
      xp: 0,
      level: 0,
      visitedPlaces: 0,
      completedItineraries: 0,
      kmExplored: 0,
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
  };

  const setPreferences = (prefs: UserPreferences) => {
    if (!user) return;
    const next = { ...user, preferences: { ...user.preferences, ...prefs } };
    persistLocalState(next);
    if (authUser) {
      void supabase.from("profiles").update({
        province: next.preferences?.province,
        duration_days: next.preferences?.durationDays,
        interests: next.preferences?.interests,
      }).eq("id", authUser.id);
    }
  };

  const addXP: AuthContextValue["addXP"] = (amount) => {
    if (!user) return { newXp: 0, leveledUp: false, newLevel: 0 };
    const newXp = user.xp + amount;
    const newLevel = computeLevel(newXp);
    const leveledUp = newLevel > user.level;
    persistLocalState({ ...user, xp: newXp, level: newLevel });
    return { newXp, leveledUp, newLevel };
  };

  const visitDestination: AuthContextValue["visitDestination"] = (id, km = 0) => {
    if (!user) return null;
    const visited = user.visitedIds ?? [];
    const alreadyVisited = visited.includes(id);
    if (alreadyVisited) {
      return { gained: 0, alreadyVisited: true, leveledUp: false, newLevel: user.level };
    }
    const gained = 150;
    const newXp = user.xp + gained;
    const newLevel = computeLevel(newXp);
    const leveledUp = newLevel > user.level;
    persistLocalState({
      ...user,
      xp: newXp,
      level: newLevel,
      visitedIds: [...visited, id],
      visitedPlaces: user.visitedPlaces + 1,
      kmExplored: user.kmExplored + km,
    });
    return { gained, alreadyVisited: false, leveledUp, newLevel };
  };

  const registerBusiness: AuthContextValue["registerBusiness"] = (businessData, username, code) => {
    void businessData;
    void username;
    void code;
    return { ok: false, error: "Cria primeiro uma conta pessoal. O registo de negócios será ligado numa próxima fase." };
  };

  const registerUser: AuthContextValue["registerUser"] = async ({ username, password, displayName, email }) => {
    const key = username.trim().toLowerCase();
    if (!key) return { ok: false, error: "Escolhe um nome de utilizador" };
    if (/\s/.test(key)) return { ok: false, error: "Sem espaços no nome de utilizador" };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName.trim(), username: key },
      },
    });
    if (error) return { ok: false, error: authErrorMessage(error.message) };
    if (data.session && data.user) await loadAuthenticatedUser(data.user);
    return { ok: true, needsConfirmation: data.session === null };
  };


  const needsOnboarding =
    !!user &&
    (user.role === "user" || user.role === "guest") &&
    !user.preferences?.province;

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
        login,
        loginAsGuest,
        logout,
        setPreferences,
        needsOnboarding,
        addXP,
        visitDestination,
        registerBusiness,
        registerUser,

        isGuest,
        isUser,
        isAdmin,
        isBusinessSmall,
        isBusinessLarge,
        isBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
