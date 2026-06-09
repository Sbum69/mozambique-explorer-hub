import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Info, ChevronDown, CheckCircle, ArrowLeft, Home,
  type LucideIcon,
} from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/useful-info")({
  head: () => ({
    meta: [
      { title: "Informações Úteis — Ekaya Explore" },
      { name: "description", content: "Guia completo para visitar Moçambique." },
    ],
  }),
  component: UsefulInfoPage,
});

const QUICK_TIPS = [
  "Não beba água da torneira",
  "Cumprimentar é culturalmente importante",
  "Negociar preços em mercados é comum",
  "Tenha sempre dinheiro vivo",
  "Protetor solar e repelente são ESSENCIAIS",
  "Respeite os horários",
  "Aprenda 'Bom dia' e 'Obrigado'",
  "Não fotografe sem permissão",
  "Malária é real – tome profilaxia",
  "Praias paradisíacas, mas cuidado com o sol",
];

interface SubSection { title: string; items: string[]; }
interface Category {
  id: string;
  emoji: string;
  title: string;
  gradient: string;
  icon: LucideIcon;
  pills: { label: string; value: string }[];
  subs: SubSection[];
}

const CATEGORIES: Category[] = [
  {
    id: "moeda",
    emoji: "💰",
    title: "Moeda e Pagamentos",
    gradient: "from-green-500 to-emerald-600",
    icon: Info,
    pills: [
      { label: "Moeda", value: "Metical (MZN)" },
      { label: "Câmbio", value: "~63 MZN/USD" },
      { label: "Símbolo", value: "MT" },
    ],
    subs: [
      { title: "Onde os cartões são aceites", items: ["Hotéis de gama média/alta", "Restaurantes em cidades", "Supermercados nas capitais", "Postos de combustível principais"] },
      { title: "Onde trocar dinheiro", items: ["Bancos (BCI, Millennium, Standard Bank)", "Casas de câmbio do aeroporto", "Cuidado com casas de câmbio informais"] },
      { title: "Avisos importantes", items: ["Tenha sempre cash para mercados e tuk-tuks", "Notas grandes podem ser difíceis de trocar", "ATMs nem sempre funcionam fora das cidades"] },
    ],
  },
  {
    id: "seguranca",
    emoji: "🛡️",
    title: "Segurança para Turistas",
    gradient: "from-blue-500 to-blue-600",
    icon: Info,
    pills: [
      { label: "Nível", value: "Moderado" },
      { label: "Polícia", value: "119" },
      { label: "Médica", value: "117 / 112" },
    ],
    subs: [
      { title: "Boas práticas", items: ["Evite mostrar objetos de valor", "Use táxis recomendados pelo hotel", "Não ande sozinho à noite", "Mantenha cópias do passaporte", "Evite zonas isoladas", "Confie no instinto"] },
      { title: "Números de emergência", items: ["Polícia: 119", "Emergência médica: 117 / 112", "Bombeiros: 198"] },
      { title: "Cuidados especiais", items: ["Cabo Delgado: verificar segurança antes de viajar", "Estradas à noite: evitar", "Praias isoladas: pergunte a moradores"] },
    ],
  },
  {
    id: "transporte",
    emoji: "🚗",
    title: "Transporte",
    gradient: "from-orange-500 to-red-600",
    icon: Info,
    pills: [
      { label: "Condução", value: "Lado direito" },
      { label: "Carta", value: "Internacional" },
      { label: "Estradas", value: "Variáveis" },
    ],
    subs: [
      { title: "Tipos de transporte", items: ["Chapas (mini-bus, barato)", "Táxis (negociar preço antes)", "Rent-a-car com 4x4 recomendado", "Voos LAM entre províncias"] },
      { title: "Aeroportos principais", items: ["Maputo (MPM)", "Beira (BEW)", "Nampula (APL)", "Vilankulo (VNX)"] },
      { title: "Dicas", items: ["Combustível pode escassear no interior", "Use GPS offline (a rede falha)", "Estradas EN1 e EN6 são as principais"] },
    ],
  },
  {
    id: "clima",
    emoji: "🌤️",
    title: "Clima e Melhor Época",
    gradient: "from-yellow-500 to-orange-600",
    icon: Info,
    pills: [
      { label: "Temperatura", value: "25–32 °C" },
      { label: "Melhor época", value: "Mai–Out" },
      { label: "Evitar", value: "Jan–Mar" },
    ],
    subs: [
      { title: "Estação seca (Abr–Out)", items: ["Dias soalheiros", "Temperaturas amenas", "Ideal para safari e praia", "Mar calmo para mergulho"] },
      { title: "Estação chuvosa (Nov–Mar)", items: ["Chuvas curtas e fortes", "Vegetação verdejante", "Risco de ciclones (Jan–Mar)", "Algumas estradas intransitáveis"] },
      { title: "Quando visitar", items: ["Praia: Junho a Outubro", "Safari: Julho a Setembro", "Mergulho com manta: Agosto a Outubro"] },
    ],
  },
  {
    id: "cultura",
    emoji: "🎭",
    title: "Cultura e Etiqueta Local",
    gradient: "from-purple-500 to-pink-600",
    icon: Info,
    pills: [
      { label: "Língua oficial", value: "Português" },
      { label: "Locais", value: "40+ línguas" },
      { label: "Religião", value: "Maior parte cristã" },
    ],
    subs: [
      { title: "Cumprimentos", items: ["Aperto de mão firme é comum", "Em zonas rurais, dois apertos seguidos", "Cumprimentar é sinal de respeito"] },
      { title: "Fotografias", items: ["SEMPRE peça permissão", "Não fotografe edifícios oficiais", "Ofereça uma cópia se puder"] },
      { title: "Vestuário", items: ["Roupa modesta em zonas rurais", "Biquíni só na praia ou piscina", "Cabeça coberta em mesquitas"] },
      { title: "Respeito por comunidades", items: ["Cumprimente o chefe local em aldeias", "Aceite hospitalidade com humildade", "Apoie negócios locais"] },
    ],
  },
  {
    id: "gastronomia",
    emoji: "🍤",
    title: "Gastronomia Típica",
    gradient: "from-red-500 to-orange-600",
    icon: Info,
    pills: [
      { label: "Prato nacional", value: "Matapa com Xima" },
      { label: "Forte", value: "Frutos do mar" },
      { label: "Tempero", value: "Piri-Piri" },
    ],
    subs: [
      { title: "Pratos imperdíveis", items: ["Matapa (folhas de mandioca)", "Xima (massa de milho)", "Caril de caranguejo", "Frango à zambeziana", "Camarão LM ao Piri-Piri", "Galinha à cafreal"] },
      { title: "Ingredientes locais", items: ["Coco", "Amendoim", "Mandioca", "Milho", "Peixe e marisco fresco"] },
      { title: "Bebidas típicas", items: ["Tipo-Tinto (vinho de caju)", "2M e Laurentina (cervejas)", "Sumo de tamarindo", "Chá de jamba"] },
    ],
  },
  {
    id: "saude",
    emoji: "🏥",
    title: "Saúde e Vacinas",
    gradient: "from-pink-500 to-red-600",
    icon: Info,
    pills: [
      { label: "Obrigatória", value: "Febre Amarela" },
      { label: "Risco", value: "Malária" },
      { label: "Água", value: "Não da torneira" },
    ],
    subs: [
      { title: "Vacinação recomendada", items: ["Febre Amarela (obrigatória se vier de zona de risco)", "Tifo", "Hepatite A e B", "Tétano"] },
      { title: "Prevenção de malária", items: ["Profilaxia (consulte médico)", "Repelente DEET", "Roupa de mangas longas ao entardecer", "Mosquiteiro à noite"] },
      { title: "Kit médico", items: ["Antidiarreico", "Analgésicos", "Pensos rápidos", "Filtros de água ou pastilhas"] },
      { title: "Hospitais principais", items: ["Hospital Privado de Maputo", "Hospital Central de Maputo", "Clínica Cruz Azul"] },
      { title: "Água e alimentação", items: ["Beba apenas água engarrafada", "Evite gelo de origem desconhecida", "Lave fruta com água tratada"] },
    ],
  },
  {
    id: "linguagem",
    emoji: "🗣️",
    title: "Frases Básicas em Português",
    gradient: "from-indigo-500 to-purple-600",
    icon: Info,
    pills: [
      { label: "Oficial", value: "Português" },
      { label: "Dificuldade", value: "Moderada" },
      { label: "Inglês", value: "Zonas turísticas" },
    ],
    subs: [
      { title: "Cumprimentos", items: ["Bom dia – Good morning", "Boa tarde – Good afternoon", "Olá – Hello", "Adeus – Goodbye"] },
      { title: "Expressões úteis", items: ["Obrigado / Obrigada – Thank you", "Por favor – Please", "Desculpe – Sorry", "Sim / Não – Yes / No"] },
      { title: "Perguntas essenciais", items: ["Quanto custa? – How much?", "Onde é...? – Where is...?", "Fala inglês? – Do you speak English?"] },
      { title: "No restaurante", items: ["A conta, por favor – The bill, please", "Está delicioso – It's delicious", "Sem piri-piri – Without chili"] },
    ],
  },
  {
    id: "internet",
    emoji: "📶",
    title: "Internet e Comunicação",
    gradient: "from-cyan-500 to-blue-600",
    icon: Info,
    pills: [
      { label: "Cobertura", value: "Boa nas cidades" },
      { label: "Rede", value: "3G / 4G" },
      { label: "WiFi", value: "Hotéis e cafés" },
    ],
    subs: [
      { title: "Operadoras", items: ["Vodacom (a mais usada)", "Movitel (boa no interior)", "Tmcel (estatal)"] },
      { title: "Como comprar SIM", items: ["Loja oficial com passaporte", "Necessário registo (carta + foto)", "Aeroporto tem balcões"] },
      { title: "Preços aproximados", items: ["SIM: 50 MT (~$0.80)", "1 GB de dados: ~150 MT", "Pacote semanal: ~300 MT"] },
      { title: "Cobertura por região", items: ["Maputo: excelente 4G", "Cidades médias: 3G estável", "Interior: limitada"] },
      { title: "Dicas", items: ["Baixe mapas offline", "Use WhatsApp para chamadas", "Tenha dois SIMs em viagens longas"] },
    ],
  },
  {
    id: "sustentavel",
    emoji: "🌍",
    title: "Turismo Sustentável",
    gradient: "from-green-500 to-teal-600",
    icon: Info,
    pills: [
      { label: "Princípio", value: "Respeito" },
      { label: "Local", value: "85% beneficia comunidades" },
      { label: "Visão", value: "Turismo regenerativo" },
    ],
    subs: [
      { title: "Apoie negócios locais", items: ["Compre artesanato direto a artesãos", "Coma em barracas locais", "Use guias da comunidade"] },
      { title: "Respeite a natureza", items: ["Não toque em corais", "Não compre conchas ou marfim", "Leve o seu lixo de volta"] },
      { title: "Respeite tradições", items: ["Vista-se modestamente em aldeias", "Peça permissão para fotos", "Aceite hospitalidade com gratidão"] },
      { title: "Reduza a pegada ecológica", items: ["Garrafa reutilizável + filtros", "Evite plásticos descartáveis", "Compense as emissões do voo"] },
      { title: "Como o hub ajuda", items: ["Conecta-te a guias certificados", "Mostra impacto em tempo real", "Apoia projetos comunitários"] },
    ],
  },
];

function UsefulInfoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([CATEGORIES[0].id]));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppSidebar />
            <h1 className="font-bold text-base sm:text-lg ml-1">Informações Úteis</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {user && (
              <div className="size-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold flex items-center justify-center text-sm">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex size-16 rounded-2xl bg-white/15 backdrop-blur items-center justify-center mb-4">
            <Info className="size-8" />
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">Guia Completo de Moçambique</h2>
          <p className="text-white/90 max-w-2xl mx-auto">Tudo o que precisas saber antes e durante a tua viagem — moeda, segurança, cultura, saúde e mais.</p>
        </div>
      </section>

      {/* Quick tips */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 shadow-2xl">
          <h3 className="font-bold mb-4 text-lg">⚡ 10 Dicas Rápidas</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {QUICK_TIPS.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-2 text-sm"
              >
                <CheckCircle className="size-4 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Accordion */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-4">
          {CATEGORIES.map((cat, i) => {
            const open = openIds.has(cat.id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border bg-card shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggle(cat.id)}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className={`size-16 rounded-2xl bg-gradient-to-br ${cat.gradient} text-white flex items-center justify-center text-2xl shrink-0`}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg">{cat.title}</h3>
                    <p className="text-xs text-muted-foreground">Toque para expandir</p>
                  </div>
                  <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown className="size-5 text-muted-foreground" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 pt-0 space-y-5">
                        <div className="grid sm:grid-cols-3 gap-3">
                          {cat.pills.map((p, idx) => (
                            <div key={idx} className={`rounded-xl p-3 bg-gradient-to-br ${cat.gradient} text-white`}>
                              <p className="text-[10px] uppercase opacity-80">{p.label}</p>
                              <p className="font-bold mt-0.5">{p.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-5">
                          {cat.subs.map((sub, idx) => (
                            <div key={idx}>
                              <h4 className="font-semibold text-sm mb-2 text-foreground/90">{sub.title}</h4>
                              <ul className="space-y-1.5">
                                {sub.items.map((item, k) => (
                                  <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="size-3.5 text-primary shrink-0 mt-1" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Floating back button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate({ to: "/dashboard" })}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl flex items-center justify-center z-40"
        aria-label="Voltar ao Dashboard"
      >
        <Home className="size-6" />
      </motion.button>

      <div className="sr-only">
        <Button onClick={() => navigate({ to: "/dashboard" })}><ArrowLeft className="size-4" /> Voltar</Button>
      </div>
    </div>
  );
}
