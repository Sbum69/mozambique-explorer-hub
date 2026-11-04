import L from "leaflet";

/** Distinct green marker used for community (free) experiences everywhere on the map. */
export const communityIcon = L.divIcon({
  className: "ekaya-community-pin",
  html: `<div style="width:26px;height:26px;background:var(--color-secondary);border:3px solid white;border-radius:6px;transform:rotate(45deg);box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);width:8px;height:8px;border-radius:50%;background:white"></span></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});
