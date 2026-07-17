// Extra data for News & Alerts page (events, weather, road alerts, tips)

export interface EventItem {
  id: string;
  title: { pt: string; en: string };
  category: { pt: string; en: string };
  date: { pt: string; en: string };
  location: string;
  description: { pt: string; en: string };
  attendees: number;
  price: { pt: string; en: string };
  gradient: string;
  image: string;
}

export interface WeatherDay {
  label: { pt: string; en: string };
  icon: "sun" | "cloud" | "rain" | "storm";
  tempC: number;
}
export interface WeatherCity {
  city: string;
  tempC: number;
  condition: { pt: string; en: string };
  icon: "sun" | "cloud" | "rain" | "storm";
  humidity: number;
  windKmh: number;
  forecast: WeatherDay[];
  image: string;
}

export interface RoadAlert {
  id: string;
  title: { pt: string; en: string };
  severity: "low" | "medium" | "high";
  location: string;
  postedAgo: { pt: string; en: string };
  description: { pt: string; en: string };
  duration: { pt: string; en: string };
  alternative: { pt: string; en: string };
  image: string;
}

export interface TravelTip {
  id: string;
  title: { pt: string; en: string };
  category: { pt: string; en: string };
  icon: "camera" | "wallet" | "shield" | "compass" | "utensils";
  body: { pt: string; en: string };
}

export const EVENTS: EventItem[] = [
  {
    id: "ev1",
    title: { pt: "Festival de Gastronomia Moçambicana", en: "Mozambican Food Festival" },
    category: { pt: "Gastronomia", en: "Food" },
    date: { pt: "15-17 Março 2026", en: "March 15-17, 2026" },
    location: "Maputo",
    description: {
      pt: "3 dias celebrando os sabores únicos de Moçambique com chefs convidados.",
      en: "3 days celebrating Mozambique's unique flavors with guest chefs.",
    },
    attendees: 500,
    price: { pt: "Gratuito", en: "Free" },
    gradient: "from-orange-500 to-red-500",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=500&fit=crop",
  },
  {
    id: "ev2",
    title: { pt: "Marrabenta no Centro Cultural Franco", en: "Marrabenta at Franco Cultural Center" },
    category: { pt: "Música", en: "Music" },
    date: { pt: "22 Março 2026", en: "March 22, 2026" },
    location: "Maputo",
    description: {
      pt: "Concerto íntimo com mestres da marrabenta clássica.",
      en: "Intimate concert with classical marrabenta masters.",
    },
    attendees: 200,
    price: { pt: "250 MZN", en: "250 MZN" },
    gradient: "from-purple-500 to-pink-500",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=500&fit=crop",
  },
  {
    id: "ev3",
    title: { pt: "Feira do Caju de Nampula", en: "Nampula Cashew Fair" },
    category: { pt: "Feira", en: "Fair" },
    date: { pt: "5-7 Maio 2026", en: "May 5-7, 2026" },
    location: "Nampula",
    description: {
      pt: "Produtores de 6 províncias, provas e workshops.",
      en: "Producers from 6 provinces, tastings and workshops.",
    },
    attendees: 1200,
    price: { pt: "Gratuito", en: "Free" },
    gradient: "from-amber-500 to-orange-600",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=500&fit=crop",
  },
  {
    id: "ev4",
    title: { pt: "Festival de Cinema da Ilha", en: "Island Film Festival" },
    category: { pt: "Cultura", en: "Culture" },
    date: { pt: "10-14 Junho 2026", en: "June 10-14, 2026" },
    location: "Ilha de Moçambique",
    description: {
      pt: "5 noites de cinema africano em locais históricos.",
      en: "5 nights of African cinema at historic venues.",
    },
    attendees: 800,
    price: { pt: "Gratuito", en: "Free" },
    gradient: "from-blue-500 to-cyan-500",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=500&fit=crop",
  },
];

