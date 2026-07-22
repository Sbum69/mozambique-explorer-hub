// Maps destination ids to a recommended itinerary id from SAMPLE_ITINERARIES.
export const DESTINATION_ITINERARY: Record<string, string> = {
  inhambane: "inh001",
  vilankulo: "baz003",
  maputo: "map002",
  ilha: "inh001",
  pemba: "baz003",
  gorongosa: "inh001",
};

// Inverse mapping: which destinations each itinerary covers.
export const ITINERARY_DESTINATIONS: Record<string, string[]> = Object.entries(
  DESTINATION_ITINERARY,
).reduce<Record<string, string[]>>((acc, [dest, itin]) => {
  (acc[itin] ||= []).push(dest);
  return acc;
}, {});

