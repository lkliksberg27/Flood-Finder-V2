"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sensors } from "@/lib/mock-data";
import { RouteData } from "@/lib/routes-store";
import { getSegmentFloodInfo } from "@/lib/geo-utils";

const SEGMENT_COLORS = {
  none: "#34d399",
  moderate: "#fbbf24",
  severe: "#f87171",
} as const;

// Different hues for each alternative route (unselected state)
const ROUTE_HUES = ["#3b82f6", "#8b5cf6", "#06b6d4"];

interface AIRanking {
  routeIndex: number;
  safetyScore: number;
  badge: string;
}

interface SmartRouteMapProps {
  routes: RouteData[];
  selectedIndex: number | null;
  alertRadiusM: number;
  aiRankings?: AIRanking[];
}

export default function SmartRouteMap({
  routes,
  selectedIndex,
  alertRadiusM,
  aiRankings,
}: SmartRouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // Re-render layers when routes/selection/radius changes
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    if (routes.length === 0) return;

    // Collect sensor IDs that are near any of the displayed routes
    const nearbySensorIds = new Set<string>();
    routes.forEach((r) => r.nearbySensors.forEach((id) => nearbySensorIds.add(id)));

    // ── Flood zone overlays ──────────────────────────────────────────────────
    sensors
      .filter((s) => s.status !== "OK" && nearbySensorIds.has(s.deviceId))
      .forEach((sensor) => {
        const isAlert = sensor.status === "ALERT";
        const color = isAlert ? "#f87171" : "#fbbf24";

        // Outer soft halo
        L.circle([sensor.lat, sensor.lng], {
          radius: alertRadiusM * 1.4,
          color,
          fillColor: color,
          fillOpacity: 0.04,
          weight: 0,
        }).addTo(layers);

        // Main flood zone circle
        L.circle([sensor.lat, sensor.lng], {
          radius: alertRadiusM,
          color,
          fillColor: color,
          fillOpacity: 0.14,
          weight: 1.5,
          opacity: 0.5,
          dashArray: "5 4",
        }).addTo(layers);

        // Sensor dot
        L.circleMarker([sensor.lat, sensor.lng], {
          radius: isAlert ? 9 : 7,
          fillColor: color,
          fillOpacity: 1,
          color: "rgba(10,14,26,0.9)",
          weight: 2,
        })
          .bindTooltip(
            `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600">${sensor.name}</div>` +
              `<div style="font-size:10px;color:#94a3b8">${sensor.waterLevelCm}cm · ${sensor.status}</div>`,
            { direction: "top", offset: [0, -10] }
          )
          .addTo(layers);
      });

    // ── Route lines ──────────────────────────────────────────────────────────
    // Draw unselected routes first (behind selected)
    routes.forEach((route, i) => {
      if (i === selectedIndex) return; // skip selected — drawn last
      const color = ROUTE_HUES[i % ROUTE_HUES.length];

      L.polyline(route.geometry, {
        color: "#000",
        weight: 7,
        opacity: 0.12,
      }).addTo(layers);

      L.polyline(route.geometry, {
        color,
        weight: 3,
        opacity: 0.28,
        dashArray: "7 5",
      }).addTo(layers);

      // AI badge label on unselected routes
      if (aiRankings && route.geometry.length > 0) {
        const ranking = aiRankings.find((r) => r.routeIndex === i);
        if (ranking) {
          const midIdx = Math.floor(route.geometry.length / 2);
          const [lat, lng] = route.geometry[midIdx];
          const badgeColors: Record<string, string> = {
            "AI PICK": "#a78bfa",
            SAFEST: "#34d399",
            FASTEST: "#3b82f6",
            CAUTION: "#fbbf24",
            AVOID: "#f87171",
          };
          const badgeColor = badgeColors[ranking.badge] || "#94a3b8";
          L.marker([lat, lng], {
            icon: L.divIcon({
              html: `<div style="background:rgba(10,14,26,0.85);border:1px solid ${badgeColor}40;color:${badgeColor};font-family:'DM Sans',sans-serif;font-size:8px;font-weight:700;padding:2px 6px;border-radius:20px;white-space:nowrap;backdrop-filter:blur(8px)">${ranking.badge}</div>`,
              iconAnchor: [20, 10],
              className: "",
            }),
          }).addTo(layers);
        }
      }
    });

    // Draw selected route on top with flood segment coloring + glow
    if (selectedIndex !== null && routes[selectedIndex]) {
      const route = routes[selectedIndex];
      const segments = getSegmentFloodInfo(route.geometry, alertRadiusM);

      segments.forEach((seg) => {
        const color = SEGMENT_COLORS[seg.floodLevel];

        // Outer glow
        L.polyline(seg.points, { color, weight: 18, opacity: 0.07 }).addTo(layers);
        // Mid glow
        L.polyline(seg.points, { color, weight: 11, opacity: 0.15 }).addTo(layers);
        // Shadow
        L.polyline(seg.points, { color: "#000", weight: 9, opacity: 0.35 }).addTo(layers);
        // Main colored line
        L.polyline(seg.points, { color, weight: 5, opacity: 1 }).addTo(layers);
        // Inner highlight shimmer
        L.polyline(seg.points, { color: "#fff", weight: 1.5, opacity: 0.25 }).addTo(layers);
      });

      // Start (A) and End (B) markers
      const startPt = route.geometry[0];
      const endPt = route.geometry[route.geometry.length - 1];

      const makeMarker = (label: string, color: string) =>
        L.divIcon({
          html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:800;color:#0a0e1a;border:2px solid rgba(255,255,255,0.35);box-shadow:0 0 0 3px ${color}40,0 4px 12px rgba(0,0,0,0.5)">${label}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: "",
        });

      L.marker(startPt, { icon: makeMarker("A", "#34d399") }).addTo(layers);
      L.marker(endPt, { icon: makeMarker("B", "#f87171") }).addTo(layers);
    }

    // ── Fit map bounds ───────────────────────────────────────────────────────
    if (selectedIndex !== null && routes[selectedIndex]) {
      map.fitBounds(L.latLngBounds(routes[selectedIndex].geometry), {
        padding: [44, 44],
      });
    } else {
      const allPts = routes.flatMap((r) => r.geometry);
      if (allPts.length > 0) {
        map.fitBounds(L.latLngBounds(allPts), { padding: [32, 32] });
      }
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [routes, selectedIndex, alertRadiusM, aiRankings]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Flood segment legend — shown only when a route is selected */}
      {selectedIndex !== null && routes.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 500,
            background: "rgba(10,14,26,0.82)",
            backdropFilter: "blur(14px)",
            borderRadius: 10,
            padding: "7px 11px",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {(
            [
              { color: "#34d399", label: "Clear road" },
              { color: "#fbbf24", label: "Caution" },
              { color: "#f87171", label: "Flooded" },
            ] as const
          ).map(({ color, label }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}
            >
              <div
                style={{
                  width: 22,
                  height: 4,
                  background: color,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${color}80`,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "#94a3b8",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
