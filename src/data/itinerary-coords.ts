// Real geographic coordinates (lat, lng) for stops in SAMPLE_ITINERARIES.
// Keyed by `${itineraryId}:${stopId}`.
export const ITINERARY_STOP_COORDS: Record<string, [number, number]> = {
  // Praias de Inhambane
  "inh001:1": [-23.865, 35.383], // Mercado Central de Inhambane
  "inh001:2": [-23.858, 35.396], // Miradouro da Baía
  "inh001:3": [-23.858, 35.396], // Lenda dos Pescadores (story near miradouro)
  "inh001:4": [-23.856, 35.545], // Tofo Beach
  "inh001:5": [-23.795, 35.526], // Praia da Barra
  "inh001:6": [-23.860, 35.480], // Restaurante Casa Maria

  // Maputo Cultural
  "map002:1": [-25.9655, 32.5832], // Fortaleza de Maputo
  "map002:2": [-25.9700, 32.5730], // Mercado Central
  "map002:3": [-25.9720, 32.6000], // Marginal
  "map002:4": [-25.9682, 32.5745], // Praça da Independência (story)
  "map002:5": [-25.9668, 32.5760], // Café Continental

  // Bazaruto Completo
  "baz003:1": [-21.6650, 35.4700], // Bazaruto Lodge
  "baz003:2": [-21.5700, 35.4900], // Dunas
  "baz003:3": [-21.6300, 35.5100], // Origem das Ilhas (story)
  "baz003:4": [-21.7800, 35.5400], // Two Mile Reef
  "baz003:5": [-21.8500, 35.3600], // Centro de mergulho (Vilankulo)
  "baz003:6": [-22.1200, 35.4800], // Cabo de São Sebastião
  "baz003:7": [-21.7800, 35.5400], // Dugongo (story near reef)
};

// Center fallback (approx. Mozambique center)
export const DEFAULT_MZ_CENTER: [number, number] = [-18.5, 35.5];
