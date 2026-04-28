import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { DESTINATIONS, type Destination } from "@/data/destinations";
import { useLang } from "@/contexts/LanguageContext";

// Custom orange pin
const pinIcon = L.divIcon({
  className: "ekaya-pin",
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg, oklch(0.68 0.19 45), oklch(0.74 0.16 50));
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "><span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">📍</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

interface Props {
  onSelect?: (d: Destination) => void;
}

export function InteractiveMap({ onSelect }: Props) {
  const { lang } = useLang();

  return (
    <MapContainer
      center={[-18.5, 35.5]}
      zoom={6}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
      scrollWheelZoom
    >
      <MapResizer />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {DESTINATIONS.map((d) => (
        <Marker key={d.id} position={d.coords} icon={pinIcon}>
          <Popup>
            <div style={{ minWidth: 200 }}>
              <img src={d.image} alt={d.name} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
              <h3 style={{ margin: "8px 0 4px", fontWeight: 700, fontSize: 16 }}>{d.name}</h3>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px" }}>{d.description[lang]}</p>
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
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
