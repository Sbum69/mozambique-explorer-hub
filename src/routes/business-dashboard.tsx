import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  CheckCircle,
  Clock,
  ArrowLeft,
  Bell,
  LogOut,
  Eye,
  Heart,
  Star,
  MessageSquare,
  Calendar,
  DollarSign,
  Edit,
  Image as ImageIcon,
  Package,
  BarChart3,
  MapPin,
  TrendingUp,
  Check,
  X,
  Users,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { getBookings, updateBookingStatus, type Booking } from "@/data/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business-dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Negócio — Ekaya Explore" },
      { name: "description", content: "Gere reservas, perfil e desempenho do teu negócio turístico em Moçambique." },
      { property: "og:title", content: "Painel do Negócio — Ekaya Explore" },
      { property: "og:description", content: "Gere reservas, perfil e desempenho do teu negócio turístico em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessDashboardPage,
});

function BusinessDashboardPage() {
  const navigate = useNavigate();
  const { user, isBusiness, isBusinessLarge, isBusinessSmall, logout } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  useEffect(() => {
    const load = () => setBookings(getBookings());
    load();
    window.addEventListener("ekaya:bookings-changed", load);
    return () => window.removeEventListener("ekaya:bookings-changed", load);
  }, []);

  const handleBookingAction = (b: Booking, status: "confirmed" | "rejected") => {
    updateBookingStatus(b.id, status);
    toast.success(
      status === "confirmed"
        ? `Reserva ${b.code} confirmada`
        : `Reserva ${b.code} rejeitada`,
    );
  };

  // Allow viewing this dashboard even from a customer flow to see incoming requests
  if (!user) {
    navigate({ to: "/login" });
    return null;
  }
  const isDemoView = !isBusiness || !user.businessInfo;
  const businessInfo = user.businessInfo ?? {
    businessName: "Ekaya Host (demo)",
    category: "Experiências comunitárias",
    location: "Moçambique",
    contact: "—",
    verified: false,
  };

  const headerGradient = isBusinessLarge ? "from-blue-500 to-blue-700" : "from-orange-500 to-orange-700";
  const bannerGradient = isBusinessLarge ? "from-blue-600 to-blue-800" : "from-orange-500 to-orange-700";

  const stats = [
    { label: "Visualizações", value: isBusinessLarge ? "2 456" : "342", icon: Eye, color: "text-blue-600 bg-blue-100" },
    { label: "Favoritos", value: isBusinessLarge ? "189" : "45", icon: Heart, color: "text-rose-600 bg-rose-100" },
    { label: "Avaliação", value: isBusinessLarge ? "4.8" : "4.6", icon: Star, color: "text-yellow-600 bg-yellow-100" },
    { label: "Avaliações", value: isBusinessLarge ? "127" : "23", icon: MessageSquare, color: "text-purple-600 bg-purple-100" },
    ...(isBusinessLarge
      ? [{ label: "Reservas", value: "67", icon: Calendar, color: "text-teal-600 bg-teal-100" }]
      : []),
    {
      label: "Receita do Mês",
      value: isBusinessLarge ? "125 450 MZN" : "8 320 MZN",
      icon: DollarSign,
      color: "text-green-600 bg-green-100",
    },
  ];

  const quickActions = [
    { label: "Editar Perfil", icon: Edit, hover: "hover:border-blue-500 hover:bg-blue-50", iconColor: "text-blue-600 bg-blue-100" },
    { label: "Adicionar Fotos", icon: ImageIcon, hover: "hover:border-purple-500 hover:bg-purple-50", iconColor: "text-purple-600 bg-purple-100" },
    { label: "Gerir Produtos/Serviços", icon: Package, hover: "hover:border-green-500 hover:bg-green-50", iconColor: "text-green-600 bg-green-100" },
    { label: "Ver Analíticas", icon: BarChart3, hover: "hover:border-orange-500 hover:bg-orange-50", iconColor: "text-orange-600 bg-orange-100" },
  ];

  const activities = [
    { icon: Eye, user: "João Silva", time: "2h atrás", color: "text-blue-600" },
    { icon: Heart, user: "Maria Costa", time: "5h atrás", color: "text-rose-600" },
    { icon: Star, user: "Pedro Santos", time: "1d atrás", color: "text-yellow-600" },
    { icon: MessageSquare, user: "Ana Ferreira", time: "2d atrás", color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`size-12 rounded-xl bg-gradient-to-br ${headerGradient} text-white flex items-center justify-center shadow-md shrink-0`}>
              <Store className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-lg truncate">{businessInfo.businessName}</h1>
                {businessInfo.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5">
                    <CheckCircle className="w-3 h-3" /> Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
                    <Clock className="w-3 h-3" /> Pendente de Verificação
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{businessInfo.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              <ArrowLeft className="size-4" /> Voltar à App Principal
            </button>
            <button className="relative size-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" aria-label="Notificações">
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500" />
            </button>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="size-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              aria-label="Sair"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl bg-gradient-to-r ${bannerGradient} text-white p-6 shadow-lg`}
        >
          <h2 className="text-2xl font-bold">Bem-vindo, {businessInfo.businessName}!</h2>
          <p className="text-white/80 mt-1">Aqui está a performance do teu negócio hoje.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
            >
              <div className={`size-10 rounded-lg ${s.color} flex items-center justify-center`}>
                <s.icon className="size-5" />
              </div>
              <p className="mt-3 text-xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left col */}
          <div className="lg:col-span-2 space-y-6">
            <Card title={`Pedidos de Reserva${bookings.filter((b) => b.status === "pending").length ? ` (${bookings.filter((b) => b.status === "pending").length} pendente${bookings.filter((b) => b.status === "pending").length > 1 ? "s" : ""})` : ""}`}>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  <Calendar className="size-8 mx-auto mb-2 opacity-40" />
                  Ainda não recebeste pedidos de reserva.
                </div>
              ) : (
                <ul className="space-y-3">
                  {bookings.slice(0, 8).map((b) => (
                    <li key={b.id} className="rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition">
                      <div className="flex gap-3">
                        <img src={b.image} alt="" className="size-16 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{b.experienceTitle.pt}</p>
                              <p className="text-xs text-gray-500 font-mono">{b.code}</p>
                            </div>
                            {b.status === "pending" && <Badge className="bg-amber-100 text-amber-700 border-0">Pendente</Badge>}
                            {b.status === "confirmed" && <Badge className="bg-emerald-100 text-emerald-700 border-0">Confirmada</Badge>}
                            {b.status === "rejected" && <Badge className="bg-rose-100 text-rose-700 border-0">Rejeitada</Badge>}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1"><Calendar className="size-3" />{b.date} · {b.time}</span>
                            <span className="flex items-center gap-1"><Users className="size-3" />{b.people} pessoa{b.people > 1 ? "s" : ""}</span>
                            <span className="flex items-center gap-1 truncate"><MessageSquare className="size-3" />{b.customerName}</span>
                            <span className="flex items-center gap-1 truncate"><Phone className="size-3" />{b.customerPhone}</span>
                            {b.customerEmail && <span className="col-span-2 truncate">✉ {b.customerEmail}</span>}
                            {b.notes && <span className="col-span-2 italic text-gray-500 truncate">"{b.notes}"</span>}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="text-sm"><span className="text-gray-500">Total:</span> <span className="font-bold text-primary">{b.totalMzn.toLocaleString()} MZN</span></span>
                            {b.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleBookingAction(b, "rejected")}>
                                  <X className="size-4" /> Rejeitar
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleBookingAction(b, "confirmed")}>
                                  <Check className="size-4" /> Confirmar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Ações Rápidas">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((a) => (
                  <motion.button
                    whileHover={{ y: -3 }}
                    key={a.label}
                    className={`text-left p-4 rounded-xl border-2 border-gray-200 flex items-center gap-3 transition ${a.hover}`}
                  >
                    <span className={`size-10 rounded-lg ${a.iconColor} flex items-center justify-center`}>
                      <a.icon className="size-5" />
                    </span>
                    <span className="font-semibold text-sm">{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </Card>

            <Card title="Performance (Últimos 7 dias)">
              <div className="h-64 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center text-center px-6">
                <TrendingUp className="size-10 text-blue-500 mb-2" />
                <p className="font-semibold">Gráfico de analíticas em desenvolvimento</p>
                <p className="text-sm text-gray-500 mt-1">Em breve verás um gráfico interativo aqui.</p>
              </div>
            </Card>
          </div>

          {/* Right col */}
          <div className="space-y-6">
            <Card title="Informações">
              <div className="space-y-3 text-sm">
                <InfoRow icon={<MapPin className="size-4" />} label="Localização" value={businessInfo.location} />
                <InfoRow icon={<Store className="size-4" />} label="Categoria" value={businessInfo.category} />
                <InfoRow icon={<MessageSquare className="size-4" />} label="Contacto" value={businessInfo.contact} />
              </div>
            </Card>

            <Card title="Atividade Recente">
              <ul className="space-y-3">
                {activities.map((a, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`size-8 rounded-full bg-gray-100 flex items-center justify-center ${a.color}`}>
                      <a.icon className="size-4" />
                    </span>
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{a.user}</p>
                      <p className="text-xs text-gray-500">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
      {isBusinessSmall && null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="size-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
