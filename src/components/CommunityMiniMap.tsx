import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { communityIcon } from "@/components/community-pin";
import { BASEMAP } from "@/lib/map-tiles";

export function CommunityMiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={11}
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
      scrollWheelZoom={false}
    >
      <TileLayer {...BASEMAP} />
      <Marker position={[lat, lng]} icon={communityIcon} />
    </MapContainer>
  );
}
