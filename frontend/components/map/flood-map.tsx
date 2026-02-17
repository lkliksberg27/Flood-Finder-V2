"use client";

import { useEffect, useRef } from "react";
import { Device, STATUS_CONFIG, FloodStatus } from "@/types";
import { batteryPercent, timeAgo } from "@/lib/utils";

declare const L: any;

interface Props {
  devices: Device[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  onDeviceClick?: (id: string) => void;
  route?: [number, number][] | null; // [lat, lng][]
  routeSafe?: boolean;
  showUser?: boolean;
}

export function FloodMap({
  devices,
  center = [-80.137, 25.957],
  zoom = 15,
  onDeviceClick,
  route,
  routeSafe = true,
  showUser = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routeRef = useRef<any[]>([]);
  const userRef = useRef<any[]>([]);

  // ── Init map ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    function boot() {
      if (!containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [center[1], center[0]],
        zoom,
        zoomControl: false,
        zoomAnimation: true,
        markerZoomAnimation: true,
        inertia: true,
        inertiaDeceleration: 2000,
        easeLinearity: 0.15,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
      });

      // Google Maps tiles
      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        attribution: "&copy; Google",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      // User location
      if (showUser && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            const devs = devices.filter((d) => d.lat && d.lng);
            if (devs.length === 0) map.setView([lat, lng], zoom);

            userRef.current.push(
              L.circle([lat, lng], {
                radius: Math.min(accuracy, 150),
                fillColor: "#4285f4", fillOpacity: 0.06,
                color: "#4285f4", weight: 1, opacity: 0.15,
              }).addTo(map)
            );
            userRef.current.push(
              L.circleMarker([lat, lng], {
                radius: 7, fillColor: "#4285f4", fillOpacity: 1,
                color: "#fff", weight: 2.5, opacity: 1,
              }).addTo(map)
            );
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }

      syncMarkers(map, devices);
    }

    if (typeof L !== "undefined") { boot(); }
    else {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = boot;
      document.head.appendChild(s);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync markers ──────────────────────────────────
  useEffect(() => {
    if (mapRef.current) syncMarkers(mapRef.current, devices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  // ── Draw route ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routeRef.current.forEach((l) => map.removeLayer(l));
    routeRef.current = [];

    if (!route || route.length < 2) return;

    const color = routeSafe ? "#4285f4" : "#ef4444";

    // Shadow
    routeRef.current.push(
      L.polyline(route, {
        color: "rgba(0,0,0,0.12)", weight: 9, lineCap: "round", lineJoin: "round",
      }).addTo(map)
    );
    // Main line
    routeRef.current.push(
      L.polyline(route, {
        color, weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round",
      }).addTo(map)
    );
    // Start dot (green)
    routeRef.current.push(
      L.circleMarker(route[0], {
        radius: 8, fillColor: "#22c55e", fillOpacity: 1, color: "#fff", weight: 3,
      }).addTo(map)
    );
    // End dot (red)
    routeRef.current.push(
      L.circleMarker(route[route.length - 1], {
        radius: 8, fillColor: "#ef4444", fillOpacity: 1, color: "#fff", weight: 3,
      }).addTo(map)
    );

    map.fitBounds(L.latLngBounds(route), { padding: [70, 70], maxZoom: 16 });
  }, [route, routeSafe]);

  function syncMarkers(map: any, devs: Device[]) {
    const cur = new Set(devs.map((d) => d.deviceId));
    // Remove stale
    for (const [id, m] of markersRef.current) {
      if (!cur.has(id)) { map.removeLayer(m); markersRef.current.delete(id); }
    }
    // Upsert
    for (const d of devs) {
      if (!d.lat || !d.lng) continue;
      const existing = markersRef.current.get(d.deviceId);
      if (existing) {
        existing.setLatLng([d.lat, d.lng]);
        existing.setIcon(icon(d.status));
        if (existing.getPopup()) existing.getPopup().setContent(popup(d));
      } else {
        const m = L.marker([d.lat, d.lng], { icon: icon(d.status) })
          .addTo(map)
          .bindPopup(popup(d), { maxWidth: 290, className: "flood-popup" });
        m.on("click", () => onDeviceClick?.(d.deviceId));
        markersRef.current.set(d.deviceId, m);
      }
    }
  }

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />;
}

// ── Marker icon ─────────────────────────────────────
function icon(status: FloodStatus) {
  const c = STATUS_CONFIG[status].mapColor;
  const alert = status === "ALERT";
  const d = alert ? 20 : 14;
  const o = alert ? 36 : 22;
  return L.divIcon({
    className: "",
    iconSize: [o, o],
    iconAnchor: [o / 2, o / 2],
    popupAnchor: [0, -(o / 2 + 4)],
    html: `<div style="width:${o}px;height:${o}px;display:flex;align-items:center;justify-content:center;position:relative">
      ${alert ? `<div style="position:absolute;inset:0;border-radius:50%;background:${c};opacity:.25;animation:ping-marker 1.5s cubic-bezier(0,0,.2,1) infinite"></div>` : ""}
      <div style="width:${d}px;height:${d}px;border-radius:50%;background:${c};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);position:relative;z-index:1"></div>
    </div>`,
  });
}

// ── Popup HTML ──────────────────────────────────────
function popup(d: Device): string {
  const s = STATUS_CONFIG[d.status];
  const batt = batteryPercent(d.batteryV);
  const seen = d.lastSeen ? timeAgo(d.lastSeen) : "—";
  const bc = batt > 60 ? "#22c55e" : batt > 25 ? "#f59e0b" : "#ef4444";

  return `<div style="padding:16px 18px;font-family:Inter,sans-serif;min-width:230px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <div style="width:10px;height:10px;border-radius:50%;background:${s.color};box-shadow:0 0 8px ${s.color}55"></div>
      <div style="font-size:15px;font-weight:700;color:#0f172a">${d.name}</div>
    </div>
    <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.05em;background:${s.color}15;color:${s.color};margin-bottom:14px">${s.label.toUpperCase()}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:#f8fafc;border-radius:12px;padding:10px">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Water Level</div>
        <div style="font-size:18px;font-weight:800;color:${s.color};font-family:'JetBrains Mono',monospace">${d.waterLevelCm.toFixed(1)}<span style="font-size:11px;color:#94a3b8"> cm</span></div>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:10px">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Last Seen</div>
        <div style="font-size:14px;font-weight:600;color:#334155">${seen}</div>
      </div>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:10px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Battery</span>
        <span style="font-size:12px;font-weight:600;color:#334155;font-family:'JetBrains Mono',monospace">${batt}%</span>
      </div>
      <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${batt}%;background:${bc};border-radius:3px"></div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;font-family:'JetBrains Mono',monospace">${d.batteryV.toFixed(2)}V${d.rssi ? ` • ${d.rssi} dBm` : ""}${d.snr ? ` • SNR ${d.snr}` : ""}</div>
    </div>
    <a href="/device/${d.deviceId}" style="display:block;text-align:center;padding:10px;background:#3b82f6;color:#fff;border-radius:12px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.01em">View Details →</a>
  </div>`;
}
