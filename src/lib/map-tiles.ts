/**
 * Map tiles for every map (Leaflet raster tiles, no new library).
 *
 * - With VITE_ARCGIS_API_KEY (ArcGIS Location Platform, free tier: 2 million basemap tiles a month,
 *   commercial use allowed): Esri static "streets" basemap (512 px tiles) and World Imagery for the
 *   satellite layer. The key is a browser key restricted to exploreekaya.com (and the preview URL)
 *   in the ArcGIS dashboard, like the Supabase publishable key: it is public by design.
 * - Without the key: OpenStreetMap's own tile servers. Their policy does not forbid commercial use
 *   but gives no guarantee and asks for attribution, a valid Referer and caching
 *   (https://operations.osmfoundation.org/policies/tiles/). No satellite layer in that case.
 */
const ARCGIS_KEY = (import.meta.env.VITE_ARCGIS_API_KEY as string | undefined)?.trim() || null;

export interface TileSource {
  url: string;
  attribution: string;
  tileSize?: number;
  zoomOffset?: number;
  maxZoom: number;
}

export const OSM_TILES: TileSource = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  maxZoom: 19,
};

const ESRI_POWERED =
  'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>';

export function esriStreets(key: string): TileSource {
  return {
    url: `https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/arcgis/streets/static/tile/{z}/{y}/{x}?token=${encodeURIComponent(key)}`,
    attribution: `${ESRI_POWERED} | Esri, &copy; OpenStreetMap contributors, and the GIS User Community`,
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
  };
}

export function esriImagery(key: string): TileSource {
  return {
    url: `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${encodeURIComponent(key)}`,
    attribution: `${ESRI_POWERED} | Esri, Maxar, Earthstar Geographics, and the GIS User Community`,
    maxZoom: 19,
  };
}

/** Street map for every Leaflet map in the app. */
export const BASEMAP: TileSource = ARCGIS_KEY ? esriStreets(ARCGIS_KEY) : OSM_TILES;
/** Satellite layer (itinerary map), only with the ArcGIS key. */
export const SATELLITE: TileSource | null = ARCGIS_KEY ? esriImagery(ARCGIS_KEY) : null;
export const TILES_PROVIDER: "esri" | "osm" = ARCGIS_KEY ? "esri" : "osm";
