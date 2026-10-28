/** The public OSRM demo is car routing only; do not relabel its estimates. */
export const SUPPORTED_ROUTING_MODES = ["driving"] as const;

export function validMapCoordinate(point: [number, number]): boolean {
  return (
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 90 &&
    Math.abs(point[1]) <= 180
  );
}

export function carRouteUrl(points: [number, number][]): string | null {
  if (points.length < 2 || points.some((point) => !validMapCoordinate(point))) return null;
  return `https://router.project-osrm.org/route/v1/driving/${points.map(([lat, lng]) => `${lng},${lat}`).join(";")}?overview=full&geometries=geojson`;
}
