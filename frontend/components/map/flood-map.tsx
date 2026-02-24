"use client";

import { useEffect, useRef, useState } from "react";
import { Device, STATUS_CONFIG, FloodStatus } from "@/types";

declare const mapboxgl: any;

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface Props {
  devices: Device[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  route?: [number, number][] | null; // [lat, lng][]
  routeSafe?: boolean;
}

export function FloodMap({ devices, center = [-80.137, 25.957], zoom = 15, route = null, routeSafe = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);

  // ── Init map ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    function init() {
      if (!containerRef.current || typeof mapboxgl === "undefined") return;
      mapboxgl.accessToken = TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center[0], center[1]],
        zoom,
        attributionControl: false,
        pitchWithRotate: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }), "top-right");

      map.on("load", () => {
        mapRef.current = map;

        // Route source + layers (added once, data updated later)
        map.addSource("route", { type: "geojson", data: emptyGeoJSON() });

        // Shadow
        map.addLayer({
          id: "route-shadow", type: "line", source: "route",
          paint: { "line-color": "#000", "line-width": 10, "line-opacity": 0.08, "line-blur": 3 },
          layout: { "line-join": "round", "line-cap": "round" },
        });
        // Main line
        map.addLayer({
          id: "route-line", type: "line", source: "route",
          paint: { "line-color": "#4285f4", "line-width": 5, "line-opacity": 0.85 },
          layout: { "line-join": "round", "line-cap": "round" },
        });

        // Start/end markers source
        map.addSource("route-points", { type: "geojson", data: emptyGeoJSON() });
        map.addLayer({
          id: "route-points-layer", type: "circle", source: "route-points",
          paint: {
            "circle-radius": 8,
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 3,
          },
        });

        setReady(true);
      });
    }

    if (typeof mapboxgl !== "undefined") init();
    else {
      // Wait for script to load
      const interval = setInterval(() => {
        if (typeof mapboxgl !== "undefined") { clearInterval(interval); init(); }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => { mapRef.current?.remove(); mapRef.current = null; markersRef.current.clear(); setReady(false); };
  }, []);

  // ── Sync device markers ──────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const cur = new Set(devices.map((d) => d.deviceId));

    // Remove stale
    for (const [id, marker] of markersRef.current) {
      if (!cur.has(id)) { marker.remove(); markersRef.current.delete(id); }
    }

    for (const d of devices) {
      if (!d.lat || !d.lng) continue;
      const cfg = STATUS_CONFIG[d.status];
      const existing = markersRef.current.get(d.deviceId);

      if (existing) {
        existing.setLngLat([d.lng, d.lat]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = markerHTML(d.status, cfg.mapColor);
        el.style.cursor = "pointer";

        const popup = new mapboxgl.Popup({ offset: 20, maxWidth: "300px", closeButton: true })
          .setHTML(popupHTML(d));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([d.lng, d.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(d.deviceId, marker);
      }
    }
  }, [devices, ready]);

  // ── Draw route ──────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (!route || route.length < 2) {
      map.getSource("route")?.setData(emptyGeoJSON());
      map.getSource("route-points")?.setData(emptyGeoJSON());
      return;
    }

    const coords = route.map(([lat, lng]) => [lng, lat]); // Mapbox uses [lng, lat]
    const color = routeSafe ? "#4285f4" : "#ef4444";

    // Update route line
    map.getSource("route")?.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    });
    map.setPaintProperty("route-line", "line-color", color);

    // Start + end points
    map.getSource("route-points")?.setData({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Point", coordinates: coords[0] }, properties: { color: "#22c55e" } },
        { type: "Feature", geometry: { type: "Point", coordinates: coords[coords.length - 1] }, properties: { color: "#ef4444" } },
      ],
    });

    // Fit bounds
    const bounds = coords.reduce(
      (b: any, c: number[]) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: { top: 80, bottom: 40, left: 40, right: 40 }, maxZoom: 16, duration: 800 });

  }, [route, routeSafe, ready]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function emptyGeoJSON() {
  return { type: "FeatureCollection" as const, features: [] };
}

function markerHTML(status: FloodStatus, color: string) {
  const isAlert = status === "ALERT";
  const size = isAlert ? 20 : 14;
  return `<div style="position:relative;display:flex;align-items:center;justify-content:center">
    ${isAlert ? `<div style="position:absolute;width:${size*2}px;height:${size*2}px;border-radius:50%;background:${color};opacity:.2;animation:ping-marker 1.5s cubic-bezier(0,0,.2,1) infinite"></div>` : ""}
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);position:relative;z-index:1"></div>
  </div>`;
}

function popupHTML(d: Device): string {
  const s = STATUS_CONFIG[d.status];
  const batt = Math.min(100, Math.max(0, Math.round(((d.batteryV - 3.0) / (4.2 - 3.0)) * 100)));
  const bc = batt > 60 ? "#22c55e" : batt > 25 ? "#f59e0b" : "#ef4444";
  const seen = d.lastSeen ? timeAgo(d.lastSeen) : "—";
  return `<div style="padding:14px 16px;font-family:Inter,sans-serif;min-width:220px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="width:10px;height:10px;border-radius:50%;background:${s.color}"></div>
      <span style="font-size:14px;font-weight:700;color:#0f172a">${d.name}</span>
    </div>
    <div style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${s.color}15;color:${s.color};margin-bottom:12px">${s.label.toUpperCase()}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
      <div style="background:#f8fafc;border-radius:10px;padding:8px">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:3px">Water</div>
        <div style="font-size:16px;font-weight:800;color:${s.color}">${d.waterLevelCm.toFixed(1)} <span style="font-size:10px;color:#94a3b8">cm</span></div>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:8px">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;margin-bottom:3px">Seen</div>
        <div style="font-size:13px;font-weight:600;color:#334155">${seen}</div>
      </div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:9px;color:#94a3b8;text-transform:uppercase">Battery</span>
        <span style="font-size:11px;font-weight:600;color:#334155">${batt}%</span>
      </div>
      <div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${batt}%;background:${bc};border-radius:2px"></div>
      </div>
    </div>
  </div>`;
}

function timeAgo(ts: any): string {
  if (!ts) return "—";
  const date = typeof ts === "object" && ts.toDate ? ts.toDate() : new Date(ts);
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
