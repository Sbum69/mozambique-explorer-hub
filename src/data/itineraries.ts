import maputo from "@/assets/dest-maputo.jpg";
import ilha from "@/assets/dest-ilha.jpg";
import inhambane from "@/assets/dest-inhambane.jpg";
import vilankulo from "@/assets/dest-vilankulo.jpg";

export type StopType = "business" | "waypoint" | "story";
export type Difficulty = "Fácil" | "Moderado" | "Difícil";

export interface ItineraryStop {
  id: number;
  type: StopType;
  name?: string;
  title?: string; // for stories
  location?: string; // for stories
  description?: string;
  story?: string;
  culturalContext?: string;
  category?: string;
  duration?: string;
  entryFee?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  tips?: string;
  sponsored?: boolean;
  scenic?: boolean;
  rating?: number;
  x: number;
  y: number;
}

export interface Itinerary {
  id: string;
  code: string;
  name: string;
  description: string;
  image: string;
  duration: string;
  cost: number;
  stops: number;
  waypoints: number;
  storyStops: number;
  difficulty: Difficulty;
  rating: number;
  totalReviews: number;
  gradient: string;
  route: ItineraryStop[];
}

export const SAMPLE_ITINERARIES: Itinerary[] = [
  {
    id: "inh001",
    code: "INH001",
    name: "Praias de Inhambane",
    description: "Mergulha nas praias paradisíacas e na cultura costeira de Inhambane.",
    image: inhambane,
    duration: "3 dias",
    cost: 120,
    stops: 6,
    waypoints: 2,
    storyStops: 1,
    difficulty: "Fácil",
    rating: 4.9,
    totalReviews: 342,
    gradient: "from-orange-500 to-amber-600",
    route: [
      {
        id: 1,
        type: "business",
        name: "Mercado Central de Inhambane",
        category: "market",
        description: "Mercado vibrante com artesanato e produtos locais.",
        duration: "60 min",
        entryFee: "Grátis",
        phone: "+258 84 111 2222",
        openingHours: "07:00 - 17:00",
        tips: "Negoceia sempre — faz parte da cultura.",
        sponsored: true,
        rating: 4.7,
        x: 20,
        y: 35,
      },
      {
        id: 2,
        type: "waypoint",
        name: "Miradouro da Baía",
        description: "Vista panorâmica sobre a baía de Inhambane.",
        duration: "30 min",
        tips: "Melhor ao pôr do sol.",
        scenic: true,
        x: 40,
        y: 25,
      },
      {
        id: 3,
        type: "story",
        title: "A Lenda dos Pescadores",
        location: "Baía de Inhambane",
        story:
          "Conta-se que os antigos pescadores da baía recebiam visitas de espíritos do mar que lhes indicavam onde lançar as redes. Em troca, deixavam oferendas de coco e milho na areia. Ainda hoje, os mais velhos respeitam este ritual antes de sair para o mar.",
        culturalContext:
          "Tradição oral da comunidade Tonga, transmitida há gerações.",
        x: 40,
        y: 25,
      },
      {
        id: 4,
        type: "business",
        name: "Tofo Beach Resort",
        category: "experience",
        description: "Resort com acesso direto à praia de Tofo.",
        duration: "120 min",
        entryFee: "$25",
        phone: "+258 84 333 4444",
        website: "https://tofobeach.example.mz",
        openingHours: "24h",
        tips: "Snorkeling com tubarões-baleia disponível.",
        sponsored: false,
        rating: 4.8,
        x: 65,
        y: 50,
      },
      {
        id: 5,
        type: "waypoint",
        name: "Praia da Barra",
        description: "Praia tranquila com dunas brancas.",
        duration: "90 min",
        tips: "Leva água — não há comércio próximo.",
        scenic: true,
        x: 80,
        y: 70,
      },
      {
        id: 6,
        type: "business",
        name: "Restaurante Casa Maria",
        category: "food",
        description: "Pratos tradicionais de marisco fresco.",
        duration: "75 min",
        entryFee: "$15",
        phone: "+258 84 555 6666",
        openingHours: "12:00 - 22:00",
        tips: "Experimenta a matapa de caranguejo.",
        sponsored: true,
        rating: 4.9,
        x: 55,
        y: 80,
      },
    ],
  },
  {
    id: "map002",
    code: "MAP002",
    name: "Maputo Cultural",
    description: "Descobre a história colonial e a arte vibrante da capital.",
    image: maputo,
    duration: "2 dias",
    cost: 65,
    stops: 5,
    waypoints: 1,
    storyStops: 1,
    difficulty: "Moderado",
    rating: 4.7,
    totalReviews: 218,
    gradient: "from-purple-500 to-purple-700",
    route: [
      {
        id: 1,
        type: "business",
        name: "Fortaleza de Maputo",
        category: "cultural",
        description: "Fortaleza histórica do século XIX.",
        duration: "90 min",
        entryFee: "$5",
        phone: "+258 21 123 456",
        openingHours: "09:00 - 17:00",
        tips: "Visita guiada em PT e EN.",
        sponsored: false,
        rating: 4.6,
        x: 25,
        y: 30,
      },
      {
        id: 2,
        type: "business",
        name: "Mercado Central",
        category: "market",
        description: "Arquitetura art déco e produtos frescos.",
        duration: "60 min",
        entryFee: "Grátis",
        openingHours: "06:00 - 18:00",
        tips: "Experimenta o pão fresco da manhã.",
        sponsored: true,
        rating: 4.5,
        x: 50,
        y: 45,
      },
      {
        id: 3,
        type: "waypoint",
        name: "Marginal",
        description: "Avenida costeira com vista para a baía.",
        duration: "45 min",
        scenic: true,
        x: 70,
        y: 35,
      },
      {
        id: 4,
        type: "story",
        title: "O Mural da Independência",
        location: "Praça da Independência",
        story:
          "Em 1975, artistas locais pintaram um mural gigante para celebrar a independência. As cores e símbolos contam a luta do povo moçambicano contra o domínio colonial.",
        culturalContext: "Marco da identidade nacional pós-colonial.",
        x: 60,
        y: 55,
      },
      {
        id: 5,
        type: "business",
        name: "Café Continental",
        category: "food",
        description: "Café histórico desde 1922.",
        duration: "45 min",
        entryFee: "$8",
        openingHours: "07:00 - 23:00",
        tips: "Pede o galão à moda da casa.",
        sponsored: false,
        rating: 4.7,
        x: 40,
        y: 70,
      },
    ],
  },
  {
    id: "baz003",
    code: "BAZ003",
    name: "Bazaruto Completo",
    description: "Expedição completa pelo arquipélago de Bazaruto.",
    image: vilankulo,
    duration: "5 dias",
    cost: 380,
    stops: 7,
    waypoints: 3,
    storyStops: 2,
    difficulty: "Difícil",
    rating: 4.95,
    totalReviews: 156,
    gradient: "from-cyan-500 to-blue-700",
    route: [
      {
        id: 1,
        type: "business",
        name: "Bazaruto Paradise Lodge",
        category: "experience",
        description: "Lodge premium na ilha principal.",
        duration: "1 noite",
        entryFee: "$120",
        phone: "+258 84 777 8888",
        website: "https://bazaruto.example.mz",
        sponsored: true,
        rating: 4.95,
        x: 30,
        y: 30,
      },
      {
        id: 2,
        type: "waypoint",
        name: "Dunas de Bazaruto",
        description: "Dunas de areia branca com 100m de altura.",
        duration: "120 min",
        scenic: true,
        x: 50,
        y: 20,
      },
      {
        id: 3,
        type: "story",
        title: "A Origem das Ilhas",
        location: "Arquipélago",
        story:
          "Os antigos diziam que as ilhas eram fragmentos de um continente que se separou para proteger uma raça de sereias dos pescadores gananciosos.",
        culturalContext: "Mitologia marítima da costa de Inhambane.",
        x: 50,
        y: 40,
      },
      {
        id: 4,
        type: "waypoint",
        name: "Two Mile Reef",
        description: "Recife de coral com biodiversidade única.",
        duration: "180 min",
        scenic: true,
        x: 70,
        y: 50,
      },
      {
        id: 5,
        type: "business",
        name: "Centro de Mergulho Local",
        category: "experience",
        description: "Mergulho com tubarões-touro.",
        duration: "240 min",
        entryFee: "$95",
        phone: "+258 84 999 0000",
        sponsored: false,
        rating: 4.9,
        x: 60,
        y: 65,
      },
      {
        id: 6,
        type: "waypoint",
        name: "Cabo de São Sebastião",
        description: "Ponto mais a sul do arquipélago.",
        duration: "60 min",
        scenic: true,
        x: 80,
        y: 75,
      },
      {
        id: 7,
        type: "story",
        title: "O Dugongo Sagrado",
        location: "Two Mile Reef",
        story:
          "Os dugongos do arquipélago são considerados sagrados — caçá-los traz infortúnio à comunidade pesqueira por sete gerações.",
        culturalContext:
          "Tabu ecológico que ajudou a preservar a espécie ameaçada.",
        x: 70,
        y: 85,
      },
    ],
  },
];

// ----- LocalStorage user itineraries -----
const USER_KEY = "ekaya.user.itineraries";

export function getUserItineraries(): Itinerary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Itinerary[]) : [];
  } catch {
    return [];
  }
}

export function saveUserItineraries(list: Itinerary[]) {
  localStorage.setItem(USER_KEY, JSON.stringify(list));
}

export function addUserItinerary(it: Itinerary) {
  const list = getUserItineraries();
  saveUserItineraries([it, ...list.filter((x) => x.id !== it.id)]);
}

export function findItineraryByCode(code: string): Itinerary | undefined {
  const all = [...SAMPLE_ITINERARIES, ...getUserItineraries()];
  return all.find((i) => i.code.toUpperCase() === code.toUpperCase());
}

export function findItineraryById(id: string): Itinerary | undefined {
  const all = [...SAMPLE_ITINERARIES, ...getUserItineraries()];
  return all.find((i) => i.id === id);
}

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
