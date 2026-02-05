"use client";

import { useEffect, useRef, useState } from "react";
import type { Location } from "@/lib/types";

const MAPKIT_TOKEN = process.env.NEXT_PUBLIC_MAPKIT_TOKEN!;

const colorMap: Record<string, string> = {
  red: "#FF3B30",
  orange: "#FF9500",
  yellow: "#FFCC00",
  green: "#34C759",
  mint: "#00C7BE",
  teal: "#30B0C7",
  cyan: "#32ADE6",
  blue: "#007AFF",
  indigo: "#5856D6",
  purple: "#AF52DE",
  pink: "#FF2D55",
  brown: "#A2845E",
};

function getMarkerColor(colorName: string): string {
  return colorMap[colorName?.toLowerCase()] || "#007AFF";
}

// Load and initialize MapKit JS once
let mapkitLoadPromise: Promise<void> | null = null;
let mapkitInitialized = false;

function loadAndInitMapKit(): Promise<void> {
  if (mapkitLoadPromise) return mapkitLoadPromise;

  mapkitLoadPromise = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. navigated back to page)
    if (typeof window !== "undefined" && typeof mapkit !== "undefined") {
      if (!mapkitInitialized) {
        try {
          mapkit.init({
            authorizationCallback: (done) => done(MAPKIT_TOKEN),
          });
          mapkitInitialized = true;
        } catch (e) {
          console.error("MapKit init error:", e);
          reject(e);
          return;
        }
      }
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      try {
        mapkit.init({
          authorizationCallback: (done) => done(MAPKIT_TOKEN),
        });
        mapkitInitialized = true;
        resolve();
      } catch (e) {
        console.error("MapKit init error:", e);
        reject(e);
      }
    };
    script.onerror = () => {
      console.error("Failed to load MapKit JS script");
      reject(new Error("Failed to load MapKit JS"));
    };
    document.head.appendChild(script);
  });

  return mapkitLoadPromise;
}

interface LocationMapProps {
  locations: Location[];
  onLocationClick?: (lat: number, lng: number) => void;
  selectedPosition?: { lat: number; lng: number } | null;
}

export function LocationMap({
  locations,
  onLocationClick,
  selectedPosition,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapkit.Map | null>(null);
  const annotationsRef = useRef<mapkit.MarkerAnnotation[]>([]);
  const selectedMarkerRef = useRef<mapkit.MarkerAnnotation | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load MapKit JS and create the map
  useEffect(() => {
    let destroyed = false;

    loadAndInitMapKit()
      .then(() => {
        if (destroyed || !containerRef.current) return;

        const defaultCenter = new mapkit.Coordinate(40.015, -105.2705);

        const map = new mapkit.Map(containerRef.current, {
          center: defaultCenter,
          region: new mapkit.CoordinateRegion(
            defaultCenter,
            new mapkit.CoordinateSpan(0.05, 0.05)
          ),
          colorScheme: mapkit.Map.ColorSchemes.Dark,
        });

        mapRef.current = map;
        setReady(true);
      })
      .catch((e) => {
        console.error("MapKit load error:", e);
        setError(
          "Failed to load Apple Maps. " +
            (window.location.hostname === "localhost"
              ? "The MapKit token is restricted to devtools.crowdcount.tech — it won't work on localhost."
              : String(e))
        );
      });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // Click-to-place handler
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !onLocationClick) return;

    const handler = (event: mapkit.MapEvent) => {
      // Ignore taps on annotations
      if (event.annotation) return;
      if (!event.pointOnPage) return;

      const point = new DOMPoint(event.pointOnPage.x, event.pointOnPage.y);
      const coord = map.convertPointOnPageToCoordinate(point);
      onLocationClick(coord.latitude, coord.longitude);
    };

    map.addEventListener("single-tap", handler);
    return () => map.removeEventListener("single-tap", handler);
  }, [ready, onLocationClick]);

  // Update location markers
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    // Remove previous location annotations
    if (annotationsRef.current.length > 0) {
      map.removeAnnotations(annotationsRef.current);
    }

    // Build new annotations
    const annotations = locations.map((loc) => {
      const coord = new mapkit.Coordinate(
        loc.location_latitude,
        loc.location_longitude
      );

      let subtitle = loc.location_address;
      if (loc.location_current_count !== undefined) {
        subtitle += ` · Count: ${loc.location_current_count}`;
        if (
          loc.location_overcrowding_count &&
          loc.location_overcrowding_count !== "N/A"
        ) {
          subtitle += ` / ${loc.location_overcrowding_count}`;
        }
      }

      return new mapkit.MarkerAnnotation(coord, {
        color: getMarkerColor(loc.location_color),
        title: loc.location_name,
        subtitle,
        calloutEnabled: true,
      });
    });

    map.addAnnotations(annotations);
    annotationsRef.current = annotations;

    // Center on first location if available
    if (locations.length > 0) {
      const first = locations[0];
      const center = new mapkit.Coordinate(
        first.location_latitude,
        first.location_longitude
      );
      map.setRegionAnimated(
        new mapkit.CoordinateRegion(
          center,
          new mapkit.CoordinateSpan(0.05, 0.05)
        )
      );
    }
  }, [ready, locations]);

  // Update selected-position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    // Remove old selected marker
    if (selectedMarkerRef.current) {
      map.removeAnnotation(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }

    // Add new one
    if (selectedPosition) {
      const coord = new mapkit.Coordinate(
        selectedPosition.lat,
        selectedPosition.lng
      );
      const marker = new mapkit.MarkerAnnotation(coord, {
        color: "#FF3B30",
        title: "New location",
        calloutEnabled: true,
      });
      map.addAnnotation(marker);
      selectedMarkerRef.current = marker;
    }
  }, [ready, selectedPosition]);

  if (error) {
    return (
      <div className="h-full w-full bg-muted flex items-center justify-center rounded-lg">
        <p className="text-sm text-muted-foreground px-4 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem", overflow: "hidden" }}
      className="z-0"
    />
  );
}
