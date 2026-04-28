import maputo from "@/assets/dest-maputo.jpg";
import ilha from "@/assets/dest-ilha.jpg";
import inhambane from "@/assets/dest-inhambane.jpg";
import vilankulo from "@/assets/dest-vilankulo.jpg";
import pemba from "@/assets/dest-pemba.jpg";
import gorongosa from "@/assets/dest-gorongosa.jpg";

export interface Destination {
  id: string;
  name: string;
  region: { pt: string; en: string };
  description: { pt: string; en: string };
  image: string;
  visitorsK: number;
  badges: ("most-visited" | "most-recommended")[];
  highlights: { pt: string; en: string }[];
  coords: [number, number]; // [lat, lng]
}

export const DESTINATIONS: Destination[] = [
  {
    id: "maputo",
    name: "Maputo",
    region: { pt: "Capital", en: "Capital" },
    description: {
      pt: "A vibrante capital, mistura de história colonial e arte contemporânea.",
      en: "The vibrant capital — a blend of colonial history and contemporary art.",
    },
    image: maputo,
    visitorsK: 125,
    badges: ["most-visited"],
    highlights: [
      { pt: "Mercado Central", en: "Central Market" },
      { pt: "Fortaleza", en: "Fortress" },
      { pt: "Marginal", en: "Marginal" },
    ],
    coords: [-25.9692, 32.5732],
  },
  {
    id: "ilha",
    name: "Ilha de Moçambique",
    region: { pt: "Norte", en: "North" },
    description: {
      pt: "Património Mundial UNESCO, alma da costa swahili.",
      en: "UNESCO World Heritage Site — soul of the Swahili coast.",
    },
    image: ilha,
    visitorsK: 45,
    badges: ["most-recommended"],
    highlights: [
      { pt: "Stone Town", en: "Stone Town" },
      { pt: "Palácio de São Paulo", en: "São Paulo Palace" },
    ],
    coords: [-15.0333, 40.7333],
  },
  {
    id: "inhambane",
    name: "Inhambane",
    region: { pt: "Sul", en: "South" },
    description: {
      pt: "Praias paradisíacas em Tofo e Barra, mergulho de classe mundial.",
      en: "Paradise beaches at Tofo and Barra, world-class diving.",
    },
    image: inhambane,
    visitorsK: 98,
    badges: ["most-visited", "most-recommended"],
    highlights: [
      { pt: "Praia do Tofo", en: "Tofo Beach" },
      { pt: "Mergulho com manta", en: "Manta diving" },
    ],
    coords: [-23.865, 35.3833],
  },
  {
    id: "vilankulo",
    name: "Vilankulo",
    region: { pt: "Centro", en: "Centre" },
    description: {
      pt: "Porta de entrada para o arquipélago do Bazaruto.",
      en: "Gateway to the Bazaruto archipelago.",
    },
    image: vilankulo,
    visitorsK: 78,
    badges: ["most-visited"],
    highlights: [
      { pt: "Bazaruto", en: "Bazaruto" },
      { pt: "Passeio de dhow", en: "Dhow trips" },
    ],
    coords: [-22.0023, 35.3133],
  },
  {
    id: "pemba",
    name: "Pemba",
    region: { pt: "Norte", en: "North" },
    description: {
      pt: "Águas turquesa e portal para as Quirimbas.",
      en: "Turquoise waters and portal to the Quirimbas.",
    },
    image: pemba,
    visitorsK: 32,
    badges: ["most-recommended"],
    highlights: [
      { pt: "Quirimbas", en: "Quirimbas" },
      { pt: "Recifes de coral", en: "Coral reefs" },
    ],
    coords: [-12.974, 40.5178],
  },
  {
    id: "gorongosa",
    name: "Gorongosa",
    region: { pt: "Centro", en: "Centre" },
    description: {
      pt: "Parque nacional renascido, biodiversidade incomparável.",
      en: "Reborn national park with unmatched biodiversity.",
    },
    image: gorongosa,
    visitorsK: 28,
    badges: [],
    highlights: [
      { pt: "Safari", en: "Safari" },
      { pt: "Aves endémicas", en: "Endemic birds" },
    ],
    coords: [-18.8167, 34.5],
  },
];

export const INTERESTS = [
  { id: "beach", emoji: "🏖️", labelKey: "intBeach" as const },
  { id: "culture", emoji: "🎨", labelKey: "intCulture" as const },
  { id: "food", emoji: "🍽️", labelKey: "intFood" as const },
  { id: "nature", emoji: "🌿", labelKey: "intNature" as const },
  { id: "community", emoji: "👥", labelKey: "intCommunity" as const },
  { id: "heritage", emoji: "🏛️", labelKey: "intHeritage" as const },
  { id: "festival", emoji: "🎭", labelKey: "intFestival" as const },
  { id: "adventure", emoji: "🏃", labelKey: "intAdventure" as const },
];
