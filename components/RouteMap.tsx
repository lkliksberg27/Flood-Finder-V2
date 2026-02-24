"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sensors } from "@/lib/mock-data";
import { RouteData } from "@/lib/routes-store";

const STATUS_COLORS: Record<string, string> = {
  OK: "#34d399",
  WARN: "#fbbf24",
  ALERT: "#f87171",
};

interface RouteMapProps {
  routes: RouteData[];
  selectedIndex: number | null;
}

export default function RouteMap({ routes, selectedIndex }: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [25.9565, -80.1392],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
      layersRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // Add sensor markers
    sensors
      .filter((s) => s.status !== "OK")
      .forEach((sensor) => {
        const color = STATUS_COLORS[sensor.status];
        const marker = L.circleMarker([sensor.lat, sensor.lng], {
          radius: 6,
          fillColor: color,
          fillOpacity: 0.9,
          color: "white",
          weight: 2,
        });
        marker.bindTooltip(sensor.name, { className: "sensor-tooltip" });
        layers.addLayer(marker);
      });

    // Draw routes
    routes.forEach((route, i) => {
      const isSelected = selectedIndex === i;
      const color =
        route.floodLevel === "severe"
          ? "#f87171"
          : route.floodLevel === "moderate"
          ? "#fbbf24"
          : "#3b82f6";

      // Shadow line
      const shadow = L.polyline(route.geometry, {
        color: "#000",
        weight: isSelected ? 8 : 5,
        opacity: 0.3,
      });
      layers.addLayer(shadow);

      // Main line
      const line = L.polyline(route.geometry, {
        color: color,
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 1 : 0.5,
        dashArray: isSelected ? undefined : "8 6",
      });
      layers.addLayer(line);
    });

    // Fit bounds to selected route or all routes
    if (selectedIndex !== null && routes[selectedIndex]) {
      const bounds = L.latLngBounds(routes[selectedIndex].geometry);
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (routes.length > 0) {
      const allPoints = routes.flatMap((r) => r.geometry);
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
      }
    }
  }, [routes, selectedIndex]);

  return <div ref={containerRef} className="h-full w-full" />;
}
