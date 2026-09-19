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
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { requireRole } from "@/lib/auth";
import { listPlatformUsers, type PlatformRole, type PlatformUser } from "@/lib/platform-users.functions";

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

type ModalKey = null | "users" | "provinces" | "addBusiness" | "reports" | "settings";

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
