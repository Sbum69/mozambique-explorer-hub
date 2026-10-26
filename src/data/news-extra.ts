// Editorial travel tips for the News & Alerts page. Events, weather and road alerts were removed in
// DADOS-1: weather is live (Open-Meteo), events and roads stay hidden until a real source exists.

export interface TravelTip {
  id: string;
  title: { pt: string; en: string };
  category: { pt: string; en: string };
  icon: "camera" | "wallet" | "shield" | "compass" | "utensils";
  body: { pt: string; en: string };
}

export const TRAVEL_TIPS: TravelTip[] = [
  {
    id: "t1",
    title: { pt: "Melhor época para fotos", en: "Best time for photos" },
    category: { pt: "Fotografia", en: "Photography" },
    icon: "camera",
    body: {
      pt: "Manhã cedo (6h-8h) e final de tarde (17h-19h) proporcionam luz dourada perfeita.",
      en: "Early morning (6-8am) and late afternoon (5-7pm) give perfect golden light.",
    },
  },
  {
    id: "t2",
    title: { pt: "Levar dinheiro em metical", en: "Carry meticais" },
    category: { pt: "Dinheiro", en: "Money" },
    icon: "wallet",
    body: {
      pt: "Fora das cidades, o cartão raramente funciona. Leva notas pequenas (50-200 MZN).",
      en: "Outside cities, cards rarely work. Carry small bills (50-200 MZN).",
    },
  },
  {
    id: "t3",
    title: { pt: "Segurança em estradas", en: "Road safety" },
    category: { pt: "Segurança", en: "Safety" },
    icon: "shield",
    body: {
      pt: "Evita conduzir à noite em estradas secundárias. Mantém telemóvel carregado.",
      en: "Avoid driving at night on secondary roads. Keep your phone charged.",
    },
  },
  {
    id: "t4",
    title: { pt: "Aprende cumprimentos básicos", en: "Learn basic greetings" },
    category: { pt: "Cultura", en: "Culture" },
    icon: "compass",
    body: {
      pt: "“Olá” em changana é “Avuxeni”. Em macua, “Salaama”. Aproximam-te dos locais.",
      en: '"Hello" in Changana is "Avuxeni"; in Makua, "Salaama". Locals love it.',
    },
  },
  {
    id: "t5",
    title: { pt: "Prova a matapa", en: "Try matapa" },
    category: { pt: "Gastronomia", en: "Food" },
    icon: "utensils",
    body: {
      pt: "Folhas de mandioca com amendoim e coco — o prato nacional. Imperdível.",
      en: "Cassava leaves with peanuts and coconut — the national dish. A must-try.",
    },
  },
];
