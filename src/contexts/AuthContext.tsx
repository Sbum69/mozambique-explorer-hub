import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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
      businessInfo: {
        businessName: "Banca da Maria",
        businessType: "small",
        category: "Artesanato Local",
        location: "Mercado Central, Maputo",
        description:
          "Artesanato tradicional moçambicano feito à mão. Cestos, esculturas em madeira, e tecidos coloridos.",
        contact: "+258 84 123 4567",
        verified: true,
      },
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
      businessInfo: {
        businessName: "Bazaruto Paradise Lodge",
        businessType: "large",
        category: "Alojamento e Hospedagem",
        location: "Arquipélago de Bazaruto, Inhambane",
        description:
          "Lodge de luxo com vista para o mar. Inclui restaurante, spa e atividades aquáticas.",
        contact: "+258 84 987 6543",
        verified: true,
      },
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
  registerBusiness: (businessData: BusinessInfo, username: string, code: string) => { ok: boolean; error?: string };
  registerUser: (data: { username: string; password: string; displayName: string; email: string }) => { ok: boolean; error?: string };

  isGuest: boolean;
  isUser: boolean;
  isAdmin: boolean;
  isBusinessSmall: boolean;
  isBusinessLarge: boolean;
  isBusiness: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "ekaya.auth.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  // In-memory registry of dynamically registered businesses (session-only)
  const registeredBusinesses = useRef<Map<string, AppUser>>(new Map());
  // Registered end-users (persisted in localStorage)
  const registeredUsers = useRef<Map<string, { password: string; user: AppUser }>>(new Map());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
      const usersRaw = localStorage.getItem("ekaya.registeredUsers");
      if (usersRaw) {
        const parsed = JSON.parse(usersRaw) as Record<string, { password: string; user: AppUser }>;
        registeredUsers.current = new Map(Object.entries(parsed));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistRegisteredUsers = () => {
    const obj: Record<string, { password: string; user: AppUser }> = {};
    registeredUsers.current.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem("ekaya.registeredUsers", JSON.stringify(obj));
  };


  const persist = (u: AppUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login: AuthContextValue["login"] = (username, password) => {
    const key = username.trim().toLowerCase();
    const entry = DEMO_USERS[key];
    if (entry && entry.password === password) {
      persist({ ...entry.user });
      return { ok: true };
    }
    const reg = registeredUsers.current.get(key);
    if (reg && reg.password === password) {
      persist({ ...reg.user });
      return { ok: true };
    }
    const dyn = registeredBusinesses.current.get(`${key}:${password}`);
    if (dyn) {
      persist({ ...dyn });
      return { ok: true };
    }
    return { ok: false, error: "Credenciais inválidas" };
  };


  const loginAsGuest = () => {
    persist({
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

  const logout = () => persist(null);

  const setPreferences = (prefs: UserPreferences) => {
    if (!user) return;
    persist({ ...user, preferences: { ...user.preferences, ...prefs } });
  };

  const addXP: AuthContextValue["addXP"] = (amount) => {
    if (!user) return { newXp: 0, leveledUp: false, newLevel: 0 };
    const newXp = user.xp + amount;
    const newLevel = computeLevel(newXp);
    const leveledUp = newLevel > user.level;
    persist({ ...user, xp: newXp, level: newLevel });
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
    persist({
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
    const key = username.trim().toLowerCase();
    if (!key || !code) return { ok: false, error: "Credenciais em falta" };
    if (DEMO_USERS[key]) return { ok: false, error: "Utilizador já existe" };
    for (const stored of registeredBusinesses.current.keys()) {
      if (stored.startsWith(`${key}:`)) return { ok: false, error: "Utilizador já existe" };
    }
    const role: UserRole = businessData.businessType === "large" ? "business-large" : "business-small";
    const newUser: AppUser = {
      username: key,
      role,
      displayName: businessData.businessName,
      xp: 0,
      level: 1,
      visitedPlaces: 0,
      completedItineraries: 0,
      kmExplored: 0,
      businessInfo: { ...businessData, verified: false },
    };
    registeredBusinesses.current.set(`${key}:${code}`, newUser);
    persist(newUser);
    return { ok: true };
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
        login,
        loginAsGuest,
        logout,
        setPreferences,
        needsOnboarding,
        addXP,
        visitDestination,
        registerBusiness,
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
