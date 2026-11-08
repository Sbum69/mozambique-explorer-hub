import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { BrandLogo } from "@/components/BrandLogo";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
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
import { SETTINGS_TXT } from "@/lib/page-texts";

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
      <div className="relative bg-card text-card-foreground border-b border-border">
        <div className="capulana-band h-1.5" aria-hidden="true" />
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                {isAdmin ? <Shield className="size-5" /> : <Map className="size-5" />}
              </div>
              <div>
                <BrandLogo className="h-4" />
                <h2 className="font-bold leading-tight">
                  {lang === "pt" ? "Moçambique" : "Mozambique"}
                </h2>
              </div>
            </div>
            <button
              onClick={close}
              className="size-8 rounded-md hover:bg-accent flex items-center justify-center"
              aria-label={lang === "pt" ? "Fechar menu" : "Close menu"}
            >
              <X className="size-4" />
            </button>
          </div>

          {user && isAuthenticated && (
            <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
              <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin
                    ? SETTINGS_TXT[lang].roleAdmin
                    : user.role === "business-small" || user.role === "business-large"
                      ? SETTINGS_TXT[lang].roleBusiness
                      : SETTINGS_TXT[lang].roleTourist}
                </p>
              </div>
            </div>
          )}
        </div>
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
      <div className="mx-4 mt-4">
        <button
          type="button"
          onClick={() => {
            navigate({ to: "/experiences" });
            close();
          }}
          className="w-full rounded-md bg-primary p-4 text-left text-primary-foreground hover:bg-primary-glow transition-colors"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <Compass className="size-5 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-bold text-sm">
                  {lang === "pt" ? "Descobrir Aventuras" : "Discover Adventures"}
                </span>
                <span className="block text-xs opacity-90">
                  {lang === "pt" ? "Explora experiências únicas" : "Explore unique experiences"}
                </span>
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
          </span>
        </button>
      </div>

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
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground font-bold shadow-[inset_3px_0_0_var(--color-primary)]"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
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
          <div className="rounded-[10px] border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-5" />
              <p className="font-bold text-sm">{lang === "pt" ? "Plano Básico" : "Free Plan"}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {lang === "pt"
                ? "Roteiros personalizados, sem anúncios e modo offline."
                : "Custom itineraries, no ads and offline mode."}
            </p>
            <Button size="sm" variant="secondary" className="w-full">
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
              className="w-full"
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
      <LegalFooterLinks className="border-t px-4 py-3" onNavigate={close} />
    </>
  );
}
