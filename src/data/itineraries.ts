import maputo from "@/assets/dest-maputo.webp";
import ilha from "@/assets/dest-ilha.webp";
import inhambane from "@/assets/dest-inhambane.webp";
import vilankulo from "@/assets/dest-vilankulo.webp";

export type StopType = "business" | "waypoint" | "story";
export type Difficulty = "Fácil" | "Moderado" | "Difícil";

/**
 * Legacy sample itineraries (home stories, game challenges). Contacts, prices, opening hours,
 * ratings and "sponsored" flags were invented placeholders and were removed (I18N-2); real data
 * comes from the database.
 */
export interface ItineraryStop {
  id: number;
  type: StopType;
  name?: string;
  title?: string; // for stories
  titleEn?: string;
  location?: string; // for stories
  locationEn?: string;
  description?: string;
  story?: string;
  storyEn?: string;
  culturalContext?: string;
  culturalContextEn?: string;
  category?: string;
  duration?: string;
  tips?: string;
  scenic?: boolean;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

export interface Itinerary {
  id: string;
  code: string;
  /** Same itinerary in the database (routes.id), when it exists; links go there. */
  routeId: string | null;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  duration: string;
  durationEn: string;
  stops: number;
  waypoints: number;
  storyStops: number;
  difficulty: Difficulty;
  gradient: string;
  route: ItineraryStop[];
}

export const SAMPLE_ITINERARIES: Itinerary[] = [
  {
    id: "inh001",
    code: "INH001",
    routeId: "11111111-1111-4111-8111-111111111111",
    name: "Praias de Inhambane",
    nameEn: "Inhambane Beaches",
    description: "Mergulha nas praias paradisíacas e na cultura costeira de Inhambane.",
    descriptionEn: "Dive into Inhambane's paradise beaches and coastal culture.",
    image: inhambane,
    duration: "3 dias",
    durationEn: "3 days",
    stops: 6,
    waypoints: 2,
    storyStops: 1,
    difficulty: "Fácil",
    gradient: "from-orange-500 to-amber-600",
    route: [
      {
        id: 1,
        type: "business",
        name: "Mercado Central de Inhambane",
        category: "market",
        description: "Mercado vibrante com artesanato e produtos locais.",
        duration: "60 min",
        tips: "Negoceia sempre — faz parte da cultura.",
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
        titleEn: "The Fishermen's Legend",
        location: "Baía de Inhambane",
        locationEn: "Inhambane Bay",
        story:
          "Conta-se que os antigos pescadores da baía recebiam visitas de espíritos do mar que lhes indicavam onde lançar as redes. Em troca, deixavam oferendas de coco e milho na areia. Ainda hoje, os mais velhos respeitam este ritual antes de sair para o mar.",
        storyEn:
          "It is said that the bay's old fishermen were visited by sea spirits who showed them where to cast their nets. In return, they left offerings of coconut and maize on the sand. To this day, the elders respect this ritual before heading out to sea.",
        culturalContext: "Tradição oral da comunidade Tonga, transmitida há gerações.",
        culturalContextEn: "Oral tradition of the Tonga community, passed down for generations.",
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
        tips: "Snorkeling com tubarões-baleia disponível.",
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
        tips: "Experimenta a matapa de caranguejo.",
        x: 55,
        y: 80,
      },
    ],
  },
  {
    id: "map002",
    code: "MAP002",
    routeId: "22222222-2222-4222-8222-222222222222",
    name: "Maputo Cultural",
    nameEn: "Cultural Maputo",
    description: "Descobre a história colonial e a arte vibrante da capital.",
    descriptionEn: "Discover the colonial history and vibrant art of the capital.",
    image: maputo,
    duration: "2 dias",
    durationEn: "2 days",
    stops: 5,
    waypoints: 1,
    storyStops: 1,
    difficulty: "Moderado",
    gradient: "from-purple-500 to-purple-700",
    route: [
      {
        id: 1,
        type: "business",
        name: "Fortaleza de Maputo",
        category: "cultural",
        description: "Fortaleza histórica do século XIX.",
        duration: "90 min",
        tips: "Visita guiada em PT e EN.",
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
        tips: "Experimenta o pão fresco da manhã.",
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
        titleEn: "The Independence Mural",
        location: "Praça da Independência",
        story:
          "Em 1975, artistas locais pintaram um mural gigante para celebrar a independência. As cores e símbolos contam a luta do povo moçambicano contra o domínio colonial.",
        storyEn:
          "In 1975, local artists painted a giant mural to celebrate independence. Its colours and symbols tell of the Mozambican people's struggle against colonial rule.",
        culturalContext: "Marco da identidade nacional pós-colonial.",
        culturalContextEn: "A landmark of post-colonial national identity.",
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
        tips: "Pede o galão à moda da casa.",
        x: 40,
        y: 70,
      },
    ],
  },
  {
    id: "baz003",
    code: "BAZ003",
    routeId: null,
    name: "Bazaruto Completo",
    nameEn: "Complete Bazaruto",
    description: "Expedição completa pelo arquipélago de Bazaruto.",
    descriptionEn: "A complete expedition through the Bazaruto archipelago.",
    image: vilankulo,
    duration: "5 dias",
    durationEn: "5 days",
    stops: 7,
    waypoints: 3,
    storyStops: 2,
    difficulty: "Difícil",
    gradient: "from-cyan-500 to-blue-700",
    route: [
      {
        id: 1,
        type: "business",
        name: "Bazaruto Paradise Lodge",
        category: "experience",
        description: "Lodge premium na ilha principal.",
        duration: "1 noite",
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
        titleEn: "The Origin of the Islands",
        location: "Arquipélago",
        locationEn: "Archipelago",
        story:
          "Os antigos diziam que as ilhas eram fragmentos de um continente que se separou para proteger uma raça de sereias dos pescadores gananciosos.",
        storyEn:
          "The elders said the islands were fragments of a continent that broke away to protect a race of mermaids from greedy fishermen.",
        culturalContext: "Mitologia marítima da costa de Inhambane.",
        culturalContextEn: "Maritime mythology of the Inhambane coast.",
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
        titleEn: "The Sacred Dugong",
        location: "Two Mile Reef",
        story:
          "Os dugongos do arquipélago são considerados sagrados — caçá-los traz infortúnio à comunidade pesqueira por sete gerações.",
        storyEn:
          "The archipelago's dugongs are considered sacred — hunting them brings misfortune to the fishing community for seven generations.",
        culturalContext: "Tabu ecológico que ajudou a preservar a espécie ameaçada.",
        culturalContextEn: "An ecological taboo that helped preserve the endangered species.",
        x: 70,
        y: 85,
      },
    ],
  },
];

/**
 * Real itineraries (routes) now live in the database — see `@/lib/routes`.
 * The sample data above remains only as narrative content for the
 * gamification/story features, which are not migrated yet.
 */
