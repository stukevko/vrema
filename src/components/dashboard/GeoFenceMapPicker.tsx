"use client";

import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

interface Props {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onChange: (latitude: number, longitude: number) => void;
}

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#22c55e;border:2px solid #0b0b0b;box-shadow:0 0 0 2px rgba(34,197,94,0.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GeoFenceMapPicker({ latitude, longitude, radiusMeters, onChange }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: 260, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={markerIcon} />
        <Circle center={[latitude, longitude]} radius={radiusMeters} pathOptions={{ color: "#22c55e", fillOpacity: 0.12 }} />
        <MapClickHandler onChange={onChange} />
      </MapContainer>
    </div>
  );
}
