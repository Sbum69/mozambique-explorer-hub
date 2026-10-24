/**
 * Location checks for photo proofs. The server (public.proof_location_check) is the authority:
 * these helpers mirror its rules for display and tests, and the tourist's coordinates are only
 * sent to that RPC — never stored.
 */
export const PROOF_RADIUS_M = 300;
export const PROOF_MAX_ACCURACY_M = 200;
const EARTH_RADIUS_M = 6371000;

/** Great-circle distance in metres (haversine), same formula as public.distance_m. */
export function distanceMeters(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface PreciseLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * true within the radius with good accuracy; false if refused, inaccurate or too far;
 * null when the place has no reference coordinates (manual review).
 */
export function proofLocationVerdict(
  target: [number, number] | null,
  position: PreciseLocation | null,
): boolean | null {
  if (!target) return null;
  if (!position) return false;
  if (!(position.accuracy >= 0) || position.accuracy > PROOF_MAX_ACCURACY_M) return false;
  return distanceMeters(target, [position.lat, position.lng]) <= PROOF_RADIUS_M;
}

/** Asks the browser for a high-accuracy position; resolves null when refused or unavailable. */
export function requestPreciseLocation(timeoutMs = 15000): Promise<PreciseLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

export type ProofReviewStatus = "verified" | "pending" | "approved" | "rejected";

export const PROOF_STATUS_LABEL: Record<ProofReviewStatus, { pt: string; en: string }> = {
  verified: { pt: "Verificada", en: "Verified" },
  approved: { pt: "Verificada", en: "Verified" },
  pending: { pt: "Pendente", en: "Pending" },
  rejected: { pt: "Rejeitada", en: "Rejected" },
};

/** Explanation shown before the browser's location prompt. */
export const LOCATION_PROMPT_TEXT = {
  pt: "Para verificar a prova, vamos pedir a tua localização uma única vez. Só a usamos para calcular a distância ao local; as tuas coordenadas não são guardadas. Se recusares, a prova fica pendente de verificação.",
  en: "To verify the proof we'll ask for your location once. We only use it to calculate the distance to the place; your coordinates are not stored. If you decline, the proof stays pending verification.",
} as const;
