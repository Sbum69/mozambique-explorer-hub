import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Destination } from "@/lib/destinations";
import { useLang } from "@/contexts/LanguageContext";
import type { CommunityExperience } from "@/lib/community-experiences";
import { categoryMeta } from "@/lib/community-experiences";
import { communityIcon } from "@/components/CommunityMiniMap";
import { directionsUrls } from "@/lib/visits";

const makePin = (bg: string, size: number) => L.divIcon({
  className: "ekaya-pin",
  html: `<div style="
    width: ${size}px; height: ${size}px;
    background: ${bg};
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "><span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">📍</span></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});
/** Destinations: green = available, orange = currently selected (only one). */
const pinIcon = makePin("oklch(0.6 0.15 150)", 30);
const selectedPinIcon = makePin("linear-gradient(135deg, oklch(0.68 0.19 45), oklch(0.74 0.16 50))", 40);
/** Community experiences keep the diamond; the selected one is larger with an orange ring. */
const communitySelectedIcon = L.divIcon({
  className: "ekaya-community-pin-selected",
  html: `<div style="width:36px;height:36px;background:oklch(0.62 0.15 150);border:4px solid oklch(0.7 0.19 45);border-radius:7px;transform:rotate(45deg);box-shadow:0 0 0 4px rgba(255,255,255,.9),0 4px 14px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);font-size:15px">👥</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

function FitRoute({ coords }: { coords: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 1) {
      map.fitBounds(coords, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 12);
  }, [target, map]);
  return null;
}

interface Props {
  destinations: Destination[];
  onSelect?: (d: Destination) => void;
  onDirections?: (d: Destination) => void;
  routeCoords?: [number, number][] | null;
  origin?: [number, number] | null;
  visitedIds?: Set<string>;
  focus?: [number, number] | null;
  community?: CommunityExperience[];
  highlightCommunityId?: string | null;
  selectedId?: string | null;
  onSelectCommunity?: (c: CommunityExperience) => void;
}

export function InteractiveMap({ destinations, onSelect, onDirections, routeCoords, origin, visitedIds, focus, community = [], highlightCommunityId, selectedId, onSelectCommunity }: Props) {
  const { lang } = useLang();

  return (
    <MapContainer
      center={[-18.5, 35.5]}
      zoom={6}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
      scrollWheelZoom
    >
      <MapResizer />
      <FitRoute coords={routeCoords ?? null} />
      <FlyTo target={focus ?? null} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routeCoords && routeCoords.length > 1 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: "oklch(0.68 0.19 45)", weight: 5, opacity: 0.85 }}
        />
      )}

      {origin && (
        <CircleMarker
          center={origin}
          radius={8}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
        >
          <Popup>{lang === "pt" ? "Tu estás aqui" : "You are here"}</Popup>
        </CircleMarker>
      )}

      {destinations.map((d) => (
        <Marker key={d.id} position={d.coords} icon={d.id === selectedId ? selectedPinIcon : pinIcon} zIndexOffset={d.id === selectedId ? 1000 : 0} eventHandlers={{ click: () => onSelect?.(d) }}>
          <Popup>
            <div style={{ minWidth: 200 }}>
              <img src={d.image} alt={d.name} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
              <h3 style={{ margin: "8px 0 4px", fontWeight: 700, fontSize: 16 }}>{d.name}</h3>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px" }}>{d.description[lang]}</p>
              {visitedIds?.has(d.id) && (
                <p style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, margin: "0 0 6px" }}>✓ {lang === "pt" ? "Visitado" : "Visited"}</p>
              )}
              <p style={{ fontSize: 11, color: "#888", margin: "0 0 8px" }}>👥 {d.visitorsK}k {lang === "pt" ? "visitantes/ano" : "visitors/year"}</p>
              {onSelect && (
                <button
                  onClick={() => onSelect(d)}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    background: "linear-gradient(135deg, oklch(0.68 0.19 45), oklch(0.74 0.16 50))",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {lang === "pt" ? "Ver detalhes" : "View details"}
                </button>
              )}
              {onDirections && (
                <button
                  onClick={() => onDirections(d)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "6px 12px",
                    background: "white",
                    color: "oklch(0.55 0.19 45)",
                    border: "1px solid oklch(0.68 0.19 45)",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  🧭 {lang === "pt" ? "Como chegar" : "Get directions"}
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {community.filter((c) => c.lat !== null && c.lng !== null).map((c) => (
        <Marker
          key={`c-${c.id}`}
          position={[c.lat as number, c.lng as number]}
          icon={c.id === highlightCommunityId ? communitySelectedIcon : communityIcon}
          zIndexOffset={c.id === highlightCommunityId ? 900 : 0}
          eventHandlers={{ click: () => onSelectCommunity?.(c) }}
          ref={(m) => { if (m && c.id === highlightCommunityId) setTimeout(() => m.openPopup(), 600); }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#15803d", margin: 0 }}>
                {categoryMeta(c.category).emoji} {lang === "pt" ? "Experiência comunitária · grátis" : "Community experience · free"}
              </p>
              <h3 style={{ margin: "4px 0", fontWeight: 700, fontSize: 15 }}>{c.title[lang]}</h3>
              <p style={{ fontSize: 11, color: "#888", margin: "0 0 4px" }}>{c.provinceName[lang]} · {c.location}</p>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px" }}>{c.description[lang]}</p>
              <p style={{ fontSize: 12, fontWeight: 600, margin: 0, display: "flex", gap: 10, flexWrap: "wrap" }}>
                🧭 {(() => { const u = directionsUrls([c.lat as number, c.lng as number]); return ([["Google Maps", u.google], ["Waze", u.waze], ["Apple Maps", u.apple]] as const).map(([l, h]) => <a key={l} href={h} target="_blank" rel="noopener noreferrer">{l}</a>); })()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
