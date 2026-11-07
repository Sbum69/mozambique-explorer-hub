/**
 * Itinerary directions. The app no longer calculates routes: the OSRM demo server it used is not
 * meant for production or commercial use. The map draws the stop order (dashed line, not a road
 * route) and hands directions to Google Maps or OpenStreetMap with the real stop coordinates.
 */

export function validMapCoordinate(point: [number, number]): boolean {
  return (
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 90 &&
    Math.abs(point[1]) <= 180
  );
}

const usable = (points: [number, number][]) =>
  points.length > 0 && points.every((p) => validMapCoordinate(p));

/** Google Maps directions through every stop, in visiting order. */
export function googleDirectionsUrl(points: [number, number][]): string | null {
  if (!usable(points)) return null;
  return `https://www.google.com/maps/dir/${points.map(([lat, lng]) => `${lat},${lng}`).join("/")}`;
}

/** OpenStreetMap directions from the first to the last stop (the site takes two points only). */
export function osmDirectionsUrl(points: [number, number][]): string | null {
  if (points.length < 2 || !usable(points)) return null;
  const [a, b] = [points[0], points[points.length - 1]];
  return `https://www.openstreetmap.org/directions?route=${a[0]},${a[1]};${b[0]},${b[1]}`;
}
