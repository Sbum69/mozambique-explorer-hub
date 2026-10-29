// Real geographic coordinates (lat, lng) for stops in SAMPLE_ITINERARIES.
// Keyed by `${itineraryId}:${stopId}`.
export const ITINERARY_STOP_COORDS: Record<string, [number, number]> = {
  // Praias de Inhambane
  "inh001:1": [-23.865, 35.383], // Mercado Central de Inhambane
  "inh001:2": [-23.858, 35.396], // Miradouro da Baía
  "inh001:3": [-23.858, 35.396], // Lenda dos Pescadores (story near miradouro)
  "inh001:4": [-23.856, 35.545], // Tofo Beach
  "inh001:5": [-23.795, 35.526], // Praia da Barra
  "inh001:6": [-23.86, 35.48], // Restaurante Casa Maria

  // Maputo Cultural
  "map002:1": [-25.9655, 32.5832], // Fortaleza de Maputo
  "map002:2": [-25.97, 32.573], // Mercado Central
  "map002:3": [-25.972, 32.6], // Marginal
  "map002:4": [-25.9682, 32.5745], // Praça da Independência (story)
  "map002:5": [-25.9668, 32.576], // Café Continental

  // Bazaruto Completo
  "baz003:1": [-21.665, 35.47], // Bazaruto Lodge
  "baz003:2": [-21.57, 35.49], // Dunas
  "baz003:3": [-21.63, 35.51], // Origem das Ilhas (story)
  "baz003:4": [-21.78, 35.54], // Two Mile Reef
  "baz003:5": [-21.85, 35.36], // Centro de mergulho (Vilankulo)
  "baz003:6": [-22.12, 35.48], // Cabo de São Sebastião
  "baz003:7": [-21.78, 35.54], // Dugongo (story near reef)
};

// Center fallback (approx. Mozambique center)
export const DEFAULT_MZ_CENTER: [number, number] = [-18.5, 35.5];
