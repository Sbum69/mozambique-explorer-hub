import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Distinct green marker used for community (free) experiences everywhere on the map. */
export const communityIcon = L.divIcon({
  className: "ekaya-community-pin",
  html: `<div style="width:26px;height:26px;background:var(--color-secondary);border:3px solid white;border-radius:6px;transform:rotate(45deg);box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);width:8px;height:8px;border-radius:50%;background:white"></span></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

export function CommunityMiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={11}
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={communityIcon} />
    </MapContainer>
  );
}
