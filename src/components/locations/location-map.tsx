"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "@/lib/types";

// Fix for default marker icons in Leaflet with Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function createColoredIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

interface LocationMapProps {
  locations: Location[];
  onLocationClick?: (lat: number, lng: number) => void;
  selectedPosition?: { lat: number; lng: number } | null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationMap({ locations, onLocationClick, selectedPosition }: LocationMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[400px] w-full bg-muted flex items-center justify-center rounded-lg">
        Loading map...
      </div>
    );
  }

  const center = locations.length > 0
    ? [locations[0].location_latitude, locations[0].location_longitude] as [number, number]
    : [40.7128, -74.006] as [number, number]; // Default to NYC

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="h-[400px] w-full rounded-lg z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onLocationClick && <MapClickHandler onClick={onLocationClick} />}
      {locations.map((location) => (
        <Marker
          key={location.location_device}
          position={[location.location_latitude, location.location_longitude]}
          icon={createColoredIcon(location.location_color || "#3b82f6")}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{location.location_name}</p>
              <p className="text-sm text-gray-600">{location.location_address}</p>
              <p className="text-sm">
                Device: <code>{location.location_device}</code>
              </p>
              {location.location_current_count !== undefined && (
                <p className="text-sm font-medium">
                  Count: {location.location_current_count}
                  {location.location_overcrowding_count &&
                    location.location_overcrowding_count !== "N/A" && (
                      <span className="text-gray-500">
                        {" "}/ {location.location_overcrowding_count}
                      </span>
                    )}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      {selectedPosition && (
        <Marker position={[selectedPosition.lat, selectedPosition.lng]}>
          <Popup>New location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
