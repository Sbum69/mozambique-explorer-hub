import maputo from "@/assets/dest-maputo.jpg";
import ilha from "@/assets/dest-ilha.jpg";
import inhambane from "@/assets/dest-inhambane.jpg";
import vilankulo from "@/assets/dest-vilankulo.jpg";
import pemba from "@/assets/dest-pemba.jpg";
import gorongosa from "@/assets/dest-gorongosa.jpg";

export type ExperienceCategory = "beach" | "culture" | "food" | "nature" | "community" | "adventure";

export interface Experience {
  id: string;
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  location: string;
  destinationId: string;
  image: string;
  category: ExperienceCategory;
  durationHours: number;
  priceMzn: number;
  rating: number;
  reviews: number;
  host: string;
}

export const EXPERIENCES: Experience[] = [
  {
    id: "dhow-bazaruto",
    title: { pt: "Passeio de Dhow em Bazaruto", en: "Dhow trip around Bazaruto" },
    description: {
      pt: "Velejar num dhow tradicional pelas águas turquesa do arquipélago com pescadores locais.",
      en: "Sail a traditional dhow across the turquoise archipelago waters with local fishermen.",
    },
    location: "Vilankulo",
    destinationId: "vilankulo",
    image: vilankulo,
    category: "beach",
    durationHours: 6,
    priceMzn: 2500,
    rating: 4.9,
    reviews: 184,
    host: "Capitão Sálvio",
  },
  {
    id: "tofo-diving",
    title: { pt: "Mergulho com mantas no Tofo", en: "Manta diving in Tofo" },
    description: {
      pt: "Mergulho guiado em pontos famosos do Tofo, com hipótese de encontrar mantas e tubarões-baleia.",
      en: "Guided dive at Tofo's famous sites with the chance to spot mantas and whale sharks.",
    },
    location: "Inhambane",
    destinationId: "inhambane",
    image: inhambane,
    category: "adventure",
    durationHours: 4,
    priceMzn: 3200,
    rating: 4.8,
    reviews: 312,
    host: "Tofo Dive Co-op",
  },
  {
    id: "ilha-walk",
    title: { pt: "Caminhada cultural em Stone Town", en: "Cultural walk in Stone Town" },
    description: {
      pt: "Descobre a Ilha de Moçambique pelos olhos de um guia local: arquitetura swahili, fortaleza e museus.",
      en: "Discover Ilha de Moçambique through a local guide: Swahili architecture, fortress and museums.",
    },
    location: "Ilha de Moçambique",
    destinationId: "ilha",
    image: ilha,
    category: "culture",
    durationHours: 3,
    priceMzn: 800,
    rating: 4.9,
    reviews: 96,
    host: "Aissa",
  },
  {
    id: "maputo-food",
    title: { pt: "Tour gastronómico no Mercado Central", en: "Food tour at the Central Market" },
    description: {
      pt: "Prova matapa, pãezinhos, peixe grelhado e rissóis num percurso pelas bancas mais autênticas.",
      en: "Taste matapa, fresh bread, grilled fish and rissóis on a route through the most authentic stalls.",
    },
    location: "Maputo",
    destinationId: "maputo",
    image: maputo,
    category: "food",
    durationHours: 2,
    priceMzn: 1200,
    rating: 4.7,
    reviews: 251,
    host: "Banca da Maria",
  },
  {
    id: "gorongosa-safari",
    title: { pt: "Safari ao nascer do sol em Gorongosa", en: "Sunrise safari in Gorongosa" },
    description: {
      pt: "Game drive de 3 horas com ranger local pela savana renascida — elefantes, leões e aves endémicas.",
      en: "3-hour game drive with a local ranger across the reborn savanna — elephants, lions and endemic birds.",
    },
    location: "Parque Nacional de Gorongosa",
    destinationId: "gorongosa",
    image: gorongosa,
    category: "nature",
    durationHours: 3,
    priceMzn: 4500,
    rating: 5.0,
    reviews: 142,
    host: "Gorongosa Rangers",
  },
  {
    id: "pemba-community",
    title: { pt: "Visita à comunidade pesqueira de Wimbi", en: "Visit to Wimbi fishing community" },
    description: {
      pt: "Conhece pescadores macuas, aprende a preparar matapa de siri-siri e ajuda a puxar a rede ao fim da tarde.",
      en: "Meet Makua fishermen, learn to cook matapa siri-siri and help pull in the net at sunset.",
    },
    location: "Pemba",
    destinationId: "pemba",
    image: pemba,
    category: "community",
    durationHours: 5,
    priceMzn: 1800,
    rating: 4.9,
    reviews: 67,
    host: "Cooperativa Wimbi",
  },
  {
    id: "marrabenta-night",
    title: { pt: "Noite de Marrabenta em Maputo", en: "Marrabenta night in Maputo" },
    description: {
      pt: "Concerto íntimo de marrabenta numa casa cultural com jantar moçambicano incluído.",
      en: "Intimate marrabenta concert at a cultural house, Mozambican dinner included.",
    },
    location: "Maputo",
    destinationId: "maputo",
    image: maputo,
    category: "culture",
    durationHours: 4,
    priceMzn: 1500,
    rating: 4.8,
    reviews: 89,
    host: "Casa Cultural Xilunguine",
  },
  {
    id: "quirimbas-kayak",
    title: { pt: "Kayak nas Quirimbas", en: "Kayaking the Quirimbas" },
    description: {
      pt: "Aventura de meio-dia entre ilhotas, mangais e recifes virgens do arquipélago das Quirimbas.",
      en: "Half-day adventure between islets, mangroves and virgin reefs of the Quirimbas archipelago.",
    },
    location: "Pemba",
    destinationId: "pemba",
    image: pemba,
    category: "adventure",
    durationHours: 4,
    priceMzn: 2200,
    rating: 4.8,
    reviews: 54,
    host: "Quirimbas Wild",
  },
];
