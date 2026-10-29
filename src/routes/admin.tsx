import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { getAdminSummary } from "@/lib/dashboard.functions";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { InterestIcon } from "@/components/InterestIcon";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { AdminBusinessesModal } from "@/components/AdminBusinesses";
import { AdminRewardsModal } from "@/components/AdminRewards";
import { AdminBookingsModal } from "@/components/AdminBookings";
import { AdminExperiencesModal } from "@/components/AdminExperiences";
import { AdminBroadcastsModal } from "@/components/AdminBroadcasts";
import { adminErrorText, setUserInternal, setUserRole, type ManagedRole } from "@/lib/admin";
import {
  BUSINESS_STATUS_LABEL,
  COMMUNITY_EXP_TXT,
  MODERATION_TXT,
  POST_STATUS_LABEL,
  PROVINCES_TXT,
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
  REPORTS_TXT,
  ROLE_LABEL,
  ROUTES_TXT,
  USERS_TXT,
  type Lang,
} from "@/lib/admin-texts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield,
  LogOut,
  Gift,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  FileText,
  Search,
  Mail,
  Store,
  Ban,
  Edit,
  Trash2,
  X,
  Activity,
  MessageSquare,
  Compass,
  Loader2,
  Flag,
  Megaphone,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { requireRole } from "@/lib/auth";
