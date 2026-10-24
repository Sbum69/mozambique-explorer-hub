import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Info, ChevronDown, CheckCircle, ArrowLeft, Home, type LucideIcon } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useBackTarget } from "@/lib/nav";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { CurrencyConverter } from "@/components/CurrencyConverter";

export const Route = createFileRoute("/useful-info")({
  head: () => ({
    meta: [
      { title: "Informações Úteis — Ekaya Explore" },
      { name: "description", content: "Guia completo para visitar Moçambique." },
      { property: "og:title", content: "Informações Úteis — Ekaya Explore" },
      { property: "og:description", content: "Guia completo para visitar Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsefulInfoPage,
});

type L = { pt: string; en: string };
const l = (pt: string, en: string): L => ({ pt, en });

const QUICK_TIPS: L[] = [
  l("Não beba água da torneira", "Don't drink tap water"),
  l("Cumprimentar é culturalmente importante", "Greeting people is culturally important"),
  l("Negociar preços em mercados é comum", "Bargaining at markets is common"),
  l("Tenha sempre dinheiro vivo", "Always carry cash"),
  l("Protetor solar e repelente são ESSENCIAIS", "Sunscreen and repellent are ESSENTIAL"),
  l("Respeite os horários", "Be mindful of schedules"),
  l("Aprenda 'Bom dia' e 'Obrigado'", "Learn 'Bom dia' and 'Obrigado'"),
  l("Não fotografe sem permissão", "Don't take photos without permission"),
  l("Malária é real – tome profilaxia", "Malaria is real – take prophylaxis"),
  l("Praias paradisíacas, mas cuidado com o sol", "Paradise beaches, but beware of the sun"),
];

interface SubSection {
  title: L;
  items: L[];
}
interface Category {
  id: string;
  emoji: string;
  title: L;
  gradient: string;
  icon: LucideIcon;
  pills: { label: L; value: L }[];
  subs: SubSection[];
}

const same = (s: string) => l(s, s);

const CATEGORIES: Category[] = [
  {
    id: "moeda",
    emoji: "💰",
    title: l("Moeda e Pagamentos", "Currency and Payments"),
    gradient: "from-green-500 to-emerald-600",
    icon: Info,
    pills: [
      { label: l("Moeda", "Currency"), value: same("Metical (MZN)") },
      { label: l("Símbolo", "Symbol"), value: same("MT") },
    ],
    subs: [
      {
        title: l("Onde os cartões são aceites", "Where cards are accepted"),
        items: [
          l("Hotéis de gama média/alta", "Mid/high-range hotels"),
          l("Restaurantes em cidades", "City restaurants"),
          l("Supermercados nas capitais", "Supermarkets in provincial capitals"),
          l("Postos de combustível principais", "Main fuel stations"),
        ],
      },
      {
        title: l("Onde trocar dinheiro", "Where to exchange money"),
        items: [
          l("Bancos (BCI, Millennium, Standard Bank)", "Banks (BCI, Millennium, Standard Bank)"),
          l("Casas de câmbio do aeroporto", "Airport exchange offices"),
          l("Cuidado com casas de câmbio informais", "Beware of informal money changers"),
        ],
      },
      {
        title: l("Avisos importantes", "Important warnings"),
        items: [
          l(
            "Tenha sempre cash para mercados e tuk-tuks",
            "Always have cash for markets and tuk-tuks",
          ),
          l("Notas grandes podem ser difíceis de trocar", "Large notes can be hard to change"),
          l("ATMs nem sempre funcionam fora das cidades", "ATMs don't always work outside cities"),
        ],
      },
    ],
  },
  {
    id: "seguranca",
    emoji: "🛡️",
    title: l("Segurança para Turistas", "Safety for Tourists"),
    gradient: "from-blue-500 to-blue-600",
    icon: Info,
    pills: [
      { label: l("Nível", "Level"), value: l("Moderado", "Moderate") },
      { label: l("Polícia", "Police"), value: same("119") },
      { label: l("Médica", "Medical"), value: same("117 / 112") },
    ],
    subs: [
      {
        title: l("Boas práticas", "Good practices"),
        items: [
          l("Evite mostrar objetos de valor", "Avoid showing valuables"),
          l("Use táxis recomendados pelo hotel", "Use taxis recommended by your hotel"),
          l("Não ande sozinho à noite", "Don't walk alone at night"),
          l("Mantenha cópias do passaporte", "Keep copies of your passport"),
          l("Evite zonas isoladas", "Avoid isolated areas"),
          l("Confie no instinto", "Trust your instincts"),
        ],
      },
      {
        title: l("Números de emergência", "Emergency numbers"),
        items: [
          l("Polícia: 119", "Police: 119"),
          l("Emergência médica: 117 / 112", "Medical emergency: 117 / 112"),
          l("Bombeiros: 198", "Fire brigade: 198"),
        ],
      },
      {
        title: l("Cuidados especiais", "Special care"),
        items: [
          l(
            "Cabo Delgado: verificar segurança antes de viajar",
            "Cabo Delgado: check safety before travelling",
          ),
          l("Estradas à noite: evitar", "Roads at night: avoid"),
          l("Praias isoladas: pergunte a moradores", "Isolated beaches: ask locals"),
        ],
      },
    ],
  },
  {
    id: "transporte",
    emoji: "🚗",
    title: l("Transporte", "Transport"),
    gradient: "from-orange-500 to-red-600",
    icon: Info,
    pills: [
      { label: l("Condução", "Driving"), value: l("Lado direito", "Right-hand side") },
      { label: l("Carta", "Licence"), value: l("Internacional", "International") },
      { label: l("Estradas", "Roads"), value: l("Variáveis", "Variable") },
    ],
    subs: [
      {
        title: l("Tipos de transporte", "Types of transport"),
        items: [
          l("Chapas (mini-bus, barato)", "Chapas (minibus, cheap)"),
          l("Táxis (negociar preço antes)", "Taxis (agree the price first)"),
          l("Rent-a-car com 4x4 recomendado", "Car rental, 4x4 recommended"),
          l("Voos LAM entre províncias", "LAM flights between provinces"),
        ],
      },
      {
        title: l("Aeroportos principais", "Main airports"),
        items: [
          same("Maputo (MPM)"),
          same("Beira (BEW)"),
          same("Nampula (APL)"),
          same("Vilankulo (VNX)"),
        ],
      },
      {
        title: l("Dicas", "Tips"),
        items: [
          l("Combustível pode escassear no interior", "Fuel can be scarce inland"),
          l("Use GPS offline (a rede falha)", "Use offline GPS (signal drops)"),
          l("Estradas EN1 e EN6 são as principais", "EN1 and EN6 are the main roads"),
        ],
      },
    ],
  },
  {
    id: "clima",
    emoji: "🌤️",
    title: l("Clima e Melhor Época", "Climate and Best Season"),
    gradient: "from-yellow-500 to-orange-600",
    icon: Info,
    pills: [
      { label: l("Temperatura", "Temperature"), value: same("25–32 °C") },
      { label: l("Melhor época", "Best season"), value: l("Mai–Out", "May–Oct") },
      { label: l("Evitar", "Avoid"), value: l("Jan–Mar", "Jan–Mar") },
    ],
    subs: [
      {
        title: l("Estação seca (Abr–Out)", "Dry season (Apr–Oct)"),
        items: [
          l("Dias soalheiros", "Sunny days"),
          l("Temperaturas amenas", "Mild temperatures"),
          l("Ideal para safari e praia", "Ideal for safari and beach"),
          l("Mar calmo para mergulho", "Calm sea for diving"),
        ],
      },
      {
        title: l("Estação chuvosa (Nov–Mar)", "Rainy season (Nov–Mar)"),
        items: [
          l("Chuvas curtas e fortes", "Short, heavy rains"),
          l("Vegetação verdejante", "Lush vegetation"),
          l("Risco de ciclones (Jan–Mar)", "Cyclone risk (Jan–Mar)"),
          l("Algumas estradas intransitáveis", "Some roads impassable"),
        ],
      },
      {
        title: l("Quando visitar", "When to visit"),
        items: [
          l("Praia: Junho a Outubro", "Beach: June to October"),
          l("Safari: Julho a Setembro", "Safari: July to September"),
          l("Mergulho com manta: Agosto a Outubro", "Manta ray diving: August to October"),
        ],
      },
    ],
  },
  {
    id: "cultura",
    emoji: "🎭",
    title: l("Cultura e Etiqueta Local", "Culture and Local Etiquette"),
    gradient: "from-purple-500 to-pink-600",
    icon: Info,
    pills: [
      { label: l("Língua oficial", "Official language"), value: l("Português", "Portuguese") },
      { label: l("Locais", "Local"), value: l("40+ línguas", "40+ languages") },
      { label: l("Religião", "Religion"), value: l("Maior parte cristã", "Mostly Christian") },
    ],
    subs: [
      {
        title: l("Cumprimentos", "Greetings"),
        items: [
          l("Aperto de mão firme é comum", "A firm handshake is common"),
          l("Em zonas rurais, dois apertos seguidos", "In rural areas, two handshakes in a row"),
          l("Cumprimentar é sinal de respeito", "Greeting is a sign of respect"),
        ],
      },
      {
        title: l("Fotografias", "Photography"),
        items: [
          l("SEMPRE peça permissão", "ALWAYS ask permission"),
          l("Não fotografe edifícios oficiais", "Don't photograph official buildings"),
          l("Ofereça uma cópia se puder", "Offer a copy if you can"),
        ],
      },
      {
        title: l("Vestuário", "Clothing"),
        items: [
          l("Roupa modesta em zonas rurais", "Modest clothing in rural areas"),
          l("Biquíni só na praia ou piscina", "Bikinis only at the beach or pool"),
          l("Cabeça coberta em mesquitas", "Head covered in mosques"),
        ],
      },
      {
        title: l("Respeito por comunidades", "Respect for communities"),
        items: [
          l("Cumprimente o chefe local em aldeias", "Greet the local chief in villages"),
          l("Aceite hospitalidade com humildade", "Accept hospitality with humility"),
          l("Apoie negócios locais", "Support local businesses"),
        ],
      },
    ],
  },
  {
    id: "gastronomia",
    emoji: "🍤",
    title: l("Gastronomia Típica", "Typical Cuisine"),
    gradient: "from-red-500 to-orange-600",
    icon: Info,
    pills: [
      {
        label: l("Prato nacional", "National dish"),
        value: l("Matapa com Xima", "Matapa with Xima"),
      },
      { label: l("Forte", "Speciality"), value: l("Frutos do mar", "Seafood") },
      { label: l("Tempero", "Seasoning"), value: same("Piri-Piri") },
    ],
    subs: [
      {
        title: l("Pratos imperdíveis", "Must-try dishes"),
        items: [
          l("Matapa (folhas de mandioca)", "Matapa (cassava leaves)"),
          l("Xima (massa de milho)", "Xima (maize porridge)"),
          l("Caril de caranguejo", "Crab curry"),
          l("Frango à zambeziana", "Zambezian-style chicken"),
          l("Camarão LM ao Piri-Piri", "LM prawns with Piri-Piri"),
          l("Galinha à cafreal", "Galinha à cafreal (grilled chicken)"),
        ],
      },
      {
        title: l("Ingredientes locais", "Local ingredients"),
        items: [
          l("Coco", "Coconut"),
          l("Amendoim", "Peanuts"),
          l("Mandioca", "Cassava"),
          l("Milho", "Maize"),
          l("Peixe e marisco fresco", "Fresh fish and seafood"),
        ],
      },
      {
        title: l("Bebidas típicas", "Typical drinks"),
        items: [
          l("Tipo-Tinto (vinho de caju)", "Tipo-Tinto (cashew wine)"),
          l("2M e Laurentina (cervejas)", "2M and Laurentina (beers)"),
          l("Sumo de tamarindo", "Tamarind juice"),
          l("Chá de jamba", "Jamba tea"),
        ],
      },
    ],
  },
  {
    id: "saude",
    emoji: "🏥",
    title: l("Saúde e Vacinas", "Health and Vaccines"),
    gradient: "from-pink-500 to-red-600",
    icon: Info,
    pills: [
      { label: l("Obrigatória", "Required"), value: l("Febre Amarela", "Yellow Fever") },
      { label: l("Risco", "Risk"), value: l("Malária", "Malaria") },
      { label: l("Água", "Water"), value: l("Não da torneira", "Not from the tap") },
    ],
    subs: [
      {
        title: l("Vacinação recomendada", "Recommended vaccinations"),
        items: [
          l(
            "Febre Amarela (obrigatória se vier de zona de risco)",
            "Yellow Fever (required if arriving from a risk area)",
          ),
          l("Tifo", "Typhoid"),
          l("Hepatite A e B", "Hepatitis A and B"),
          l("Tétano", "Tetanus"),
        ],
      },
      {
        title: l("Prevenção de malária", "Malaria prevention"),
        items: [
          l("Profilaxia (consulte médico)", "Prophylaxis (see a doctor)"),
          l("Repelente DEET", "DEET repellent"),
          l("Roupa de mangas longas ao entardecer", "Long sleeves at dusk"),
          l("Mosquiteiro à noite", "Mosquito net at night"),
        ],
      },
      {
        title: l("Kit médico", "Medical kit"),
        items: [
          l("Antidiarreico", "Antidiarrhoeal"),
          l("Analgésicos", "Painkillers"),
          l("Pensos rápidos", "Plasters"),
          l("Filtros de água ou pastilhas", "Water filters or tablets"),
        ],
      },
      {
        title: l("Hospitais principais", "Main hospitals"),
        items: [
          same("Hospital Privado de Maputo"),
          same("Hospital Central de Maputo"),
          same("Clínica Cruz Azul"),
        ],
      },
      {
        title: l("Água e alimentação", "Water and food"),
        items: [
          l("Beba apenas água engarrafada", "Drink bottled water only"),
          l("Evite gelo de origem desconhecida", "Avoid ice of unknown origin"),
          l("Lave fruta com água tratada", "Wash fruit with treated water"),
        ],
      },
    ],
  },
  {
    id: "linguagem",
    emoji: "🗣️",
    title: l("Frases Básicas em Português", "Basic Portuguese Phrases"),
    gradient: "from-indigo-500 to-purple-600",
    icon: Info,
    pills: [
      { label: l("Oficial", "Official"), value: l("Português", "Portuguese") },
      { label: l("Dificuldade", "Difficulty"), value: l("Moderada", "Moderate") },
      { label: l("Inglês", "English"), value: l("Zonas turísticas", "Tourist areas") },
    ],
    subs: [
      {
        title: l("Cumprimentos", "Greetings"),
        items: [
          same("Bom dia – Good morning"),
          same("Boa tarde – Good afternoon"),
          same("Olá – Hello"),
          same("Adeus – Goodbye"),
        ],
      },
      {
        title: l("Expressões úteis", "Useful expressions"),
        items: [
          same("Obrigado / Obrigada – Thank you"),
          same("Por favor – Please"),
          same("Desculpe – Sorry"),
          same("Sim / Não – Yes / No"),
        ],
      },
      {
        title: l("Perguntas essenciais", "Essential questions"),
        items: [
          same("Quanto custa? – How much?"),
          same("Onde é...? – Where is...?"),
          same("Fala inglês? – Do you speak English?"),
        ],
      },
      {
        title: l("No restaurante", "At the restaurant"),
        items: [
          same("A conta, por favor – The bill, please"),
          same("Está delicioso – It's delicious"),
          same("Sem piri-piri – Without chili"),
        ],
      },
    ],
  },
  {
    id: "internet",
    emoji: "📶",
    title: l("Internet e Comunicação", "Internet and Communication"),
    gradient: "from-cyan-500 to-blue-600",
    icon: Info,
    pills: [
      { label: l("Cobertura", "Coverage"), value: l("Boa nas cidades", "Good in cities") },
      { label: l("Rede", "Network"), value: same("3G / 4G") },
      { label: same("WiFi"), value: l("Hotéis e cafés", "Hotels and cafés") },
    ],
    subs: [
      {
        title: l("Operadoras", "Operators"),
        items: [
          l("Vodacom (a mais usada)", "Vodacom (most used)"),
          l("Movitel (boa no interior)", "Movitel (good inland)"),
          l("Tmcel (estatal)", "Tmcel (state-owned)"),
        ],
      },
      {
        title: l("Como comprar SIM", "How to buy a SIM"),
        items: [
          l("Loja oficial com passaporte", "Official store with passport"),
          l("Necessário registo (carta + foto)", "Registration required (ID + photo)"),
          l("Aeroporto tem balcões", "The airport has counters"),
        ],
      },
      {
        title: l("Preços aproximados", "Approximate prices"),
        items: [
          same("SIM: 50 MT (~$0.80)"),
          l("1 GB de dados: ~150 MT", "1 GB of data: ~150 MT"),
          l("Pacote semanal: ~300 MT", "Weekly bundle: ~300 MT"),
        ],
      },
      {
        title: l("Cobertura por região", "Coverage by region"),
        items: [
          l("Maputo: excelente 4G", "Maputo: excellent 4G"),
          l("Cidades médias: 3G estável", "Mid-sized cities: stable 3G"),
          l("Interior: limitada", "Inland: limited"),
        ],
      },
      {
        title: l("Dicas", "Tips"),
        items: [
          l("Baixe mapas offline", "Download offline maps"),
          l("Use WhatsApp para chamadas", "Use WhatsApp for calls"),
          l("Tenha dois SIMs em viagens longas", "Carry two SIMs on long trips"),
        ],
      },
    ],
  },
  {
    id: "sustentavel",
    emoji: "🌍",
    title: l("Turismo Sustentável", "Sustainable Tourism"),
    gradient: "from-green-500 to-teal-600",
    icon: Info,
    pills: [
      { label: l("Princípio", "Principle"), value: l("Respeito", "Respect") },
      {
        label: l("Local", "Local"),
        value: l("Gasto que fica nas comunidades", "Spending that stays local"),
      },
      { label: l("Visão", "Vision"), value: l("Turismo regenerativo", "Regenerative tourism") },
    ],
    subs: [
      {
        title: l("Apoie negócios locais", "Support local businesses"),
        items: [
          l("Compre artesanato direto a artesãos", "Buy crafts directly from artisans"),
          l("Coma em barracas locais", "Eat at local stalls"),
          l("Use guias da comunidade", "Use community guides"),
        ],
      },
      {
        title: l("Respeite a natureza", "Respect nature"),
        items: [
          l("Não toque em corais", "Don't touch corals"),
          l("Não compre conchas ou marfim", "Don't buy shells or ivory"),
          l("Leve o seu lixo de volta", "Take your rubbish back with you"),
        ],
      },
      {
        title: l("Respeite tradições", "Respect traditions"),
        items: [
          l("Vista-se modestamente em aldeias", "Dress modestly in villages"),
          l("Peça permissão para fotos", "Ask permission for photos"),
          l("Aceite hospitalidade com gratidão", "Accept hospitality with gratitude"),
        ],
      },
      {
        title: l("Reduza a pegada ecológica", "Reduce your footprint"),
        items: [
          l("Garrafa reutilizável + filtros", "Reusable bottle + filters"),
          l("Evite plásticos descartáveis", "Avoid single-use plastics"),
          l("Compense as emissões do voo", "Offset your flight emissions"),
        ],
      },
      {
        title: l("Como o hub ajuda", "How the hub helps"),
        items: [
          l("Conecta-te a guias certificados", "Connects you with certified guides"),
          l("Mostra impacto em tempo real", "Shows impact in real time"),
          l("Apoia projetos comunitários", "Supports community projects"),
        ],
      },
    ],
  },
];

function UsefulInfoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const backTarget = useBackTarget();
  const router = useRouter();
  const { lang } = useLang();
  const pt = lang === "pt";
  /** Previous page when there is in-app history; otherwise the safe Home/Dashboard target. */
  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else void navigate({ to: backTarget });
  };
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
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              aria-label={pt ? "Voltar" : "Back"}
              title={pt ? "Voltar" : "Back"}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="font-bold text-base sm:text-lg ml-1">
              {pt ? "Informações Úteis" : "Useful Information"}
            </h1>
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex size-16 rounded-2xl bg-white/15 backdrop-blur items-center justify-center mb-4"
          >
            <Info className="size-8" />
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            {pt ? "Guia Completo de Moçambique" : "Complete Guide to Mozambique"}
          </h2>
          <p className="text-white/90 max-w-2xl mx-auto">
            {pt
              ? "Tudo o que precisas saber antes e durante a tua viagem — moeda, segurança, cultura, saúde e mais."
              : "Everything you need to know before and during your trip — currency, safety, culture, health and more."}
          </p>
        </div>
      </section>

      {/* Quick tips */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 shadow-2xl">
          <h3 className="font-bold mb-4 text-lg">⚡ {pt ? "10 Dicas Rápidas" : "10 Quick Tips"}</h3>
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
                <span>{tip[lang]}</span>
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
                  aria-expanded={open}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={`size-16 rounded-2xl bg-gradient-to-br ${cat.gradient} text-white flex items-center justify-center text-2xl shrink-0`}
                  >
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg">{cat.title[lang]}</h3>
                    <p className="text-xs text-muted-foreground">
                      {open
                        ? pt
                          ? "Toque para recolher"
                          : "Tap to collapse"
                        : pt
                          ? "Toque para expandir"
                          : "Tap to expand"}
                    </p>
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
                            <div
                              key={idx}
                              className={`rounded-xl p-3 bg-gradient-to-br ${cat.gradient} text-white`}
                            >
                              <p className="text-[10px] uppercase opacity-80">{p.label[lang]}</p>
                              <p className="font-bold mt-0.5">{p.value[lang]}</p>
                            </div>
                          ))}
                        </div>
                        {cat.id === "moeda" && <CurrencyConverter lang={lang} />}
                        <div className="grid md:grid-cols-2 gap-5">
                          {cat.subs.map((sub, idx) => (
                            <div key={idx}>
                              <h4 className="font-semibold text-sm mb-2 text-foreground/90">
                                {sub.title[lang]}
                              </h4>
                              <ul className="space-y-1.5">
                                {sub.items.map((item, k) => (
                                  <li
                                    key={k}
                                    className="flex items-start gap-2 text-sm text-muted-foreground"
                                  >
                                    <CheckCircle className="size-3.5 text-primary shrink-0 mt-1" />
                                    <span>{item[lang]}</span>
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
        onClick={() => navigate({ to: backTarget })}
        title={pt ? "Início" : "Home"}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl flex items-center justify-center z-40"
        aria-label={pt ? "Ir para o início" : "Go to home"}
      >
        <Home className="size-6" />
      </motion.button>
    </div>
  );
}
