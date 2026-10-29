import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  X,
  Home,
  LayoutDashboard,
  Bookmark,
  Bell,
  Map,
  Compass,
  Trophy,
  Activity,
  BookOpen,
  Sparkles,
  Heart,
  Users,
  Info,
  ArrowRight,
  Crown,
  LogOut,
  LogIn,
  Shield,
  Gamepad2,
  CalendarCheck,
  SlidersHorizontal,
  Store,
  Settings,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: { pt: string; en: string };
  /** Requires an account: hidden for guests so they are never bounced to /login. */
  privateOnly?: boolean;
}

/** Paid plans are not offered yet: the card stays in the code, hidden until there is a real plan. */
const SHOW_PLANS = false;

const SECTIONS: { title: { pt: string; en: string }; items: NavItem[] }[] = [
  {
    title: { pt: "Geral", en: "General" },
    items: [
      { to: "/home", icon: Home, label: { pt: "Home", en: "Home" } },
      {
        to: "/dashboard",
        icon: LayoutDashboard,
        label: { pt: "Painel", en: "Dashboard" },
        privateOnly: true,
      },
      {
        to: "/bookings",
        icon: CalendarCheck,
        label: { pt: "Minhas Reservas", en: "My Bookings" },
        privateOnly: true,
      },
      {
        to: "/favorites",
        icon: Bookmark,
        label: { pt: "Favoritos", en: "Favorites" },
        privateOnly: true,
      },
      {
        to: "/preferences",
        icon: SlidersHorizontal,
        label: { pt: "Editar Preferências", en: "Edit Preferences" },
        privateOnly: true,
      },
      {
        to: "/settings",
        icon: Settings,
        label: { pt: "Definições", en: "Settings" },
        privateOnly: true,
      },
      {
        to: "/news-alerts",
        icon: Bell,
        label: { pt: "Notícias & Avisos", en: "News & Alerts" },
      },
    ],
  },
  {
    title: { pt: "Explorar", en: "Explore" },
    items: [
      { to: "/map", icon: Map, label: { pt: "Mapa", en: "Map" } },
      { to: "/experiences", icon: Compass, label: { pt: "Atividades", en: "Activities" } },
      {
        to: "/community-experiences",
        icon: Users,
        label: { pt: "Experiências Comunitárias", en: "Community Experiences" },
      },
      { to: "/businesses", icon: Store, label: { pt: "Negócios Locais", en: "Local Businesses" } },
      { to: "/itineraries", icon: Heart, label: { pt: "Roteiros", en: "Itineraries" } },
      {
        to: "/gamification",
        icon: Trophy,
        label: { pt: "Conquistas", en: "Achievements" },
        privateOnly: true,
      },
      {
        to: "/games",
        icon: Gamepad2,
        label: { pt: "Jogar Desafios", en: "Play Challenges" },
        privateOnly: true,
      },
      { to: "/impact", icon: Activity, label: { pt: "Impacto Social", en: "Social Impact" } },
    ],
  },
  {
    title: { pt: "Cultura & Comunidade", en: "Culture & Community" },
    items: [
      {
        to: "/culture-history",
        icon: BookOpen,
        label: { pt: "Cultura & História", en: "Culture & History" },
      },
      {
        to: "/useful-info",
        icon: Info,
        label: { pt: "Centro de Conhecimento", en: "Knowledge Center" },
      },
      { to: "/community", icon: Users, label: { pt: "Comunidade", en: "Community" } },
    ],
  },
];

/** Sidebar body, loaded on demand: Radix only mounts it while the sheet is open. */
export function AppSidebarPanel({ close }: { close: () => void }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const isAdmin = user?.role === "admin";
  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isAuthenticated || !item.privateOnly),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-primary-glow to-secondary text-primary-foreground p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              {isAdmin ? <Shield className="size-5" /> : <Map className="size-5" />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider">Ekaya Explore</p>
              <h2 className="font-bold leading-tight">
                {lang === "pt" ? "Moçambique — Hub" : "Mozambique — Hub"}
              </h2>
            </div>
          </div>
          <button
            onClick={close}
            className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-transform hover:rotate-90"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {user && (
          <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur p-3 flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/25 flex items-center justify-center font-bold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.displayName}</p>
              <p className="text-xs capitalize">{user.role.replace("-", " ")}</p>
            </div>
          </div>
        )}
      </div>

      {!isAuthenticated && (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
          <Button
            className="gap-1.5"
            onClick={() => {
              close();
              navigate({ to: "/login" });
            }}
          >
            <LogIn className="size-4" />
            {lang === "pt" ? "Entrar" : "Sign in"}
          </Button>
          <Button
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              close();
              navigate({ to: "/signup" });
            }}
          >
            <UserPlus className="size-4" />
            {lang === "pt" ? "Criar conta" : "Create account"}
          </Button>
        </div>
      )}

      {/* Discover Adventures CTA */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-4 mt-4"
      >
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigate({ to: "/experiences" });
            close();
          }}
          className="w-full bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group"
        >
          <motion.div
            animate={{ x: ["-100%", "100%"], opacity: [0, 0.5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white dark:via-background to-transparent pointer-events-none"
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="size-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center"
              >
                <Sparkles className="size-5" />
              </motion.div>
              <div className="text-left">
                <div className="font-bold text-sm">
                  {lang === "pt" ? "Descobrir Aventuras" : "Discover Adventures"}
                </div>
                <div className="text-[11px] text-white/90">
                  {lang === "pt" ? "Explora experiências únicas" : "Explore unique experiences"}
                </div>
              </div>
            </div>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <ArrowRight className="size-5" />
            </motion.div>
          </div>
        </motion.button>
      </motion.div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">
              {section.title[lang]}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = currentPath === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={close}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:translate-x-1 ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-orange-500/10 hover:text-primary"
                    }`}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label[lang]}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Premium card */}
        {SHOW_PLANS && user && user.role !== "guest" && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-700 via-orange-700 to-pink-600 text-white p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-5" />
              <p className="font-bold text-sm">{lang === "pt" ? "Plano Básico" : "Free Plan"}</p>
            </div>
            <p className="text-xs opacity-90 mb-3">
              {lang === "pt"
                ? "Roteiros personalizados, sem anúncios e modo offline."
                : "Custom itineraries, no ads and offline mode."}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="w-full bg-card text-orange-700 dark:text-orange-300 hover:bg-white/90"
            >
              {lang === "pt" ? "Ver Planos" : "View Plans"}
            </Button>
          </div>
        )}
      </nav>

      {/* Footer actions (guests sign in at the top) */}
      {isAuthenticated && (
        <div className="border-t p-4 space-y-2 bg-muted/30">
          {isAdmin && (
            <Button
              variant="default"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
              onClick={() => {
                navigate({ to: "/admin" });
                close();
              }}
            >
              <Shield className="size-4" />
              {lang === "pt" ? "Painel Admin" : "Admin Panel"}
            </Button>
          )}
          {isAuthenticated && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                close();
                void logout().then(() => navigate({ to: "/login", replace: true }));
              }}
            >
              <LogOut className="size-4" />
              {lang === "pt" ? "Sair" : "Sign out"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