import {
  listPlatformUsers,
  type PlatformRole,
  type PlatformUser,
} from "@/lib/platform-users.functions";
import { toast } from "sonner";
import { AdminRouteProgressModal } from "@/components/AdminRouteProgress";
import {
  COMMUNITY_CATEGORIES,
  categoryMeta,
  createCommunityExperience,
  decideCommunityExperience,
  deleteCommunityExperience,
  uploadCommunityPhoto,
  fetchCommunityExperiences,
  setCommunityExperienceActive,
  updateCommunityExperience,
  type CommunityCategory,
  type CommunityExperience,
  type CommunityInput,
} from "@/lib/community-experiences";
import { createProvince, fetchProvinces, setProvinceActive, type Province } from "@/lib/provinces";
import { fetchDestinations, type Destination } from "@/lib/destinations";
import { fetchExperiences, type Experience } from "@/lib/experiences";
import {
  createRoute,
  deleteRoute,
  fetchAllRoutesAdmin,
  decideRoute,
  setRouteStatus,
  setRouteVisibility,
  updateRoute,
  type ItineraryRoute,
  type RouteStopKind,
} from "@/lib/routes";
import {
  deleteCommunityPost,
  fetchCommunityFeed,
  fetchCommunityReports,
  resolveCommunityReport,
  setCommunityPostStatus,
  type CommunityPost,
  type CommunityReport,
  type PostStatus,
  type ReportStatus,
} from "@/lib/community";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => requireRole(["admin"]),
  head: () => ({
    meta: [
      { title: "Painel de Administração — Ekaya Explore" },
      {
        name: "description",
        content: "Gestão de utilizadores, negócios e métricas globais da plataforma Ekaya Explore.",
      },
      { property: "og:title", content: "Painel de Administração — Ekaya Explore" },
      {
        property: "og:description",
        content: "Gestão de utilizadores, negócios e métricas globais da plataforma Ekaya Explore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type ModalKey =
  | null
  | "users"
  | "routes"
  | "provinces"
  | "reports"
  | "community"
  | "communityReports"
  | "communityExperiences"
  | "routeProgress"
  | "businesses"
  | "rewards"
  | "bookings"
  | "experiences"
  | "broadcasts";

const localeOf = (lang: Lang) => (lang === "pt" ? "pt-PT" : "en-GB");

/* ---------- Shared presentation (theme tokens; status chips always carry text, not only colour) ---------- */

const TONE = {
  success: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  neutral: "bg-muted text-muted-foreground",
} as const;

const TONE_TEXT = {
  success: "text-green-700 dark:text-green-400",
  warning: "text-amber-700 dark:text-amber-400 font-semibold",
  danger: "text-red-700 dark:text-red-400",
} as const;

const CHIP = "text-xs px-2 py-0.5 rounded-full font-semibold";
/** Field look without a width, for inline toolbars; FIELD adds w-full for stacked forms. */
const FIELD_BASE =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const FIELD = `${FIELD_BASE} w-full`;
/** Approve / reject colours: white text ≥ 4.5:1 (green-700 4.9, red-700 6.4, red-600 4.8 in dark) and a
 *  button edge ≥ 3:1 against the dark card. The label always says the action, not only the colour. */
const APPROVE_BTN = "bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-700";
const REJECT_BTN =
  "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700 dark:bg-red-600 dark:hover:bg-red-700";

const ROLE_COLOR: Record<PlatformRole, string> = {
  tourist: "bg-blue-700",
  business_small: "bg-green-700",
  business_large: "bg-purple-700",
  admin: "bg-gray-800",
};

function AdminPage() {
  const navigate = useNavigate();
  const { user, authUser, isLoading, isAdmin, logout } = useAuth();
  const { lang } = useLang();
  const pt = lang === "pt";
  const fetchSummary = useServerFn(getAdminSummary);
  const summary = useQuery({
    queryKey: ["admin-summary", authUser?.id],
    queryFn: () => fetchSummary(),
    enabled: !isLoading && isAdmin && !!authUser?.id,
    staleTime: 30_000,
  });
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  if (!user || !isAdmin) return null;

  const kpis = [
    {
      label: pt ? "Perfis registados" : "Registered profiles",
      value: summary.data?.profiles,
      icon: Users,
    },
    {
      label: pt ? "Negócios registados" : "Registered businesses",
      value: summary.data?.businesses,
      icon: Store,
    },
    {
      label: pt ? "Atividades comerciais" : "Commercial activities",
      value: summary.data?.activities,
      icon: Activity,
    },
    { label: pt ? "Reservas" : "Bookings", value: summary.data?.bookings, icon: Clock },
  ];
  const quickActions = [
    { key: "users" as const, label: "Gerir Utilizadores", icon: Users },
    { key: "businesses" as const, label: "Aprovação de Negócios", icon: Store },
    { key: "bookings" as const, label: "Reservas", icon: Clock },
    { key: "experiences" as const, label: "Atividades Comerciais", icon: Activity },
    { key: "routes" as const, label: "Gerir Roteiros", icon: Compass },
    { key: "routeProgress" as const, label: "Progresso e Provas", icon: Compass },
    { key: "rewards" as const, label: "Recompensas", icon: Gift },
    { key: "community" as const, label: "Moderação da Comunidade", icon: MessageSquare },
    { key: "communityReports" as const, label: "Denúncias", icon: Flag },
    { key: "communityExperiences" as const, label: "Experiências Comunitárias", icon: Users },
    { key: "provinces" as const, label: "Gerir Províncias", icon: MapPin },
    { key: "broadcasts" as const, label: "Avisos", icon: Megaphone },
    { key: "reports" as const, label: "Relatórios", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card text-card-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-10 sm:size-12 shrink-0 rounded-xl bg-gradient-to-br from-orange-600 to-blue-700 text-white flex items-center justify-center shadow-lg">
              <Shield className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-lg font-bold">
                {pt ? "Painel de Administração" : "Administration"}
              </h1>
              <p className="text-xs text-muted-foreground">Ekaya Explore</p>
            </div>
          </div>
          {/* Phones: icon-only actions (names kept for screen readers). */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/impact" })}>
              <Activity className="size-4" />{" "}
              <span className="sr-only sm:not-sr-only">{pt ? "Impacto" : "Impact"}</span>
            </Button>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {user.displayName ?? user.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void logout().then(() => navigate({ to: "/login", replace: true }));
              }}
            >
              <LogOut className="size-4" />{" "}
              <span className="sr-only sm:not-sr-only">{pt ? "Sair" : "Sign out"}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <section className="flex flex-wrap justify-between gap-3">
          <h2 className="text-2xl font-bold">{pt ? "Resumo da plataforma" : "Platform summary"}</h2>
          <Button variant="outline" onClick={() => navigate({ to: "/home" })}>
            {pt ? "Ver site principal" : "View main site"}
          </Button>
        </section>
        {summary.isPending && (
          <p aria-busy="true">{pt ? "A carregar resumo…" : "Loading summary…"}</p>
        )}
        {summary.isError && (
          <div role="alert">
            <p>{pt ? "Não foi possível carregar o resumo." : "Could not load summary."}</p>
            <Button onClick={() => void summary.refetch()}>
              {pt ? "Tentar novamente" : "Retry"}
            </Button>
          </div>
        )}
        {summary.data && (
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="border-l-2 border-primary pl-3">
                <k.icon className="size-5 text-primary" />
                <dt className="text-sm text-muted-foreground mt-2">{k.label}</dt>
                <dd className="text-2xl font-bold">{k.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="space-y-3">
              <h3 className="font-bold">
                {pt ? "Aprovações de negócios pendentes" : "Pending business approvals"}
              </h3>
              <p>{summary.data?.pending ?? "—"}</p>
              <Button variant="outline" onClick={() => setActiveModal("businesses")}>
                {pt ? "Aprovação de Negócios" : "Business approvals"}
              </Button>
            </section>
            <section className="space-y-3">
              <h3 className="font-bold">{pt ? "Negócios recentes" : "Recent businesses"}</h3>
              {summary.data?.recent.length === 0 && (
                <p>{pt ? "Sem negócios registados." : "No registered businesses."}</p>
              )}
              <ul className="divide-y">
                {summary.data?.recent.map((b) => (
                  <li key={b.id} className="py-3">
                    <p className="font-medium break-words">{b.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(b.created_at).toLocaleString(pt ? "pt-PT" : "en-GB")} ·{" "}
                      {
                        {
                          pending: pt ? "Pendente" : "Pending",
                          approved: pt ? "Aprovado" : "Approved",
                          rejected: pt ? "Rejeitado" : "Rejected",
                          suspended: pt ? "Suspenso" : "Suspended",
                        }[b.status]
                      }
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="space-y-3">
            <h3 className="font-bold">{pt ? "Ações rápidas" : "Quick actions"}</h3>
            <div className="grid gap-2">
              {quickActions.map((a) => (
                <Button
                  key={a.key}
                  variant="outline"
                  className="justify-start h-auto py-3 whitespace-normal text-left"
                  onClick={() => setActiveModal(a.key)}
                >
                  <a.icon className="size-4 shrink-0" />
                  {pt
                    ? a.label
                    : {
                        users: "Manage users",
                        businesses: "Business approvals",
                        routes: "Manage routes",
                        routeProgress: "Progress and proofs",
                        rewards: "Rewards",
                        community: "Community moderation",
                        communityReports: "Reports",
                        communityExperiences: "Community experiences",
                        provinces: "Manage provinces",
                        reports: "Summary",
                        bookings: "Bookings",
                        experiences: "Commercial activities",
                        broadcasts: "Notices",
                      }[a.key]}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {activeModal === "users" && <UsersModal onClose={() => setActiveModal(null)} />}
      {activeModal === "routes" && <RoutesModal onClose={() => setActiveModal(null)} />}
      {activeModal === "routeProgress" && (
        <AdminRouteProgressModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "businesses" && (
        <AdminBusinessesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "rewards" && <AdminRewardsModal onClose={() => setActiveModal(null)} />}
      {activeModal === "bookings" && <AdminBookingsModal onClose={() => setActiveModal(null)} />}
      {activeModal === "experiences" && (
        <AdminExperiencesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "community" && (
        <CommunityModerationModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "communityReports" && (
        <CommunityReportsModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "communityExperiences" && (
        <CommunityExperiencesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "provinces" && <ProvincesModal onClose={() => setActiveModal(null)} />}
      {activeModal === "reports" && <ReportsModal onClose={() => setActiveModal(null)} />}
      {activeModal === "broadcasts" && (
        <AdminBroadcastsModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

/* ---------- Modal shell (Radix dialog: focus trap, Esc, labelled title; brand gradient header) ---------- */

function ModalShell({
  title,
  subtitle,
  headerGradient,
  onClose,
  children,
  maxWidth = "max-w-3xl",
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  headerGradient: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
}) {
  const { lang } = useLang();
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] ${maxWidth} max-h-[90vh] rounded-3xl border border-border shadow-2xl overflow-hidden bg-card text-card-foreground flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`}
        >
          {/* White text on -700 brand shades keeps ≥ 4.5:1 in both themes. */}
          <div
            className={`bg-gradient-to-r ${headerGradient} text-white p-5 flex items-center justify-between gap-4`}
          >
            <div className="flex-1 min-w-0">
              <DialogPrimitive.Title className="text-lg font-bold break-words">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className={subtitle ? "text-sm text-white/90" : "sr-only"}
              >
                {subtitle ?? title}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label={lang === "pt" ? "Fechar" : "Close"}
              className="size-9 rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center shrink-0"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="p-5 overflow-y-auto flex-1">{children}</div>
          {footer && (
            <div className="border-t border-border p-4 flex justify-end gap-2 bg-muted/50">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

/** Pill filter used by the list modals; the pressed state is announced, not only coloured. */
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      className="rounded-full"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/* ---------- Provinces modal (real CRUD, admin-only through RLS) ---------- */

function ProvincesModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = PROVINCES_TXT[lang];
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [namePt, setNamePt] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchProvinces(true)
      .then(setProvinces)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "erro"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!code.trim() || !namePt.trim() || !nameEn.trim()) {
      toast.error(t.missing);
      return;
    }
    setSaving(true);
    try {
      await createProvince({
        code: code.trim().toLowerCase(),
        namePt: namePt.trim(),
        nameEn: nameEn.trim(),
      });
      setCode("");
      setNamePt("");
      setNameEn("");
      toast.success(t.added);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.addFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Province) => {
    try {
      await setProvinceActive(p.id, !p.active);
      setProvinces((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.updateFailed);
    }
  };

  const other: Lang = lang === "pt" ? "en" : "pt";

  return (
    <ModalShell
      headerGradient="from-orange-700 to-orange-800"
      onClose={onClose}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t.close}
        </Button>
      }
    >
      {loading && (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          {t.loading}
        </p>
      )}
      {error && (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-muted-foreground">{t.error}</p>
          <Button size="sm" variant="outline" onClick={load}>
            {t.retry}
          </Button>
        </div>
      )}
      {!loading && !error && (
        <>
          <ul className="divide-y divide-border">
            {provinces.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="size-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.name[lang]}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.name[other]} · {p.code}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={p.active}
                  onClick={() => void handleToggle(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${p.active ? TONE.success : TONE.neutral}`}
                >
                  {p.active ? t.active : t.inactive}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <p className="font-semibold text-sm mb-2">{t.add}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t.code}
                aria-label={t.code}
                className={FIELD}
              />
              <input
                value={namePt}
                onChange={(e) => setNamePt(e.target.value)}
                placeholder={t.namePt}
                aria-label={t.namePt}
                className={FIELD}
              />
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t.nameEn}
                aria-label={t.nameEn}
                className={FIELD}
              />
            </div>
            <Button className="mt-3" onClick={() => void handleAdd()} disabled={saving}>
              {saving ? t.adding : t.addBtn}
            </Button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ---------- Users modal ---------- */

const MANAGED_ROLES: ManagedRole[] = ["business_small", "business_large", "admin"];
function UsersModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = USERS_TXT[lang];
  const roleLabel = (r: PlatformRole) => ROLE_LABEL[lang][r];
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const changeRole = async (u: PlatformUser, role: ManagedRole, grant: boolean) => {
    setBusyRole(u.id + role);
    try {
      const roles = (await setUserRole(u.id, role, grant)) as PlatformRole[];
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, roles } : x)));
      toast.success(t.updated);
    } catch (e) {
      toast.error(adminErrorText(e instanceof Error ? e.message : "", lang));
    } finally {
      setBusyRole(null);
    }
  };
  const toggleInternal = async (u: PlatformUser) => {
    setBusyRole(u.id + "internal");
    try {
      await setUserInternal(u.id, !u.internal);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, internal: !u.internal } : x)));
      toast.success(t.internalUpdated);
    } catch (e) {
      toast.error(adminErrorText(e instanceof Error ? e.message : "", lang));
    } finally {
      setBusyRole(null);
    }
  };
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | PlatformRole>("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    listPlatformUsers()
      .then((list) => active && setUsers(list))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.primaryRole !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.businessName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <ModalShell
      headerGradient="from-blue-700 to-purple-700"
      onClose={onClose}
      title={t.title}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t.back}
        </Button>
      }
    >
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className={`${FIELD} pl-9`}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          aria-label={t.filter}
          className={`${FIELD_BASE} w-full sm:w-auto`}
        >
          <option value="all">{t.all}</option>
          <option value="tourist">{t.tourist}</option>
          <option value="business_small">{t.businessSmall}</option>
          <option value="business_large">{t.businessLarge}</option>
          <option value="admin">{t.admins}</option>
        </select>
      </div>
      {loading && (
        <p className="text-center text-sm text-muted-foreground py-8" aria-busy="true">
          {t.loading}
        </p>
      )}
      {!loading && error && (
        <div className="text-center py-8" role="alert">
          <p className="text-sm text-muted-foreground">{t.error}</p>
          <Button size="sm" className="mt-3" onClick={() => setReloadKey((k) => k + 1)}>
            {t.retry}
          </Button>
        </div>
      )}
      {!loading && !error && (
        <ul className="space-y-3">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/50"
            >
              <span
                className={`size-10 rounded-full ${ROLE_COLOR[u.primaryRole]} text-white font-bold flex items-center justify-center shrink-0`}
                aria-hidden="true"
              >
                {u.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{u.displayName}</p>
                  <span className={`${CHIP} ${TONE.neutral}`}>{roleLabel(u.primaryRole)}</span>
                  {u.confirmed ? (
                    <span className={`${CHIP} ${TONE.success}`}>{t.confirmed}</span>
                  ) : (
                    <span className={`${CHIP} ${TONE.warning}`}>{t.unconfirmed}</span>
                  )}
                  {u.internal && (
                    <span className={`${CHIP} ${TONE.neutral}`} title={t.internalHint}>
                      {t.internal}
                    </span>
                  )}
                  {u.deleted && <span className={`${CHIP} ${TONE.warning}`}>{t.deleted}</span>}
                  {u.businessStatus && (
                    <span className={`${CHIP} ${TONE.info}`}>
                      {BUSINESS_STATUS_LABEL[lang][u.businessStatus] ?? u.businessStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 break-all">
                  <Mail className="size-3 shrink-0" aria-hidden="true" /> {u.email}
                </p>
                {u.businessName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Store className="size-3 shrink-0" aria-hidden="true" /> {u.businessName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.registered} {new Date(u.createdAt).toLocaleDateString(localeOf(lang))}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t.roles}:</span>
                  {MANAGED_ROLES.map((role) => {
                    const has = u.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={busyRole === u.id + role}
                        onClick={() => void changeRole(u, role, !has)}
                        aria-pressed={has}
                        className={`text-xs px-2 py-0.5 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${has ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:bg-muted"} disabled:opacity-50`}
                      >
                        {has ? `${t.revoke} · ` : `${t.grant} · `}
                        {roleLabel(role)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={busyRole === u.id + "internal"}
                    onClick={() => void toggleInternal(u)}
                    aria-pressed={u.internal}
                    className={`text-xs px-2 py-0.5 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${u.internal ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:bg-muted"} disabled:opacity-50`}
                  >
                    {u.internal ? t.unmarkInternal : t.markInternal}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">{t.empty}</p>
          )}
        </ul>
      )}
    </ModalShell>
  );
}

/* ---------- Reports modal ---------- */

function ReportsModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const { authUser, isLoading, isAdmin } = useAuth();
  const fetchSummary = useServerFn(getAdminSummary);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-summary", authUser?.id],
    queryFn: () => fetchSummary(),
    enabled: !isLoading && isAdmin && !!authUser?.id,
    staleTime: 30_000,
  });
  return (
    <ModalShell
      headerGradient="from-purple-700 to-pink-700"
      onClose={onClose}
      title={pt ? "Resumo da plataforma" : "Platform summary"}
    >
      {isPending && (
        <p aria-busy="true" className="text-sm text-muted-foreground">
          {pt ? "A carregar…" : "Loading…"}
        </p>
      )}
      {isError && (
        <div role="alert" className="space-y-2">
          <p className="text-sm">{pt ? "Não foi possível carregar." : "Could not load."}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {pt ? "Tentar novamente" : "Retry"}
          </Button>
        </div>
      )}
      {data && (
        <dl className="grid grid-cols-2 gap-4">
          {[
            [pt ? "Perfis" : "Profiles", data.profiles],
            [pt ? "Negócios" : "Businesses", data.businesses],
            [pt ? "Atividades" : "Activities", data.activities],
            [pt ? "Reservas" : "Bookings", data.bookings],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </ModalShell>
  );
}

/* ---------- Itineraries (roteiros) modal — real data, admin-only through RLS ---------- */

interface AdminDraftStop {
  kind: RouteStopKind;
  refId: string;
  title: string;
}

function RoutesModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = ROUTES_TXT[lang];
  const [confirm, confirmDialog] = useConfirm();
  const [routes, setRoutes] = useState<ItineraryRoute[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false);
  const [editing, setEditing] = useState<ItineraryRoute | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state (create curated / edit)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [days, setDays] = useState<{ title: string; stops: AdminDraftStop[] }[]>([
    { title: "", stops: [] },
  ]);
  const [pickerDay, setPickerDay] = useState(0);
  const [pickerValue, setPickerValue] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [routeList, provinceList, destinationList, experienceList] = await Promise.all([
        fetchAllRoutesAdmin(),
        fetchProvinces(true),
        fetchDestinations(),
        fetchExperiences(),
      ]);
      setRoutes(routeList);
      setProvinces(provinceList);
      setDestinations(destinationList);
      setExperiences(experienceList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openForm = (route: ItineraryRoute | null) => {
    setEditing(route);
    setCreating(route === null);
    setTitle(route?.title ?? "");
    setDescription(route?.description ?? "");
    setProvinceId(route?.provinceId ?? "");
    setDays(
      route && route.days.length > 0
        ? route.days.map((d) => ({
            title: d.title ?? "",
            stops: d.stops
              .filter((s) => s.kind !== "custom")
              .map((s) => ({ kind: s.kind, refId: s.refId, title: s.title })),
          }))
        : [{ title: "", stops: [] }],
    );
    setPickerDay(0);
    setPickerValue("");
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const addStop = () => {
    if (!pickerValue) return;
    const [kind, refId] = pickerValue.split("::") as [RouteStopKind, string];
    const label =
      kind === "destination"
        ? destinations.find((d) => d.id === refId)?.name
        : experiences.find((e) => e.id === refId)?.title.pt;
    if (!label) return;
    setDays((prev) =>
      prev.map((day, index) =>
        index === pickerDay
          ? { ...day, stops: [...day.stops, { kind, refId, title: label }] }
          : day,
      ),
    );
    setPickerValue("");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error(t.titleRequired);
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      provinceId: provinceId || null,
      isPublic: editing ? editing.isPublic : true,
      days: days.map((day) => ({
        title: day.title.trim() || null,
        stops: day.stops.map((s) => ({ kind: s.kind, refId: s.refId })),
      })),
    };
    setSaving(true);
    try {
      if (editing) {
        await updateRoute(editing.id, payload);
        toast.success(t.updated);
      } else {
        await createRoute(payload, "", { isCurated: true });
        toast.success(t.created);
      }
      closeForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  /** Runs one route action, reports its outcome and reloads the list. */
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    }
  };

  const pendingRoutes = routes.filter((r) => r.reviewStatus === "pending").length;
  const filtered = routes.filter((route) => {
    if (onlyPending && route.reviewStatus !== "pending") return false;
    if (provinceFilter !== "all" && route.provinceId !== provinceFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return route.title.toLowerCase().includes(term) || route.code.toLowerCase().includes(term);
  });

  return (
    <ModalShell
      title={t.title}
      subtitle={t.count(routes.length)}
      headerGradient="from-indigo-700 to-blue-700"
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      {confirmDialog}
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t.loading}
        </p>
      ) : error ? (
        <div role="alert">
          <p className="text-sm text-destructive mb-3">
            {error === "load-failed" ? t.loadFailed : error}
          </p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            {t.retry}
          </Button>
        </div>
      ) : editing || creating ? (
        <div className="space-y-3">
          <p className="font-semibold text-sm">
            {editing ? t.editTitle(editing.title) : t.newTitle}
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.fTitle}
            aria-label={t.fTitle}
            className={FIELD}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.fDescription}
            aria-label={t.fDescription}
            rows={3}
            className={FIELD}
          />
          <select
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
            aria-label={t.provinceFilter}
            className={FIELD}
          >
            <option value="">{t.noProvince}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name[lang]}
              </option>
            ))}
          </select>

          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={pickerDay}
              onChange={(e) => setPickerDay(Number(e.target.value))}
              aria-label={t.dayLabel}
              className={FIELD_BASE}
            >
              {days.map((_, index) => (
                <option key={index} value={index}>
                  {t.day(index + 1)}
                </option>
              ))}
            </select>
            <select
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
              aria-label={t.pickStop}
              className={`${FIELD_BASE} flex-1 min-w-[220px]`}
            >
              <option value="">{t.pickStop}</option>
              {destinations.map((d) => (
                <option key={d.id} value={`destination::${d.id}`}>
                  📍 {d.name}
                </option>
              ))}
              {experiences.map((e) => (
                <option key={e.id} value={`experience::${e.id}`}>
                  🏪 {e.title[lang]}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={addStop}>
              {t.addStop}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDays((prev) => [...prev, { title: "", stops: [] }])}
            >
              {t.addDay}
            </Button>
          </div>

          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  {t.dayUpper(dayIndex + 1)}
                </span>
                <input
                  value={day.title}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((d, i) => (i === dayIndex ? { ...d, title: e.target.value } : d)),
                    )
                  }
                  placeholder={t.dayTitle}
                  aria-label={t.dayTitle}
                  className={`${FIELD} flex-1 py-1 px-2`}
                />
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDays((prev) => prev.filter((_, i) => i !== dayIndex));
                      setPickerDay(0);
                    }}
                    className="text-sm text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {t.remove}
                  </button>
                )}
              </div>
              {day.stops.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t.noStops}</p>
              ) : (
                <ul className="space-y-1">
                  {day.stops.map((stop, stopIndex) => (
                    <li
                      key={`${stop.refId}-${stopIndex}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-xs text-muted-foreground">#{stopIndex + 1}</span>
                      <span className="flex-1">
                        {stop.kind === "experience" ? "🏪" : "📍"} {stop.title}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDays((prev) =>
                            prev.map((d, i) =>
                              i === dayIndex
                                ? { ...d, stops: d.stops.filter((_, si) => si !== stopIndex) }
                                : d,
                            ),
                          )
                        }
                        className="text-destructive text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {t.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? t.saving : t.save}
            </Button>
            <Button variant="outline" onClick={closeForm}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className={`${FIELD_BASE} flex-1 min-w-[200px]`}
            />
            <FilterPill active={onlyPending} onClick={() => setOnlyPending((v) => !v)}>
              {t.pending(pendingRoutes)}
            </FilterPill>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              aria-label={t.provinceFilter}
              className={FIELD_BASE}
            >
              <option value="all">{t.allProvinces}</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => openForm(null)}>
              {t.createOfficial}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((route) => (
                <li key={route.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-sm break-words">
                        {route.title}{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {route.code}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {route.isCurated
                          ? t.official
                          : t.owner(route.ownerName ?? route.ownerId ?? "—")}{" "}
                        · {route.province?.name[lang] ?? t.noProvinceShort} ·{" "}
                        {t.days(route.durationDays)} · {route.isPublic ? t.public : t.private} ·{" "}
                        {route.status === "active" ? t.active : t.inactive} ·{" "}
                        <span
                          className={
                            route.reviewStatus === "pending"
                              ? TONE_TEXT.warning
                              : route.reviewStatus === "rejected"
                                ? TONE_TEXT.danger
                                : TONE_TEXT.success
                          }
                        >
                          {route.reviewStatus === "pending"
                            ? t.reviewPending
                            : route.reviewStatus === "rejected"
                              ? t.reviewRejected
                              : t.reviewApproved}
                        </span>
                        {route.submittedAt &&
                          t.submitted(
                            new Date(route.submittedAt).toLocaleDateString(localeOf(lang)),
                          )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {route.days
                          .map(
                            (d) =>
                              `${d.isUnassigned ? t.unassigned : t.day(d.dayNumber)}: ${d.stops.map((st) => st.title).join(", ") || "—"}`,
                          )
                          .join(" | ")}
                      </p>
                      {route.rejectionReason && (
                        <p className="text-xs text-destructive">
                          {t.reason}: {route.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {route.reviewStatus !== "approved" && (
                        <Button
                          size="sm"
                          className={`h-7 px-2 text-xs ${APPROVE_BTN}`}
                          onClick={async () => {
                            if (
                              !(await confirm({
                                title: t.approveQ(route.title),
                                confirmLabel: t.approve,
                              }))
                            )
                              return;
                            await act(
                              () => decideRoute(route.id, "approved"),
                              t.approved(route.code),
                            );
                          }}
                        >
                          {t.approve}
                        </Button>
                      )}
                      {route.reviewStatus === "pending" && (
                        <Button
                          size="sm"
                          className={`h-7 px-2 text-xs ${REJECT_BTN}`}
                          onClick={async () => {
                            const answer = await confirm({
                              title: t.rejectQ(route.title),
                              confirmLabel: t.reject,
                              destructive: true,
                              reason: "optional",
                            });
                            if (!answer) return;
                            await act(
                              () => decideRoute(route.id, "rejected", answer.reason),
                              t.rejected,
                            );
                          }}
                        >
                          {t.reject}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          void act(() =>
                            setRouteStatus(
                              route.id,
                              route.status === "active" ? "inactive" : "active",
                            ),
                          )
                        }
                      >
                        {route.status === "active" ? t.deactivate : t.activate}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          void act(() => setRouteVisibility(route.id, !route.isPublic))
                        }
                      >
                        {route.isPublic ? t.makePrivate : t.makePublic}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => openForm(route)}
                      >
                        {t.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-destructive border-destructive/40 hover:text-destructive"
                        onClick={async () => {
                          if (
                            !(await confirm({
                              title: t.deleteQ(route.title),
                              confirmLabel: t.del,
                              destructive: true,
                            }))
                          )
                            return;
                          await act(() => deleteRoute(route.id), t.deleted);
                        }}
                      >
                        {t.del}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </ModalShell>
  );
}

/* ---------- Community moderation (real posts, admin-only through RLS) ---------- */

const POST_STATUS_COLOR: Record<PostStatus, string> = {
  pending: TONE.warning,
  published: TONE.success,
  rejected: TONE.danger,
  hidden: TONE.neutral,
};

function CommunityModerationModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = MODERATION_TXT[lang];
  const [confirm, confirmDialog] = useConfirm();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PostStatus | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (next: PostStatus | "all") => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchCommunityFeed({ status: next }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(status);
  }, [status]);

  const moderate = async (id: string, next: PostStatus) => {
    setBusy(id);
    try {
      await setCommunityPostStatus(id, next);
      toast.success(t.status(POST_STATUS_LABEL[lang][next]));
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: t.deleteQ, confirmLabel: t.del, destructive: true }))) return;
    setBusy(id);
    try {
      await deleteCommunityPost(id);
      toast.success(t.deleted);
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const action = "h-7 px-3 text-xs";

  return (
    <ModalShell
      headerGradient="from-pink-700 to-purple-700"
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={t.title}
      subtitle={t.count(posts.length)}
    >
      {confirmDialog}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "published", "pending", "hidden", "rejected"] as const).map((s) => (
          <FilterPill key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? t.all : POST_STATUS_LABEL[lang][s]}
          </FilterPill>
        ))}
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center gap-2 py-10 text-muted-foreground"
          aria-busy="true"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t.loading}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {t.error}
        </p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${CHIP} ${POST_STATUS_COLOR[p.status]}`}>
                  {POST_STATUS_LABEL[lang][p.status]}
                </span>
                <p className="font-semibold text-sm flex-1 min-w-[180px] break-words">{p.title}</p>
                <span className="text-xs text-muted-foreground">
                  {p.authorName} · {p.categoryName?.[lang] ?? "—"} · {p.provinceName?.[lang] ?? "—"}{" "}
                  · {new Date(p.createdAt).toLocaleDateString(localeOf(lang))}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className={`${action} ${APPROVE_BTN}`}
                  disabled={busy === p.id}
                  onClick={() => void moderate(p.id, "published")}
                >
                  <CheckCircle className="size-3" aria-hidden="true" /> {t.approve}
                </Button>
                <Button
                  size="sm"
                  className={`${action} ${REJECT_BTN}`}
                  disabled={busy === p.id}
                  onClick={() => void moderate(p.id, "rejected")}
                >
                  <XCircle className="size-3" aria-hidden="true" /> {t.reject}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={action}
                  disabled={busy === p.id}
                  onClick={() => void moderate(p.id, "hidden")}
                >
                  <Ban className="size-3" aria-hidden="true" /> {t.hide}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className={action}
                  disabled={busy === p.id}
                  onClick={() => void remove(p.id)}
                >
                  <Trash2 className="size-3" aria-hidden="true" /> {t.del}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

/* ---------- Community reports (real denúncias) ---------- */

const REPORT_STATUS_COLOR: Record<ReportStatus, string> = {
  pending: TONE.warning,
  reviewed: TONE.info,
  dismissed: TONE.neutral,
  action_taken: TONE.success,
};

function CommunityReportsModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = REPORTS_TXT[lang];
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ReportStatus | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (next: ReportStatus | "all") => {
    setLoading(true);
    setError(null);
    try {
      setReports(await fetchCommunityReports(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load-failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(status);
  }, [status]);

  const resolve = async (id: string, next: ReportStatus) => {
    setBusy(id);
    try {
      await resolveCommunityReport(id, next);
      toast.success(t.status(REPORT_STATUS_LABEL[lang][next]));
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const hidePost = async (postId: string, reportId: string) => {
    setBusy(reportId);
    try {
      await setCommunityPostStatus(postId, "hidden");
      await resolveCommunityReport(reportId, "action_taken");
      toast.success(t.hidden);
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const action = "h-7 px-3 text-xs";

  return (
    <ModalShell
      headerGradient="from-red-700 to-orange-700"
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={t.title}
      subtitle={t.count(reports.length)}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {(["pending", "reviewed", "action_taken", "dismissed", "all"] as const).map((s) => (
          <FilterPill key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? t.all : REPORT_STATUS_LABEL[lang][s]}
          </FilterPill>
        ))}
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center gap-2 py-10 text-muted-foreground"
          aria-busy="true"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t.loading}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {t.error}
        </p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${CHIP} ${REPORT_STATUS_COLOR[r.status]}`}>
                  {REPORT_STATUS_LABEL[lang][r.status]}
                </span>
                <p className="font-semibold text-sm flex-1 min-w-[160px] break-words">
                  {r.postTitle ?? "—"}
                </p>
                <span className="text-xs text-muted-foreground">
                  {REPORT_REASON_LABEL[lang][r.reason] ?? r.reason} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString(localeOf(lang))}
                </span>
              </div>
              {r.description && (
                <p className="mt-2 text-xs text-muted-foreground">{r.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={action}
                  disabled={busy === r.id}
                  onClick={() => void resolve(r.id, "reviewed")}
                >
                  <Eye className="size-3" aria-hidden="true" /> {t.reviewed}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={action}
                  disabled={busy === r.id}
                  onClick={() => void resolve(r.id, "dismissed")}
                >
                  <XCircle className="size-3" aria-hidden="true" /> {t.dismiss}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className={action}
                  disabled={busy === r.id}
                  onClick={() => void hidePost(r.postId, r.id)}
                >
                  <Ban className="size-3" aria-hidden="true" /> {t.hidePost}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

/* ---------- Community experiences modal (free activities) — admin-only through RLS ---------- */

const EMPTY_COMMUNITY: CommunityInput = {
  titlePt: "",
  titleEn: "",
  descriptionPt: "",
  descriptionEn: "",
  provinceId: "",
  category: "beach",
  location: "",
  lat: null,
  lng: null,
  imageUrl: null,
};

function CommunityExperiencesModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = COMMUNITY_EXP_TXT[lang];
  const [confirm, confirmDialog] = useConfirm();
  const [items, setItems] = useState<CommunityExperience[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityInput>(EMPTY_COMMUNITY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCommunityExperiences({ includeInactive: true, status: "any" }),
      fetchProvinces(true),
    ])
      .then(([rows, provs]) => {
        setItems(rows);
        setProvinces(provs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "erro"))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const set = <K extends keyof CommunityInput>(k: K, v: CommunityInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (it: CommunityExperience) => {
    setEditingId(it.id);
    setForm({
      titlePt: it.title.pt,
      titleEn: it.title.en,
      descriptionPt: it.description.pt,
      descriptionEn: it.description.en,
      provinceId: it.provinceId,
      category: it.category,
      location: it.location,
      lat: it.lat,
      lng: it.lng,
      imageUrl: it.imagePath ? null : it.imageUrl,
      imagePath: it.imagePath,
      additionalInfo: it.additionalInfo,
    });
  };
  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_COMMUNITY);
  };

  const save = async () => {
    if (
      !form.titlePt.trim() ||
      !form.titleEn.trim() ||
      !form.descriptionPt.trim() ||
      !form.descriptionEn.trim() ||
      !form.provinceId
    ) {
      toast.error(t.missing);
      return;
    }
    if (
      (form.lat !== null && (form.lat < -90 || form.lat > 90)) ||
      (form.lng !== null && (form.lng < -180 || form.lng > 180))
    ) {
      toast.error(t.badCoords);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateCommunityExperience(editingId, form);
        toast.success(t.updated);
      } else {
        await createCommunityExperience(form);
        toast.success(t.added);
      }
      reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (it: CommunityExperience) => {
    try {
      await setCommunityExperienceActive(it.id, !it.active);
      toast.success(it.active ? t.deactivated : t.activated);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    }
  };

  const remove = async (it: CommunityExperience) => {
    if (
      !(await confirm({
        title: t.deleteQ(it.title[lang]),
        description: t.deleteDesc,
        confirmLabel: t.del,
        destructive: true,
      }))
    )
      return;
    try {
      await deleteCommunityExperience(it.id);
      toast.success(t.deleted);
      if (editingId === it.id) reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    }
  };

  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error(t.sessionExpired);
      const path = await uploadCommunityPhoto(data.user.id, file);
      setForm((f) => ({ ...f, imagePath: path, imageUrl: null }));
      toast.success(t.photoOk);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "too_large"
          ? t.tooLarge
          : e instanceof Error && e.message === "invalid_type"
            ? t.notImage
            : t.photoFailed,
      );
    } finally {
      setUploading(false);
    }
  };
  const decide = async (it: CommunityExperience, status: "approved" | "rejected") => {
    let reason: string | undefined;
    if (status === "rejected") {
      const answer = await confirm({
        title: t.rejectQ(it.title[lang]),
        confirmLabel: t.reject,
        destructive: true,
        reason: "optional",
      });
      if (!answer) return;
      reason = answer.reason;
    } else if (!(await confirm({ title: t.approveQ(it.title[lang]), confirmLabel: t.approve })))
      return;
    try {
      await decideCommunityExperience(it.id, status, reason);
      toast.success(status === "approved" ? t.approvedOk : t.rejectedOk);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.failed);
    }
  };
  const statusLabel = (s: string) =>
    s === "pending" ? t.statusPending : s === "rejected" ? t.statusRejected : t.statusApproved;
  const pendingCount = items.filter((it) => it.status === "pending").length;

  const numOrNull = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const visible = items.filter(
    (it) => (!filter || it.provinceId === filter) && (tab === "all" || it.status === "pending"),
  );
  const iconButton =
    "p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <ModalShell
      onClose={onClose}
      headerGradient="from-emerald-700 to-teal-700"
      maxWidth="max-w-4xl"
      title={t.title}
      subtitle={t.subtitle(items.length)}
    >
      {confirmDialog}
      <div className="space-y-5">
        <div className="rounded-2xl border border-border p-4 space-y-3 bg-muted/40">
          <p className="font-semibold">{editingId ? t.edit : t.add}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={FIELD}
              placeholder={t.titlePt}
              aria-label={t.titlePt}
              value={form.titlePt}
              onChange={(e) => set("titlePt", e.target.value)}
            />
            <input
              className={FIELD}
              placeholder={t.titleEn}
              aria-label={t.titleEn}
              value={form.titleEn}
              onChange={(e) => set("titleEn", e.target.value)}
            />
            <textarea
              className={FIELD}
              rows={2}
              placeholder={t.descPt}
              aria-label={t.descPt}
              value={form.descriptionPt}
              onChange={(e) => set("descriptionPt", e.target.value)}
            />
            <textarea
              className={FIELD}
              rows={2}
              placeholder={t.descEn}
              aria-label={t.descEn}
              value={form.descriptionEn}
              onChange={(e) => set("descriptionEn", e.target.value)}
            />
            <select
              className={FIELD}
              aria-label={t.province}
              value={form.provinceId}
              onChange={(e) => set("provinceId", e.target.value)}
            >
              <option value="">{t.province}</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
            </select>
            <select
              className={FIELD}
              aria-label={t.category}
              value={form.category}
              onChange={(e) => set("category", e.target.value as CommunityCategory)}
            >
              {COMMUNITY_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>
                  <InterestIcon id={c.id} /> {c.label[lang]}
                </option>
              ))}
            </select>
            <input
              className={FIELD}
              placeholder={t.location}
              aria-label={t.location}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
            <label
              className={`${FIELD} flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-ring`}
            >
              <span className="truncate">
                {uploading ? t.uploading : form.imagePath ? t.photoAttached : t.attachPhoto}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => void uploadPhoto(e.target.files?.[0])}
              />
            </label>
            <input
              className={FIELD}
              placeholder={t.extra}
              aria-label={t.extra}
              value={form.additionalInfo ?? ""}
              onChange={(e) => set("additionalInfo", e.target.value)}
            />
            <input
              className={FIELD}
              placeholder={t.lat}
              aria-label={t.lat}
              inputMode="decimal"
              value={form.lat ?? ""}
              onChange={(e) => set("lat", numOrNull(e.target.value))}
            />
            <input
              className={FIELD}
              placeholder={t.lng}
              aria-label={t.lng}
              inputMode="decimal"
              value={form.lng ?? ""}
              onChange={(e) => set("lng", numOrNull(e.target.value))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            {editingId && (
              <Button variant="outline" onClick={reset}>
                {t.cancel}
              </Button>
            )}
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? t.saving : editingId ? t.saveChanges : t.addBtn}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1">
            <FilterPill active={tab === "pending"} onClick={() => setTab("pending")}>
              {t.pending(pendingCount)}
            </FilterPill>
            <FilterPill active={tab === "all"} onClick={() => setTab("all")}>
              {t.all(items.length)}
            </FilterPill>
          </div>
          <p className="text-sm text-muted-foreground">{t.count(visible.length)}</p>
          <select
            className={`${FIELD_BASE} py-1.5`}
            aria-label={t.provinceFilter}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{t.allProvinces}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name[lang]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            {t.loading}
          </p>
        ) : error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((it) => (
              <li key={it.id} className="py-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
                {it.imageUrl ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={it.imageUrl}
                    alt=""
                    className="size-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="size-14 rounded-lg bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.title[lang]}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.provinceName[lang]} · {categoryMeta(it.category).label[lang]} ·{" "}
                    {it.location || "—"} · {it.active ? t.active : t.inactive} ·{" "}
                    <span
                      className={
                        it.status === "pending"
                          ? TONE_TEXT.warning
                          : it.status === "rejected"
                            ? TONE_TEXT.danger
                            : TONE_TEXT.success
                      }
                    >
                      {statusLabel(it.status)}
                    </span>
                  </p>
                  {it.submittedBy && (
                    <p className="text-xs text-muted-foreground">
                      {t.submittedBy}: {it.submitterName ?? it.submittedBy.slice(0, 8)} ·{" "}
                      {new Date(it.submittedAt).toLocaleDateString(localeOf(lang))}
                    </p>
                  )}
                  {tab === "pending" && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {it.description[lang]}
                    </p>
                  )}
                  {it.rejectionReason && (
                    <p className="text-xs text-destructive">
                      {t.reason}: {it.rejectionReason}
                    </p>
                  )}
                </div>
                {it.status !== "approved" && (
                  <Button
                    size="sm"
                    className={`h-7 px-2 text-xs ${APPROVE_BTN}`}
                    onClick={() => void decide(it, "approved")}
                  >
                    {t.approve}
                  </Button>
                )}
                {it.status === "pending" && (
                  <Button
                    size="sm"
                    className={`h-7 px-2 text-xs ${REJECT_BTN}`}
                    onClick={() => void decide(it, "rejected")}
                  >
                    {t.reject}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(it)}
                  className={iconButton}
                  aria-label={t.editAria}
                  title={t.editAria}
                >
                  <Edit className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void toggle(it)}
                  className={iconButton}
                  aria-label={it.active ? t.deactivate : t.activate}
                  title={it.active ? t.deactivate : t.activate}
                >
                  {it.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(it)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t.del}
                  title={t.del}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}
