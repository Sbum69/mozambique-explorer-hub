import { SAMPLE_ITINERARIES } from "@/data/itineraries";
import { ITINERARY_STOP_COORDS } from "@/data/itinerary-coords";

export interface TreasureStop {
  id: string;
  name: string;
  place: string;
  kind: "story" | "point" | "beach" | "island";
  coords?: [number, number];
  hint?: string;
  /** English versions where they differ (place names stay as they are). */
  nameEn?: string;
  placeEn?: string;
  hintEn?: string;
}

// Story Stops reais retirados dos roteiros de amostra
const STORY_STOPS: TreasureStop[] = SAMPLE_ITINERARIES.flatMap((it) =>
  it.route
    .filter((s) => s.type === "story")
    .map((s) => ({
      id: `${it.id}:${s.id}`,
      name: s.title ?? "Story Stop",
      nameEn: s.titleEn,
      place: s.location ?? it.name,
      placeEn: s.locationEn ?? (s.location ? undefined : it.nameEn),
      kind: "story" as const,
      coords: ITINERARY_STOP_COORDS[`${it.id}:${s.id}`],
      hint: it.name,
      hintEn: it.nameEn,
    })),
);

// Pontos de bairro (Maputo — Baixa / Polana)
const NEIGHBOURHOOD_STOPS: TreasureStop[] = [
  {
    id: "b1",
    name: "Mercado Central",
    place: "Baixa, Maputo",
    kind: "point",
    coords: [-25.97, 32.573],
    hint: "Art déco de 1901",
    hintEn: "Art deco, 1901",
  },
  {
    id: "b2",
    name: "Fortaleza de Maputo",
    place: "Baixa, Maputo",
    kind: "point",
    coords: [-25.9655, 32.5832],
  },
  {
    id: "b3",
    name: "Casa de Ferro",
    place: "Baixa, Maputo",
    kind: "point",
    coords: [-25.9662, 32.5766],
  },
  {
    id: "b4",
    name: "Estação Central (CFM)",
    place: "Baixa, Maputo",
    kind: "point",
    coords: [-25.9686, 32.5761],
  },
  {
    id: "b5",
    name: "Catedral de N. Sra. da Conceição",
    place: "Baixa, Maputo",
    kind: "point",
    coords: [-25.9668, 32.5772],
  },
  {
    id: "b6",
    name: "Praça da Independência",
    place: "Baixa, Maputo",
    kind: "point",
    coords: [-25.9682, 32.5745],
  },
  {
    id: "b7",
    name: "Feira de Artesanato da Praça 25",
    place: "Polana, Maputo",
    kind: "point",
    coords: [-25.9635, 32.5885],
  },
  {
    id: "b8",
    name: "Marginal / Miradouro da Baía",
    place: "Sommerschield, Maputo",
    kind: "point",
    coords: [-25.972, 32.6],
  },
];

// Praias
const BEACH_STOPS: TreasureStop[] = [
  { id: "p1", name: "Praia do Tofo", place: "Inhambane", kind: "beach", coords: [-23.856, 35.545] },
  {
    id: "p2",
    name: "Praia da Barra",
    place: "Inhambane",
    kind: "beach",
    coords: [-23.795, 35.526],
  },
  {
    id: "p3",
    name: "Praia de Vilankulo",
    place: "Vilankulo",
    kind: "beach",
    coords: [-22.0023, 35.3133],
  },
  {
    id: "p4",
    name: "Praia da Macaneta",
    place: "Maputo",
    kind: "beach",
    coords: [-25.7167, 32.7833],
  },
  { id: "p5", name: "Praia de Wimbe", place: "Pemba", kind: "beach", coords: [-12.9833, 40.5333] },
  {
    id: "p6",
    name: "Praia de Ponta do Ouro",
    place: "Maputo",
    kind: "beach",
    coords: [-26.8397, 32.8867],
  },
];

// Ilhas / arquipélago
const ISLAND_STOPS: TreasureStop[] = [
  {
    id: "i1",
    name: "Ilha de Bazaruto",
    place: "Arquipélago de Bazaruto",
    kind: "island",
    coords: [-21.665, 35.47],
  },
  {
    id: "i2",
    name: "Ilha de Benguerra",
    place: "Arquipélago de Bazaruto",
    kind: "island",
    coords: [-21.86, 35.49],
  },
  {
    id: "i3",
    name: "Two Mile Reef",
    place: "Arquipélago de Bazaruto",
    kind: "island",
    coords: [-21.78, 35.54],
  },
  {
    id: "i4",
    name: "Ilha de Magaruque",
    place: "Arquipélago de Bazaruto",
    kind: "island",
    coords: [-21.96, 35.42],
  },
];

/** Lista de paragens elegíveis por desafio de caça ao tesouro */
export const TREASURE_STOPS_BY_GAME: Record<string, TreasureStop[]> = {
  g1: STORY_STOPS,
  g2: NEIGHBOURHOOD_STOPS,
  g3: BEACH_STOPS,
  g4: ISLAND_STOPS,
};

export function getTreasureStops(gameId: string): TreasureStop[] {
  return TREASURE_STOPS_BY_GAME[gameId] ?? [...STORY_STOPS, ...NEIGHBOURHOOD_STOPS, ...BEACH_STOPS];
}
