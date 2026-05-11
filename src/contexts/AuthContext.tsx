import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "guest" | "user" | "admin" | "business-small" | "business-large";

export interface UserPreferences {
  province?: string;
  durationDays?: number;
  interests?: string[];
}

export interface AppUser {
  username: string;
  role: UserRole;
  displayName: string;
  xp: number;
  level: number;
  visitedPlaces: number;
  completedItineraries: number;
  kmExplored: number;
  preferences?: UserPreferences;
  visitedIds?: string[];
}

export function computeLevel(xp: number) {
  // Level n requires sum 1..n * 1000 XP — simple: level = floor(xp/1000)+1 capped at 5? Use thresholds.
  if (xp >= 5000) return 5;
  if (xp >= 3000) return 4;
  if (xp >= 1500) return 3;
  if (xp >= 500) return 2;
  return 1;
}

const DEMO_USERS: Record<string, { password: string; user: AppUser }> = {
  user: {
    password: "user123",
    user: {
      username: "user",
      role: "user",
      displayName: "Explorador",
      xp: 1050,
      level: 2,
      visitedPlaces: 12,
      completedItineraries: 3,
      kmExplored: 78,
    },
  },
  admin: {
    password: "admin123",
    user: {
      username: "admin",
      role: "admin",
      displayName: "Administrador",
      xp: 5000,
      level: 5,
      visitedPlaces: 45,
      completedItineraries: 12,
      kmExplored: 350,
    },
  },
  banca_maria: {
    password: "banca123",
    user: {
      username: "banca_maria",
      role: "business-small",
      displayName: "Banca da Maria",
      xp: 200,
      level: 1,
      visitedPlaces: 0,
      completedItineraries: 0,
      kmExplored: 0,
    },
  },
  lodge_bazaruto: {
    password: "lodge123",
    user: {
      username: "lodge_bazaruto",
      role: "business-large",
      displayName: "Bazaruto Paradise Lodge",
      xp: 800,
      level: 3,
      visitedPlaces: 0,
      completedItineraries: 0,
      kmExplored: 0,
    },
  },
};

interface AuthContextValue {
  user: AppUser | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
  setPreferences: (prefs: UserPreferences) => void;
  needsOnboarding: boolean;
  addXP: (amount: number) => { newXp: number; leveledUp: boolean; newLevel: number };
  visitDestination: (id: string, km?: number) => { gained: number; alreadyVisited: boolean; leveledUp: boolean; newLevel: number } | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "ekaya.auth.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (u: AppUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login: AuthContextValue["login"] = (username, password) => {
    const entry = DEMO_USERS[username.toLowerCase()];
    if (!entry || entry.password !== password) {
      return { ok: false, error: "Credenciais inválidas" };
    }
    persist({ ...entry.user });
    return { ok: true };
  };

  const loginAsGuest = () => {
    persist({
      username: "guest",
      role: "guest",
      displayName: "Convidado",
      xp: 0,
      level: 0,
      visitedPlaces: 0,
      completedItineraries: 0,
      kmExplored: 0,
    });
  };

  const logout = () => persist(null);

  const setPreferences = (prefs: UserPreferences) => {
    if (!user) return;
    persist({ ...user, preferences: { ...user.preferences, ...prefs } });
  };

  const needsOnboarding =
    !!user &&
    (user.role === "user" || user.role === "guest") &&
    !user.preferences?.province;

  return (
    <AuthContext.Provider
      value={{ user, login, loginAsGuest, logout, setPreferences, needsOnboarding }}
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
