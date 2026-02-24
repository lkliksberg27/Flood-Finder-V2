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

      setTimeout(() => map.invalidateSize(), 100);
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

    // Sensor markers (warn + alert only)
    sensors
      .filter((s) => s.status !== "OK")
      .forEach((sensor) => {
        const color = STATUS_COLORS[sensor.status];
        L.circleMarker([sensor.lat, sensor.lng], {
          radius: 6,
          fillColor: color,
          fillOpacity: 0.9,
          color: "white",
          weight: 2,
        })
          .bindTooltip(sensor.name, { direction: "top", offset: [0, -8] })
          .addTo(layers);
      });

    // Route lines
    routes.forEach((route, i) => {
      const isSelected = selectedIndex === i;
      const color =
        route.floodLevel === "severe"
          ? "#f87171"
          : route.floodLevel === "moderate"
          ? "#fbbf24"
          : "#3b82f6";

      L.polyline(route.geometry, {
        color: "#000",
        weight: isSelected ? 8 : 5,
        opacity: 0.25,
      }).addTo(layers);

      L.polyline(route.geometry, {
        color,
        weight: isSelected ? 5 : 3,
        opacity: isSelected ? 1 : 0.45,
        dashArray: isSelected ? undefined : "8 6",
      }).addTo(layers);
    });

    // Fit bounds
    if (selectedIndex !== null && routes[selectedIndex]) {
      map.fitBounds(L.latLngBounds(routes[selectedIndex].geometry), { padding: [30, 30] });
    } else if (routes.length > 0) {
      const allPts = routes.flatMap((r) => r.geometry);
      if (allPts.length > 0) {
        map.fitBounds(L.latLngBounds(allPts), { padding: [30, 30] });
      }
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [routes, selectedIndex]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
