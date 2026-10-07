import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  LogOut,
  TrendingUp,
  Clock,
  Download,
  MapPin,
  Award,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  FileText,
  Settings,
  BarChart3,
  Heart,
  AlertCircle,
  Search,
  Mail,
  Store,
  Ban,
  Edit,
  Trash2,
  X,
  Building,
  Phone,
  Upload,
  DollarSign,
  Activity,
  Tag,
  MessageSquare,
  Compass,
  Loader2,
  Flag,
} from "lucide-react";



import { useAuth } from "@/contexts/AuthContext";
import { requireRole } from "@/lib/auth";
import { listPlatformUsers, type PlatformRole, type PlatformUser } from "@/lib/platform-users.functions";
import { toast } from "sonner";
import {
  COMMUNITY_CATEGORIES,
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
      { name: "description", content: "Gestão de utilizadores, negócios e métricas globais da plataforma Ekaya Explore." },
      { property: "og:title", content: "Painel de Administração — Ekaya Explore" },
      { property: "og:description", content: "Gestão de utilizadores, negócios e métricas globais da plataforma Ekaya Explore." },
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
  | "addBusiness"
  | "reports"
  | "settings"
  | "community"
  | "communityReports"
  | "communityExperiences";


const ROLE_LABEL: Record<PlatformRole, string> = {
  tourist: "Turista",
  business_small: "Neg. Pequeno",
  business_large: "Neg. Grande",
  admin: "Administrador",
};

const ROLE_COLOR: Record<PlatformRole, string> = {
  tourist: "bg-blue-500",
  business_small: "bg-green-500",
  business_large: "bg-purple-500",
  admin: "bg-gray-800",
};

const BUSINESS_STATUS_LABEL: Record<string, string> = {
  pending: "Empresa pendente",
  approved: "Empresa aprovada",
  rejected: "Empresa rejeitada",
  suspended: "Empresa suspensa",
};

function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/dashboard" });
  }, [isAdmin, navigate]);

  if (!user || !isAdmin) return null;

  const kpis = [
    { label: "Turistas Ativos", value: "8.432", growth: "+34%", icon: Users, gradient: "from-blue-500 to-blue-700" },
    { label: "Negócios Registados", value: "342", growth: "+18%", icon: Store, gradient: "from-green-500 to-green-700" },
    { label: "Receita (Comunidades)", value: "$2.1M", growth: "+42%", icon: DollarSign, gradient: "from-orange-500 to-orange-700" },
    { label: "Taxa de Conversão", value: "68%", growth: "+12%", icon: TrendingUp, gradient: "from-purple-500 to-purple-700" },
  ];

  const pending = [
    { name: "Restaurante Mar Azul", owner: "João Silva", category: "Gastronomia", date: "2026-02-25", icon: MapPin },
    { name: "Tour Cultural Histórico", owner: "Maria Santos", category: "Cultura", date: "2026-02-24", icon: Award },
    { name: "Loja de Artesanato Local", owner: "António Costa", category: "Artesanato", date: "2026-02-23", icon: MapPin },
  ];

  const topPlaces = [
    { name: "Fortaleza de São Sebastião", visits: "2 435", revenue: "$12 450" },
    { name: "Praia da Fortaleza", visits: "1 892", revenue: "$9 230" },
    { name: "Mercado de Artesanato", visits: "1 654", revenue: "$8 120" },
    { name: "Restaurante Ancora d'Ouro", visits: "1 423", revenue: "$15 680" },
    { name: "Capela Nossa Senhora", visits: "1 187", revenue: "$4 560" },
  ];

  const quickActions = [
    { key: "users" as const, label: "Gerir Utilizadores", icon: Users, color: "text-blue-600 bg-blue-100" },
    { key: "routes" as const, label: "Gerir Roteiros", icon: Compass, color: "text-indigo-600 bg-indigo-100" },
    { key: "community" as const, label: "Moderação da Comunidade", icon: MessageSquare, color: "text-pink-600 bg-pink-100" },
    { key: "communityReports" as const, label: "Denúncias", icon: Flag, color: "text-red-600 bg-red-100" },
    { key: "communityExperiences" as const, label: "Experiências Comunitárias", icon: Users, color: "text-emerald-600 bg-emerald-100" },
    { key: "provinces" as const, label: "Gerir Províncias", icon: MapPin, color: "text-orange-600 bg-orange-100" },

    { key: "addBusiness" as const, label: "Adicionar Negócio", icon: MapPin, color: "text-green-600 bg-green-100" },
    { key: "reports" as const, label: "Relatórios", icon: FileText, color: "text-purple-600 bg-purple-100" },
    { key: "settings" as const, label: "Configurações", icon: Settings, color: "text-gray-600 bg-gray-100" },
  ];


  const activity = [
    { color: "bg-green-500", text: "Novo negócio aprovado: Café Moçambique", time: "há 2 horas" },
    { color: "bg-blue-500", text: "124 novos utilizadores registados hoje", time: "há 4 horas" },
    { color: "bg-orange-500", text: "Receita mensal atingiu $180K", time: "há 6 horas" },
    { color: "bg-purple-500", text: "15 avaliações moderadas", time: "há 8 horas" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Shield className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Painel de Administração</h1>
              <p className="text-xs text-white/70">Governança Inteligente do Turismo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-white/80">{user.displayName ?? user.username}</span>
            <button
              onClick={() => {
                void logout().then(() => navigate({ to: "/login", replace: true }));
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            >
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-blue-600 text-white p-6 shadow-lg">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Bem-vindo de volta, {user.username}!</h2>
              <p className="text-white/85 mt-1">Aqui está o resumo de hoje.</p>
            </div>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="rounded-lg bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium backdrop-blur"
            >
              Ver Site Principal
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between">
                <div className={`size-12 rounded-xl bg-gradient-to-br ${k.gradient} text-white flex items-center justify-center`}>
                  <k.icon className="size-6" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                  <TrendingUp className="size-3" /> {k.growth}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold">{k.value}</p>
              <p className="text-sm text-gray-500">{k.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left col */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="size-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Clock className="size-5" />
                  </span>
                  <h3 className="font-bold">Aprovações Pendentes</h3>
                </div>
                <span className="text-xs font-semibold rounded-full bg-orange-100 text-orange-700 px-2 py-1">
                  {pending.length} pendentes
                </span>
              </div>
              <ul className="space-y-3">
                {pending.map((p) => (
                  <li key={p.name} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                    <span className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <p.icon className="size-5" />
                    </span>
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.owner} · {p.category} · {p.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="size-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center" aria-label="Aprovar">
                        <CheckCircle className="size-4" />
                      </button>
                      <button className="size-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center" aria-label="Rejeitar">
                        <XCircle className="size-4" />
                      </button>
                      <button className="size-8 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center justify-center" aria-label="Ver">
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Locais Mais Visitados</h3>
                <button className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                  <Download className="size-4" /> Exportar
                </button>
              </div>
              <ul className="space-y-3">
                {topPlaces.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <span className="size-8 rounded-lg bg-gradient-to-br from-orange-500 to-blue-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.visits} visitas</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{p.revenue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold mb-3">Ações Rápidas</h3>
              <div className="space-y-2">
                {quickActions.map((a) => (
                  <motion.button
                    key={a.key}
                    whileHover={{ scale: 1.02, x: 5 }}
                    onClick={() => setActiveModal(a.key)}
                    className="w-full flex items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50"
                  >
                    <span className={`size-9 rounded-lg ${a.color} flex items-center justify-center`}>
                      <a.icon className="size-5" />
                    </span>
                    <span className="font-medium text-sm">{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold mb-3">Atividade Recente</h3>
              <ul className="space-y-3">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`size-2.5 rounded-full mt-2 ${a.color}`} />
                    <div className="flex-1">
                      <p className="text-sm">{a.text}</p>
                      <p className="text-xs text-gray-500">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-green-600 to-emerald-700 shadow-lg">
              <h3 className="font-bold mb-3">Estado do Sistema</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>API Status</span><span className="font-semibold">Online</span></li>
                <li className="flex justify-between"><span>Database</span><span className="font-semibold">Healthy</span></li>
                <li className="flex justify-between"><span>Uptime</span><span className="font-semibold">99.9%</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Governance banner */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Governança Inteligente</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <GovFeature icon={<BarChart3 className="size-5" />} title="Analytics Avançados" desc="Métricas em tempo real de todo o ecossistema." />
            <GovFeature icon={<Heart className="size-5" />} title="Impacto Social" desc="Acompanhamento do impacto nas comunidades." />
            <GovFeature icon={<AlertCircle className="size-5" />} title="Alertas Inteligentes" desc="Notificações automáticas de eventos críticos." />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeModal === "users" && <UsersModal onClose={() => setActiveModal(null)} />}
        {activeModal === "routes" && <RoutesModal onClose={() => setActiveModal(null)} />}
        {activeModal === "community" && <CommunityModerationModal onClose={() => setActiveModal(null)} />}
        {activeModal === "communityReports" && <CommunityReportsModal onClose={() => setActiveModal(null)} />}


        {activeModal === "communityExperiences" && <CommunityExperiencesModal onClose={() => setActiveModal(null)} />}
        {activeModal === "provinces" && <ProvincesModal onClose={() => setActiveModal(null)} />}
        {activeModal === "addBusiness" && <AddBusinessModal onClose={() => setActiveModal(null)} />}
        {activeModal === "reports" && <ReportsModal onClose={() => setActiveModal(null)} />}
        {activeModal === "settings" && <SettingsModal onClose={() => setActiveModal(null)} />}
      </AnimatePresence>
    </div>
  );
}

function GovFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur p-4">
      <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">{icon}</div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-sm text-white/80 mt-1">{desc}</p>
    </div>
  );
}

/* ---------- Modal shell ---------- */

function ModalShell({
  header,
  headerGradient,
  onClose,
  children,
  maxWidth = "max-w-3xl",
  footer,
}: {
  header: React.ReactNode;
  headerGradient: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden bg-white flex flex-col`}
      >
        <div className={`bg-gradient-to-r ${headerGradient} text-white p-5 flex items-center justify-between gap-4`}>
          <div className="flex-1 min-w-0">{header}</div>
          <button onClick={onClose} className="size-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="border-t border-gray-100 p-4 flex justify-end gap-2 bg-gray-50">{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

/* ---------- Provinces modal (real CRUD, admin-only through RLS) ---------- */

function ProvincesModal({ onClose }: { onClose: () => void }) {
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
      toast.error("Preenche código e nomes");
      return;
    }
    setSaving(true);
    try {
      await createProvince({ code: code.trim().toLowerCase(), namePt: namePt.trim(), nameEn: nameEn.trim() });
      setCode("");
      setNamePt("");
      setNameEn("");
      toast.success("Província adicionada");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível adicionar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Province) => {
    try {
      await setProvinceActive(p.id, !p.active);
      setProvinces((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível actualizar");
    }
  };

  return (
    <ModalShell
      headerGradient="from-orange-500 to-orange-700"
      onClose={onClose}
      header={
        <div>
          <h3 className="text-lg font-bold">Províncias</h3>
          <p className="text-xs text-white/80">Lista oficial usada por destinos, negócios e preferências</p>
        </div>
      }
      footer={
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium">Fechar</button>
      }
    >
      {loading && <p className="text-sm text-gray-500">A carregar províncias...</p>}
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Não foi possível carregar as províncias.</p>
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm">Tentar novamente</button>
        </div>
      )}
      {!loading && !error && (
        <>
          <ul className="divide-y divide-gray-100">
            {provinces.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="size-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <MapPin className="size-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.name.pt}</p>
                  <p className="text-xs text-gray-500">{p.name.en} · {p.code}</p>
                </div>
                <button
                  onClick={() => void handleToggle(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                >
                  {p.active ? "Activa" : "Inactiva"}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="font-semibold text-sm mb-2">Adicionar província</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="código (ex: gaza)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input value={namePt} onChange={(e) => setNamePt(e.target.value)} placeholder="Nome (PT)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name (EN)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <button
              onClick={() => void handleAdd()}
              disabled={saving}
              className="mt-3 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "A adicionar..." : "Adicionar"}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ---------- Users modal ---------- */

function UsersModal({ onClose }: { onClose: () => void }) {
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
      headerGradient="from-blue-600 to-purple-600"
      onClose={onClose}
      header={
        <>
          <h3 className="text-lg font-bold">Gerir Utilizadores</h3>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/70" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 outline-none focus:bg-white/25"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg bg-white/20 text-white px-3 py-2 outline-none"
            >
              <option value="all" className="text-gray-900">Todos</option>
              <option value="tourist" className="text-gray-900">Turistas</option>
              <option value="business_small" className="text-gray-900">Negócios Pequenos</option>
              <option value="business_large" className="text-gray-900">Negócios Grandes</option>
              <option value="admin" className="text-gray-900">Administradores</option>
            </select>
          </div>
        </>
      }
      footer={
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium">
          Voltar ao Dashboard
        </button>
      }
    >
      {loading && <p className="text-center text-sm text-gray-500 py-8">A carregar utilizadores...</p>}
      {!loading && error && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600">Não foi possível carregar os utilizadores.</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && !error && (
        <ul className="space-y-3">
          {filtered.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
              <span className={`size-10 rounded-full ${ROLE_COLOR[u.primaryRole]} text-white font-bold flex items-center justify-center shrink-0`}>
                {u.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{u.displayName}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{ROLE_LABEL[u.primaryRole]}</span>
                  {u.confirmed ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Email confirmado</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Email por confirmar</span>
                  )}
                  {u.businessStatus && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {BUSINESS_STATUS_LABEL[u.businessStatus] ?? u.businessStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><Mail className="size-3" /> {u.email}</p>
                {u.businessName && (
                  <p className="text-xs text-gray-600 flex items-center gap-1"><Store className="size-3" /> {u.businessName}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  Registado em {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                </p>
              </div>
            </li>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-gray-500 py-8">Nenhum utilizador encontrado.</p>}
        </ul>
      )}
    </ModalShell>
  );
}

/* ---------- Add Business modal ---------- */

function AddBusinessModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<"small" | "large">("small");
  const [files, setFiles] = useState<FileList | null>(null);

  return (
    <ModalShell
      headerGradient="from-green-600 to-blue-600"
      onClose={onClose}
      header={<h3 className="text-lg font-bold">Adicionar Negócio</h3>}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium">Cancelar</button>
          <button
            onClick={() => {
              alert("Negócio adicionado!");
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium"
          >
            Adicionar Negócio
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold mb-2">Tipo de Negócio</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType("small")}
              className={`p-4 rounded-xl border-2 text-left transition ${type === "small" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Store className="size-6 text-green-600" />
              <p className="font-semibold mt-2">Negócio Pequeno</p>
            </button>
            <button
              onClick={() => setType("large")}
              className={`p-4 rounded-xl border-2 text-left transition ${type === "large" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Building className="size-6 text-purple-600" />
              <p className="font-semibold mt-2">Negócio Grande</p>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input placeholder="Nome do Negócio *" className={modalInputClass} />
          <input placeholder="Nome do Proprietário *" className={modalInputClass} />
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input type="email" placeholder="Email" className={`${modalInputClass} pl-9`} />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input type="tel" placeholder="+258 XX XXX XXXX" className={`${modalInputClass} pl-9`} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <select className={`${modalInputClass} pl-9`}>
              <option value="">Categoria...</option>
              <option>gastronomia</option>
              <option>artesanato</option>
              <option>alojamento</option>
              <option>turismo</option>
              <option>transporte</option>
              <option>outros</option>
            </select>
          </div>
          <input placeholder="Endereço *" className={modalInputClass} />
        </div>

        <textarea rows={4} placeholder="Descrição" className={modalInputClass} />

        <label className="block rounded-xl border-2 border-dashed border-gray-300 hover:border-green-500 p-6 text-center cursor-pointer transition">
          <Upload className="mx-auto size-8 text-gray-400" />
          <p className="mt-2 text-sm font-semibold">Selecionar Imagens</p>
          <p className="text-xs text-gray-500">PNG, JPG até 5MB cada</p>
          {files && files.length > 0 && (
            <p className="mt-2 text-xs text-green-600 font-semibold">{files.length} imagem(s) selecionada(s)</p>
          )}
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setFiles(e.target.files)} />
        </label>
      </div>
    </ModalShell>
  );
}

const modalInputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500";

/* ---------- Reports modal ---------- */

function ReportsModal({ onClose }: { onClose: () => void }) {
  const stats = [
    { label: "Receita Total", value: "$2.1M", growth: "+42%", color: "text-green-600" },
    { label: "Novos Utilizadores", value: "8.432", growth: "+34%", color: "text-blue-600" },
    { label: "Negócios Ativos", value: "342", growth: "+18%", color: "text-purple-600" },
  ];
  const reports = [
    { icon: Users, label: "Relatório de Utilizadores", color: "text-blue-600 bg-blue-100" },
    { icon: DollarSign, label: "Relatório Financeiro", color: "text-green-600 bg-green-100" },
    { icon: Store, label: "Relatório de Negócios", color: "text-purple-600 bg-purple-100" },
    { icon: Heart, label: "Relatório de Impacto Social", color: "text-pink-600 bg-pink-100" },
    { icon: Activity, label: "Relatório de Atividades", color: "text-orange-600 bg-orange-100" },
  ];
  return (
    <ModalShell headerGradient="from-purple-600 to-pink-600" onClose={onClose} header={<h3 className="text-lg font-bold">Relatórios</h3>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
            <p className={`text-xs mt-1 ${s.color}`}>{s.growth}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.label} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <span className={`size-10 rounded-lg ${r.color} flex items-center justify-center`}>
              <r.icon className="size-5" />
            </span>
            <p className="flex-1 font-medium text-sm">{r.label}</p>
            <button className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold inline-flex items-center gap-1">
              <Eye className="size-3" /> Ver
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold inline-flex items-center gap-1">
              <Download className="size-3" /> Exportar
            </button>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

/* ---------- Settings modal ---------- */

function Toggle({ defaultChecked = false, color = "bg-blue-600" }: { defaultChecked?: boolean; color?: string }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`relative w-11 h-6 rounded-full transition ${on ? color : "bg-gray-300"}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      headerGradient="from-gray-800 to-gray-900"
      onClose={onClose}
      header={<h3 className="text-lg font-bold">Configurações</h3>}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 font-medium">Voltar</button>
          <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium">Guardar Alterações</button>
        </>
      }
    >
      <div className="space-y-5">
        <Section icon={<Shield className="size-5" />} iconColor="text-blue-600 bg-blue-100" title="Configurações Gerais">
          <SettingRow label="Nome da Plataforma" value="Ekaya Explore" action={<button className="text-sm text-blue-600 hover:underline">Editar</button>} />
          <SettingRow label="Email de Contacto" value="hello@ekaya.mz" action={<button className="text-sm text-blue-600 hover:underline">Editar</button>} />
        </Section>
        <Section icon={<Shield className="size-5" />} iconColor="text-red-600 bg-red-100" title="Segurança">
          <SettingRow label="Autenticação de Dois Fatores" action={<Toggle defaultChecked color="bg-red-500" />} />
          <SettingRow label="Alterar Senha" action={<button className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">Alterar</button>} />
        </Section>
        <Section icon={<CheckCircle className="size-5" />} iconColor="text-green-600 bg-green-100" title="Aprovações Automáticas">
          <SettingRow label="Negócios Pequenos" action={<Toggle color="bg-green-500" />} />
          <SettingRow label="Negócios Grandes (requer aprovação manual)" action={<Toggle defaultChecked color="bg-green-500" />} />
        </Section>
        <Section icon={<MessageSquare className="size-5" />} iconColor="text-purple-600 bg-purple-100" title="Notificações">
          <SettingRow label="Novos Registos" action={<Toggle defaultChecked color="bg-purple-500" />} />
          <SettingRow label="Relatórios Diários" action={<Toggle defaultChecked color="bg-purple-500" />} />
        </Section>

        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-bold">
            <AlertCircle className="size-5" /> Zona de Perigo
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm">Limpar Cache</button>
            <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm">Exportar Dados</button>
            <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm">Reset Sistema</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function Section({ icon, iconColor, title, children }: { icon: React.ReactNode; iconColor: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`size-9 rounded-lg ${iconColor} flex items-center justify-center`}>{icon}</span>
        <h4 className="font-bold">{title}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SettingRow({ label, value, action }: { label: string; value?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {value && <p className="text-xs text-gray-500">{value}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Itineraries (roteiros) modal — real data, admin-only through RLS ---------- */

interface AdminDraftStop {
  kind: RouteStopKind;
  refId: string;
  title: string;
}

function RoutesModal({ onClose }: { onClose: () => void }) {
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
  const [days, setDays] = useState<{ title: string; stops: AdminDraftStop[] }[]>([{ title: "", stops: [] }]);
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
      setError(e instanceof Error ? e.message : "Não foi possível carregar os roteiros.");
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
            stops: d.stops.filter((s) => s.kind !== "custom").map((s) => ({ kind: s.kind, refId: s.refId, title: s.title })),
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
      prev.map((day, index) => (index === pickerDay ? { ...day, stops: [...day.stops, { kind, refId, title: label }] } : day)),
    );
    setPickerValue("");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
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
        toast.success("Roteiro atualizado.");
      } else {
        await createRoute(payload, "", { isCurated: true });
        toast.success("Roteiro oficial criado.");
      }
      closeForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
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
      header={
        <div>
          <h3 className="text-lg font-bold">Gestão de Roteiros</h3>
          <p className="text-sm text-white/80">{routes.length} roteiros na plataforma</p>
        </div>
      }
      headerGradient="from-indigo-600 to-blue-600"
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" /> A carregar roteiros...
        </p>
      ) : error ? (
        <div>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg border text-sm">
            Tentar novamente
          </button>
        </div>
      ) : editing || creating ? (
        <div className="space-y-3">
          <p className="font-semibold text-sm">{editing ? `Editar: ${editing.title}` : "Novo roteiro oficial"}</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Sem província definida</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.pt}
              </option>
            ))}
          </select>

          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={pickerDay}
              onChange={(e) => setPickerDay(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {days.map((_, index) => (
                <option key={index} value={index}>
                  Dia {index + 1}
                </option>
              ))}
            </select>
            <select
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
              className="flex-1 min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Escolher destino ou experiência real...</option>
              {destinations.map((d) => (
                <option key={d.id} value={`destination::${d.id}`}>
                  📍 {d.name}
                </option>
              ))}
              {experiences.map((e) => (
                <option key={e.id} value={`experience::${e.id}`}>
                  🏪 {e.title.pt}
                </option>
              ))}
            </select>
            <button onClick={addStop} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">
              Adicionar paragem
            </button>
            <button
              onClick={() => setDays((prev) => [...prev, { title: "", stops: [] }])}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              + Dia
            </button>
          </div>

          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500">DIA {dayIndex + 1}</span>
                <input
                  value={day.title}
                  onChange={(e) =>
                    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, title: e.target.value } : d)))
                  }
                  placeholder="Título do dia (opcional)"
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                />
                {days.length > 1 && (
                  <button
                    onClick={() => {
                      setDays((prev) => prev.filter((_, i) => i !== dayIndex));
                      setPickerDay(0);
                    }}
                    className="text-sm text-red-600"
                  >
                    remover
                  </button>
                )}
              </div>
              {day.stops.length === 0 ? (
                <p className="text-xs text-gray-500">Sem paragens.</p>
              ) : (
                <ul className="space-y-1">
                  {day.stops.map((stop, stopIndex) => (
                    <li key={`${stop.refId}-${stopIndex}`} className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-gray-400">#{stopIndex + 1}</span>
                      <span className="flex-1">
                        {stop.kind === "experience" ? "🏪" : "📍"} {stop.title}
                      </span>
                      <button
                        onClick={() =>
                          setDays((prev) =>
                            prev.map((d, i) =>
                              i === dayIndex ? { ...d, stops: d.stops.filter((_, si) => si !== stopIndex) } : d,
                            ),
                          )
                        }
                        className="text-red-600 text-xs"
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => void submit()}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "A guardar..." : "Guardar"}
            </button>
            <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-200 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou código"
              className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button onClick={() => setOnlyPending((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm ${onlyPending ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"}`}>Pendentes ({pendingRoutes})</button>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="all">Todas as províncias</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.pt}
                </option>
              ))}
            </select>
            <button onClick={() => openForm(null)} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">
              Criar roteiro oficial
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum roteiro corresponde à pesquisa.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((route) => (
                <li key={route.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-sm">
                        {route.title} <span className="font-mono text-xs text-gray-500">{route.code}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {route.isCurated ? "Oficial" : `Proprietário: ${route.ownerName ?? route.ownerId ?? "—"}`} ·{" "}
                        {route.province?.name.pt ?? "sem província"} · {route.durationDays} dias ·{" "}
                        {route.isPublic ? "público" : "privado"} · {route.status === "active" ? "activo" : "inactivo"} ·{" "}
                        <span className={route.reviewStatus === "pending" ? "text-amber-600 font-semibold" : route.reviewStatus === "rejected" ? "text-red-600" : "text-emerald-700"}>
                          {route.reviewStatus === "pending" ? "Pendente" : route.reviewStatus === "rejected" ? "Rejeitado" : "Aprovado"}
                        </span>
                        {route.submittedAt && ` · submetido ${new Date(route.submittedAt).toLocaleDateString("pt-PT")}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {route.days.map((d) => `${d.isUnassigned ? "Dias a validar" : `Dia ${d.dayNumber}`}: ${d.stops.map((st) => st.title).join(", ") || "—"}`).join(" | ")}
                      </p>
                      {route.rejectionReason && <p className="text-xs text-red-600">Motivo: {route.rejectionReason}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {route.reviewStatus !== "approved" && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Aprovar "${route.title}" e publicá-lo?`)) return;
                            try { await decideRoute(route.id, "approved"); toast.success(`Aprovado · ${route.code}`); await load(); }
                            catch (e) { toast.error(e instanceof Error ? e.message : "Falhou"); }
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs"
                        >
                          Aprovar
                        </button>
                      )}
                      {route.reviewStatus === "pending" && (
                        <button
                          onClick={async () => {
                            const reason = window.prompt(`Rejeitar "${route.title}"? Motivo (opcional):`, "");
                            if (reason === null) return;
                            try { await decideRoute(route.id, "rejected", reason); toast.success("Roteiro rejeitado."); await load(); }
                            catch (e) { toast.error(e instanceof Error ? e.message : "Falhou"); }
                          }}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs"
                        >
                          Rejeitar
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await setRouteStatus(route.id, route.status === "active" ? "inactive" : "active");
                          await load();
                        }}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs"
                      >
                        {route.status === "active" ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={async () => {
                          await setRouteVisibility(route.id, !route.isPublic);
                          await load();
                        }}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs"
                      >
                        {route.isPublic ? "Tornar privado" : "Tornar público"}
                      </button>
                      <button onClick={() => openForm(route)} className="px-2 py-1 rounded-lg border border-gray-200 text-xs">
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Apagar "${route.title}"?`)) return;
                          await deleteRoute(route.id);
                          toast.success("Roteiro apagado.");
                          await load();
                        }}
                        className="px-2 py-1 rounded-lg border border-red-200 text-red-600 text-xs"
                      >
                        Apagar
                      </button>
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

const POST_STATUS_LABEL: Record<PostStatus, string> = {
  pending: "Pendente",
  published: "Publicado",
  rejected: "Rejeitado",
  hidden: "Oculto",
};

const POST_STATUS_COLOR: Record<PostStatus, string> = {
  pending: "bg-orange-100 text-orange-700",
  published: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  hidden: "bg-gray-200 text-gray-700",
};

function CommunityModerationModal({ onClose }: { onClose: () => void }) {
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
      toast.success(`Publicação: ${POST_STATUS_LABEL[next]}`);
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Eliminar definitivamente esta publicação?")) return;
    setBusy(id);
    try {
      await deleteCommunityPost(id);
      toast.success("Publicação eliminada");
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ModalShell
      headerGradient="from-pink-600 to-purple-600"
      onClose={onClose}
      maxWidth="max-w-4xl"
      header={
        <div>
          <h3 className="text-lg font-bold">Moderação da Comunidade</h3>
          <p className="text-xs text-white/80">{posts.length} publicações</p>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "published", "pending", "hidden", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "Todas" : POST_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
          <Loader2 className="size-5 animate-spin" /> A carregar…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">Não foi possível carregar as publicações.</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-gray-500">Sem publicações para este estado.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${POST_STATUS_COLOR[p.status]}`}>
                  {POST_STATUS_LABEL[p.status]}
                </span>
                <p className="font-semibold text-sm flex-1 min-w-[180px]">{p.title}</p>
                <span className="text-xs text-gray-500">
                  {p.authorName} · {p.categoryName?.pt ?? "—"} · {p.provinceName?.pt ?? "—"} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-600 line-clamp-2">{p.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy === p.id}
                  onClick={() => void moderate(p.id, "published")}
                  className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <CheckCircle className="size-3" /> Aprovar
                </button>
                <button
                  disabled={busy === p.id}
                  onClick={() => void moderate(p.id, "rejected")}
                  className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <XCircle className="size-3" /> Rejeitar
                </button>
                <button
                  disabled={busy === p.id}
                  onClick={() => void moderate(p.id, "hidden")}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Ban className="size-3" /> Ocultar
                </button>
                <button
                  disabled={busy === p.id}
                  onClick={() => void remove(p.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="size-3" /> Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

/* ---------- Community reports (real denúncias) ---------- */

const REPORT_REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Conteúdo inapropriado",
  misleading: "Informação enganosa",
  offensive: "Conteúdo ofensivo",
  other: "Outro",
};

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Pendente",
  reviewed: "Analisada",
  dismissed: "Arquivada",
  action_taken: "Ação tomada",
};

function CommunityReportsModal({ onClose }: { onClose: () => void }) {
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
      toast.success(`Denúncia: ${REPORT_STATUS_LABEL[next]}`);
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  const hidePost = async (postId: string, reportId: string) => {
    setBusy(reportId);
    try {
      await setCommunityPostStatus(postId, "hidden");
      await resolveCommunityReport(reportId, "action_taken");
      toast.success("Publicação ocultada e denúncia resolvida");
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ModalShell
      headerGradient="from-red-600 to-orange-600"
      onClose={onClose}
      maxWidth="max-w-3xl"
      header={
        <div>
          <h3 className="text-lg font-bold">Denúncias</h3>
          <p className="text-xs text-white/80">{reports.length} registos</p>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {(["pending", "reviewed", "action_taken", "dismissed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "Todas" : REPORT_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
          <Loader2 className="size-5 animate-spin" /> A carregar…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">Não foi possível carregar as denúncias.</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-500">Sem denúncias para este estado.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700">
                  {REPORT_STATUS_LABEL[r.status]}
                </span>
                <p className="font-semibold text-sm flex-1 min-w-[160px]">{r.postTitle ?? "—"}</p>
                <span className="text-xs text-gray-500">
                  {REPORT_REASON_LABEL[r.reason] ?? r.reason} · {new Date(r.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
              {r.description && <p className="mt-2 text-xs text-gray-600">{r.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => void resolve(r.id, "reviewed")}
                  className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Eye className="size-3" /> Marcar analisada
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => void resolve(r.id, "dismissed")}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <XCircle className="size-3" /> Arquivar
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => void hidePost(r.postId, r.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Ban className="size-3" /> Ocultar publicação
                </button>
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
  titlePt: "", titleEn: "", descriptionPt: "", descriptionEn: "", provinceId: "",
  category: "beach", location: "", lat: null, lng: null, imageUrl: null,
};

function CommunityExperiencesModal({ onClose }: { onClose: () => void }) {
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
    Promise.all([fetchCommunityExperiences({ includeInactive: true, status: "any" }), fetchProvinces(true)])
      .then(([rows, provs]) => { setItems(rows); setProvinces(provs); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "erro"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof CommunityInput>(k: K, v: CommunityInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (it: CommunityExperience) => {
    setEditingId(it.id);
    setForm({
      titlePt: it.title.pt, titleEn: it.title.en, descriptionPt: it.description.pt, descriptionEn: it.description.en,
      provinceId: it.provinceId, category: it.category, location: it.location, lat: it.lat, lng: it.lng,
      imageUrl: it.imagePath ? null : it.imageUrl, imagePath: it.imagePath, additionalInfo: it.additionalInfo,
    });
  };
  const reset = () => { setEditingId(null); setForm(EMPTY_COMMUNITY); };

  const save = async () => {
    if (!form.titlePt.trim() || !form.titleEn.trim() || !form.descriptionPt.trim() || !form.descriptionEn.trim() || !form.provinceId) {
      toast.error("Preenche títulos, descrições (PT/EN) e província.");
      return;
    }
    if ((form.lat !== null && (form.lat < -90 || form.lat > 90)) || (form.lng !== null && (form.lng < -180 || form.lng > 180))) {
      toast.error("Coordenadas inválidas.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateCommunityExperience(editingId, form);
        toast.success("Atividade atualizada.");
      } else {
        await createCommunityExperience(form);
        toast.success("Atividade adicionada.");
      }
      reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (it: CommunityExperience) => {
    try {
      await setCommunityExperienceActive(it.id, !it.active);
      toast.success(it.active ? "Atividade desativada." : "Atividade ativada.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    }
  };

  const remove = async (it: CommunityExperience) => {
    if (!window.confirm(`Eliminar "${it.title.pt}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteCommunityExperience(it.id);
      toast.success("Atividade eliminada.");
      if (editingId === it.id) reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    }
  };

  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Sessão expirada.");
      const path = await uploadCommunityPhoto(data.user.id, file);
      setForm((f) => ({ ...f, imagePath: path, imageUrl: null }));
      toast.success("Fotografia carregada. Guarda para aplicar.");
    } catch (e) {
      toast.error(e instanceof Error && e.message === "too_large" ? "Máximo 5 MB." : e instanceof Error && e.message === "invalid_type" ? "Escolhe uma imagem." : "Não foi possível carregar a fotografia.");
    } finally {
      setUploading(false);
    }
  };
  const decide = async (it: CommunityExperience, status: "approved" | "rejected") => {
    let reason: string | undefined;
    if (status === "rejected") {
      const r = window.prompt(`Rejeitar "${it.title.pt}"? Indica o motivo (opcional):`, "");
      if (r === null) return;
      reason = r;
    } else if (!window.confirm(`Aprovar "${it.title.pt}" e torná-la pública?`)) return;
    try {
      await decideCommunityExperience(it.id, status, reason);
      toast.success(status === "approved" ? "Experiência aprovada." : "Experiência rejeitada.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    }
  };
  const statusLabel = (s: string) => (s === "pending" ? "Pendente" : s === "rejected" ? "Rejeitada" : "Aprovada");
  const pendingCount = items.filter((it) => it.status === "pending").length;

  const numOrNull = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const visible = items.filter((it) => (!filter || it.provinceId === filter) && (tab === "all" || it.status === "pending"));
  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900";

  return (
    <ModalShell
      onClose={onClose}
      headerGradient="from-emerald-600 to-teal-600"
      maxWidth="max-w-4xl"
      header={
        <div>
          <h2 className="text-xl font-bold">Experiências Comunitárias</h2>
          <p className="text-sm text-white/80">Atividades gratuitas, sem reserva · {items.length} registadas</p>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-100 p-4 space-y-3 bg-gray-50">
          <p className="font-semibold text-gray-900">{editingId ? "Editar atividade" : "Adicionar atividade"}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={input} placeholder="Título PT" value={form.titlePt} onChange={(e) => set("titlePt", e.target.value)} />
            <input className={input} placeholder="Título EN" value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
            <textarea className={input} rows={2} placeholder="Descrição PT" value={form.descriptionPt} onChange={(e) => set("descriptionPt", e.target.value)} />
            <textarea className={input} rows={2} placeholder="Descrição EN" value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
            <select className={input} value={form.provinceId} onChange={(e) => set("provinceId", e.target.value)}>
              <option value="">Província...</option>
              {provinces.map((p) => <option key={p.id} value={p.id}>{p.name.pt}</option>)}
            </select>
            <select className={input} value={form.category} onChange={(e) => set("category", e.target.value as CommunityCategory)}>
              {COMMUNITY_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label.en}</option>
              ))}
            </select>
            <input className={input} placeholder="Localização" value={form.location} onChange={(e) => set("location", e.target.value)} />
            <label className={`${input} flex items-center gap-2 cursor-pointer bg-white`}>
              <span className="truncate">{uploading ? "A carregar..." : form.imagePath ? "Fotografia anexada ✓ (trocar)" : "Anexar fotografia (máx. 5 MB)"}</span>
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
            </label>
            <input className={input} placeholder="Informação adicional (opcional)" value={form.additionalInfo ?? ""} onChange={(e) => set("additionalInfo", e.target.value)} />
            <input className={input} placeholder="Latitude" inputMode="decimal" value={form.lat ?? ""} onChange={(e) => set("lat", numOrNull(e.target.value))} />
            <input className={input} placeholder="Longitude" inputMode="decimal" value={form.lng ?? ""} onChange={(e) => set("lng", numOrNull(e.target.value))} />
          </div>
          <div className="flex gap-2 justify-end">
            {editingId && <button onClick={reset} className="px-4 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-700">Cancelar</button>}
            <button onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white disabled:opacity-50">
              {saving ? "A guardar..." : editingId ? "Guardar alterações" : "Adicionar"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1">
            <button onClick={() => setTab("pending")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "pending" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}>Pendentes ({pendingCount})</button>
            <button onClick={() => setTab("all")} className={`px-3 py-1.5 rounded-lg text-sm ${tab === "all" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}>Todas ({items.length})</button>
          </div>
          <p className="text-sm text-gray-600">{visible.length} atividades</p>
          <select className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todas as províncias</option>
            {provinces.map((p) => <option key={p.id} value={p.id}>{p.name.pt}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">A carregar...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500">Sem atividades.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((it) => (
              <li key={it.id} className="py-3 flex items-center gap-3">
                {it.imageUrl ? <img src={it.imageUrl} alt="" className="size-14 rounded-lg object-cover shrink-0" /> : <div className="size-14 rounded-lg bg-gray-100 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{it.title.pt}</p>
                  <p className="text-xs text-gray-500">{it.provinceName.pt} · {it.category} · {it.location || "—"} · {it.active ? "Ativa" : "Inativa"} · <span className={it.status === "pending" ? "text-amber-600 font-semibold" : it.status === "rejected" ? "text-red-600" : "text-emerald-700"}>{statusLabel(it.status)}</span></p>
                  {it.submittedBy && <p className="text-xs text-gray-500">Submetida por: {it.submitterName ?? it.submittedBy.slice(0, 8)} · {new Date(it.submittedAt).toLocaleDateString("pt-PT")}</p>}
                  {tab === "pending" && <p className="text-xs text-gray-600 line-clamp-2">{it.description.pt}</p>}
                  {it.rejectionReason && <p className="text-xs text-red-600">Motivo: {it.rejectionReason}</p>}
                </div>
                {it.status !== "approved" && <button onClick={() => void decide(it, "approved")} className="px-2 py-1 rounded-lg text-xs bg-emerald-600 text-white">Aprovar</button>}
                {it.status === "pending" && <button onClick={() => void decide(it, "rejected")} className="px-2 py-1 rounded-lg text-xs bg-red-600 text-white">Rejeitar</button>}
                <button onClick={() => startEdit(it)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Editar"><Edit className="size-4" /></button>
                <button onClick={() => void toggle(it)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={it.active ? "Desativar" : "Ativar"}>
                  {it.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                </button>
                <button onClick={() => void remove(it)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" aria-label="Eliminar"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}
