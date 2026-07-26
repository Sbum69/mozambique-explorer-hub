import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Loader2, Car, Bike, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Itinerary, ItineraryStop } from "@/data/itineraries";
import { ITINERARY_STOP_COORDS, DEFAULT_MZ_CENTER } from "@/data/itinerary-coords";

type Mode = "driving" | "cycling" | "walking";

function stopColor(type: ItineraryStop["type"]) {
  return type === "business" ? "#2563eb" : type === "waypoint" ? "#9333ea" : "#f97316";
}

function numberedIcon(n: number, color: string, sponsored?: boolean) {
  return L.divIcon({
    className: "ekaya-itin-pin",
    html: `<div style="
      width: 34px; height: 34px;
      background:${color};
      border:3px solid ${sponsored ? "#facc15" : "white"};
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
  itinerary: Itinerary;
  lang?: "pt" | "en";
}

export function ItineraryMap({ itinerary, lang = "pt" }: Props) {
  const stopsWithCoords = useMemo(() => {
    return itinerary.route
      .map((s) => {
        const key = `${itinerary.id}:${s.id}`;
        const coord =
          ITINERARY_STOP_COORDS[key] ??
          (s.lat != null && s.lng != null ? ([s.lat, s.lng] as [number, number]) : null);
        return coord ? { stop: s, coord } : null;
      })
      .filter((v): v is { stop: ItineraryStop; coord: [number, number] } => v !== null);
  }, [itinerary]);

  const points = stopsWithCoords.map((s) => s.coord);
  const [mode, setMode] = useState<Mode>("driving");
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  async function computeRoute(m: Mode) {
    if (points.length < 2) return;
    setLoading(true);
    setMode(m);
    try {
      const profile = m === "driving" ? "driving" : m === "cycling" ? "cycling" : "foot";
      const coordsStr = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.[0]) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng],
        );
        setRoute(coords);
        setRouteInfo({ distance: data.routes[0].distance, duration: data.routes[0].duration });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error(err),
      { enableHighAccuracy: true },
    );
  }

  const center = points[0] ?? DEFAULT_MZ_CENTER;

  const openInGmaps = () => {
    if (points.length === 0) return;
    const waypoints = points.map(([lat, lng]) => `${lat},${lng}`).join("/");
    window.open(`https://www.google.com/maps/dir/${waypoints}`, "_blank");
  };

  return (
    <div className="relative w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex rounded-lg border bg-background p-1 shadow-sm">
          <button
            onClick={() => computeRoute("driving")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 ${mode === "driving" && route ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Car className="h-3.5 w-3.5" /> {lang === "pt" ? "Carro" : "Car"}
          </button>
          <button
            onClick={() => computeRoute("cycling")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 ${mode === "cycling" && route ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Bike className="h-3.5 w-3.5" /> {lang === "pt" ? "Bicicleta" : "Bike"}
          </button>
          <button
            onClick={() => computeRoute("walking")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 ${mode === "walking" && route ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <User className="h-3.5 w-3.5" /> {lang === "pt" ? "A pé" : "Walk"}
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={locateMe} className="gap-1">
          <Navigation className="h-3.5 w-3.5" /> {lang === "pt" ? "Minha localização" : "My location"}
        </Button>
        <Button variant="outline" size="sm" onClick={openInGmaps}>
          {lang === "pt" ? "Abrir no Google Maps" : "Open in Google Maps"}
        </Button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {routeInfo && !loading && (
          <span className="text-xs text-muted-foreground ml-1">
            📏 {(routeInfo.distance / 1000).toFixed(1)} km · ⏱ {Math.round(routeInfo.duration / 60)} min
          </span>
        )}
      </div>

      <div className="h-[480px] w-full rounded-xl overflow-hidden border shadow-sm">
        <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name={lang === "pt" ? "Mapa" : "Map"}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name={lang === "pt" ? "Satélite" : "Satellite"}>
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <FitAll points={points} />

          {route && route.length > 1 && (
            <Polyline positions={route} pathOptions={{ color: "#f97316", weight: 5, opacity: 0.85 }} />
          )}
          {!route && points.length > 1 && (
            <Polyline positions={points} pathOptions={{ color: "#f97316", weight: 3, opacity: 0.5, dashArray: "6 8" }} />
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
            <Marker key={stop.id} position={coord} icon={numberedIcon(i + 1, stopColor(stop.type), stop.sponsored)}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <p style={{ fontSize: 10, textTransform: "uppercase", color: "#666", margin: 0, fontWeight: 700 }}>
                    {stop.type === "business"
                      ? lang === "pt" ? "Negócio" : "Business"
                      : stop.type === "waypoint"
                      ? "Waypoint"
                      : lang === "pt" ? "História" : "Story"}
                  </p>
                  <h3 style={{ margin: "4px 0", fontWeight: 700, fontSize: 15 }}>{stop.name ?? stop.title}</h3>
                  {stop.description && (
                    <p style={{ fontSize: 12, color: "#555", margin: "0 0 6px" }}>{stop.description}</p>
                  )}
                  <p style={{ fontSize: 10, color: "#888", margin: 0 }}>
                    📍 {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                  </p>
                  <button
                    onClick={() =>
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coord[0]},${coord[1]}`, "_blank")
                    }
                    style={{
                      marginTop: 8,
                      width: "100%",
                      padding: "6px 10px",
                      background: "#f97316",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🧭 {lang === "pt" ? "Como chegar" : "Get directions"}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {points.length < itinerary.route.length && (
        <p className="text-xs text-muted-foreground mt-2">
          {lang === "pt"
            ? `${itinerary.route.length - points.length} paragem(ns) sem coordenadas GPS.`
            : `${itinerary.route.length - points.length} stop(s) without GPS coordinates.`}
        </p>
      )}
    </div>
  );
}