export const WEATHER: WeatherCity[] = [
  {
    city: "Maputo",
    tempC: 28,
    condition: { pt: "Ensolarado", en: "Sunny" },
    icon: "sun",
    humidity: 65,
    windKmh: 12,
    forecast: [
      { label: { pt: "Qua", en: "Wed" }, icon: "sun", tempC: 29 },
      { label: { pt: "Qui", en: "Thu" }, icon: "sun", tempC: 28 },
      { label: { pt: "Sex", en: "Fri" }, icon: "cloud", tempC: 26 },
      { label: { pt: "Sáb", en: "Sat" }, icon: "rain", tempC: 24 },
    ],
    image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=500&fit=crop",
  },
  {
    city: "Inhambane",
    tempC: 30,
    condition: { pt: "Parc. nublado", en: "Partly cloudy" },
    icon: "cloud",
    humidity: 72,
    windKmh: 18,
    forecast: [
      { label: { pt: "Qua", en: "Wed" }, icon: "cloud", tempC: 30 },
      { label: { pt: "Qui", en: "Thu" }, icon: "rain", tempC: 27 },
      { label: { pt: "Sex", en: "Fri" }, icon: "rain", tempC: 26 },
      { label: { pt: "Sáb", en: "Sat" }, icon: "sun", tempC: 29 },
    ],
    image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=500&fit=crop",
  },
  {
    city: "Pemba",
    tempC: 32,
    condition: { pt: "Ensolarado", en: "Sunny" },
    icon: "sun",
    humidity: 60,
    windKmh: 14,
    forecast: [
      { label: { pt: "Qua", en: "Wed" }, icon: "sun", tempC: 32 },
      { label: { pt: "Qui", en: "Thu" }, icon: "sun", tempC: 33 },
      { label: { pt: "Sex", en: "Fri" }, icon: "cloud", tempC: 31 },
      { label: { pt: "Sáb", en: "Sat" }, icon: "sun", tempC: 32 },
    ],
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop",
  },
  {
    city: "Gorongosa",
    tempC: 25,
    condition: { pt: "Nublado", en: "Cloudy" },
    icon: "cloud",
    humidity: 78,
    windKmh: 8,
    forecast: [
      { label: { pt: "Qua", en: "Wed" }, icon: "cloud", tempC: 25 },
      { label: { pt: "Qui", en: "Thu" }, icon: "rain", tempC: 22 },
      { label: { pt: "Sex", en: "Fri" }, icon: "storm", tempC: 21 },
      { label: { pt: "Sáb", en: "Sat" }, icon: "cloud", tempC: 24 },
    ],
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=500&fit=crop",
  },
];

export const ROAD_ALERTS: RoadAlert[] = [
  {
    id: "r1",
    title: { pt: "EN1 Maputo-Xai-Xai: Obras em curso", en: "EN1 Maputo-Xai-Xai: Road works" },
    severity: "high",
    location: "Km 45-52",
    postedAgo: { pt: "Há 2 horas", en: "2 hours ago" },
    description: {
      pt: "Trabalhos de reabilitação causam desvios. Tempo adicional ~30min.",
      en: "Rehabilitation works cause detours. Extra ~30min travel time.",
    },
    duration: { pt: "5 dias", en: "5 days" },
    alternative: { pt: "Via EN2 (Moamba)", en: "Via EN2 (Moamba)" },
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=500&fit=crop",
  },
  {
    id: "r2",
    title: { pt: "EN6 Beira-Chimoio: Visibilidade reduzida", en: "EN6 Beira-Chimoio: Low visibility" },
    severity: "medium",
    location: "Km 120-135",
    postedAgo: { pt: "Há 5 horas", en: "5 hours ago" },
    description: {
      pt: "Nevoeiro matinal frequente. Conduza com cuidado entre 5h-8h.",
      en: "Frequent morning fog. Drive carefully between 5am-8am.",
    },
    duration: { pt: "Temporário", en: "Temporary" },
    alternative: { pt: "Atrasar partida para depois das 9h", en: "Delay departure to after 9am" },
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=500&fit=crop",
  },
  {
    id: "r3",
    title: { pt: "Estrada para Vilankulo: Asfalto novo", en: "Road to Vilankulo: New asphalt" },
    severity: "low",
    location: "EN1 Sul de Vilankulo",
    postedAgo: { pt: "Ontem", en: "Yesterday" },
    description: {
      pt: "Troço repavimentado. Trânsito flui sem restrições.",
      en: "Section repaved. Traffic flowing without restrictions.",
    },
    duration: { pt: "Concluído", en: "Completed" },
    alternative: { pt: "—", en: "—" },
    image: "https://images.unsplash.com/photo-1503437313881-503a91226402?w=800&h=500&fit=crop",
  },
];

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
