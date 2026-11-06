import { toast } from "sonner";
import { directionsUrls } from "@/lib/visits";
import { useEffect, useMemo, useState } from "react";
import { googleDirectionsUrl, osmDirectionsUrl } from "@/lib/itinerary-routing";
import { BASEMAP, SATELLITE } from "@/lib/map-tiles";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  CircleMarker,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RouteStop } from "@/lib/routes";

/** Center fallback (approx. Mozambique center) when no stop has coordinates yet. */
const DEFAULT_MZ_CENTER: [number, number] = [-18.5, 35.5];

function stopColor(kind: RouteStop["kind"]) {
  return kind === "experience"
    ? "#2563eb"
    : kind === "community"
      ? "#16a34a"
      : kind === "custom"
        ? "#64748b"
        : "#9333ea";
}

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "ekaya-itin-pin",
    html: `<div style="
      width: 34px; height: 34px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      color:white;font-weight:700;font-size:14px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 10px rgba(0,0,0,.35);
    ">${n}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [50, 50] });
    else if (points.length === 1) map.setView(points[0], 13);
    setTimeout(() => map.invalidateSize(), 150);
  }, [points, map]);
  return null;
}

interface Props {
  /** Stops in visiting order; coordinates come from the real destination rows. */
  stops: RouteStop[];
  lang?: "pt" | "en";
}

export function ItineraryMap({ stops, lang = "pt" }: Props) {
  const stopsWithCoords = useMemo(
    () =>
      stops
        .map((stop) => (stop.coords ? { stop, coord: stop.coords } : null))
        .filter((v): v is { stop: RouteStop; coord: [number, number] } => v !== null),
    [stops],
  );

  const points = useMemo(() => stopsWithCoords.map((s) => s.coord), [stopsWithCoords]);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  function locateMe() {
    const pt = lang === "pt";
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(
        pt ? "Este dispositivo não suporta localização." : "This device doesn't support location.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      (err) =>
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? pt
              ? "Permissão recusada. Permite a localização nas definições do browser."
              : "Permission denied. Allow location in your browser settings."
            : err.code === err.TIMEOUT
              ? pt
                ? "A localização demorou demasiado. Tenta novamente."
                : "Location timed out. Try again."
              : pt
                ? "Localização indisponível."
                : "Location unavailable.",
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const center = points[0] ?? DEFAULT_MZ_CENTER;

  const googleUrl = googleDirectionsUrl(points);
  const osmUrl = osmDirectionsUrl(points);

  return (
    <div className="relative w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={locateMe} className="gap-1">
          <Navigation className="h-3.5 w-3.5" />{" "}
          {lang === "pt" ? "Minha localização" : "My location"}
        </Button>
        {googleUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">
              {lang === "pt" ? "Abrir no Google Maps" : "Open in Google Maps"}
            </a>
          </Button>
        )}
        {osmUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={osmUrl} target="_blank" rel="noopener noreferrer">
              {lang === "pt" ? "Abrir no OpenStreetMap" : "Open in OpenStreetMap"}
            </a>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {lang === "pt"
          ? "Linha tracejada: ordem das paragens, não um percurso pela estrada. Para direções de carro, a pé ou de bicicleta, abre no Google Maps (todas as paragens) ou no OpenStreetMap (da primeira à última)."
          : "Dashed line: stop order, not a road route. For driving, walking or cycling directions, open in Google Maps (every stop) or OpenStreetMap (first to last stop)."}
      </p>

      <div className="h-[480px] w-full rounded-xl overflow-hidden border shadow-sm">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          {SATELLITE ? (
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name={lang === "pt" ? "Mapa" : "Map"}>
                <TileLayer {...BASEMAP} />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name={lang === "pt" ? "Satélite" : "Satellite"}>
                <TileLayer {...SATELLITE} />
              </LayersControl.BaseLayer>
            </LayersControl>
          ) : (
            <TileLayer {...BASEMAP} />
          )}

          <FitAll points={points} />

          {points.length > 1 && (
            <Polyline
              positions={points}
              pathOptions={{ color: "#f97316", weight: 3, opacity: 0.5, dashArray: "6 8" }}
            />
          )}

          {userLoc && (
            <CircleMarker
              center={userLoc}
              radius={9}
              pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
            >
              <Popup>{lang === "pt" ? "Tu estás aqui" : "You are here"}</Popup>
            </CircleMarker>
          )}

          {stopsWithCoords.map(({ stop, coord }, i) => (
            <Marker key={stop.id} position={coord} icon={numberedIcon(i + 1, stopColor(stop.kind))}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <p
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      color: "#666",
                      margin: 0,
                      fontWeight: 700,
                    }}
                  >
                    {stop.kind === "experience"
                      ? lang === "pt"
                        ? "Atividade"
                        : "Activity"
                      : stop.kind === "community"
                        ? lang === "pt"
                          ? "Experiência comunitária"
                          : "Community experience"
                        : stop.kind === "custom"
                          ? lang === "pt"
                            ? "Paragem"
                            : "Stop"
                          : lang === "pt"
                            ? "Destino"
                            : "Destination"}
                  </p>
                  <h3 style={{ margin: "4px 0", fontWeight: 700, fontSize: 15 }}>
                    {lang === "en" && stop.titleEn ? stop.titleEn : stop.title}
                  </h3>
                  {stop.destinationName && (
                    <p style={{ fontSize: 12, color: "#555", margin: "0 0 6px" }}>
                      {stop.destinationName}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: "#888", margin: 0 }}>
                    <MapPin
                      size={10}
                      aria-hidden="true"
                      style={{ display: "inline", verticalAlign: "-1px" }}
                    />{" "}
                    {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      margin: "8px 0 0",
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Navigation size={14} aria-hidden="true" />{" "}
                    {(() => {
                      const u = directionsUrls(coord);
                      return (
                        [
                          ["Google Maps", u.google],
                          ["Waze", u.waze],
                          ["Apple Maps", u.apple],
                        ] as const
                      ).map(([l, h]) => (
                        <a key={l} href={h} target="_blank" rel="noopener noreferrer">
                          {l}
                        </a>
                      ));
                    })()}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {points.length < stops.length && (
        <p className="text-xs text-muted-foreground mt-2">
          {lang === "pt"
            ? `${stops.length - points.length} paragem(ns) sem coordenadas GPS.`
            : `${stops.length - points.length} stop(s) without GPS coordinates.`}
        </p>
      )}
    </div>
  );
}
