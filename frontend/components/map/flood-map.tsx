"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Device, STATUS_CONFIG, FloodStatus } from "@/types";
import { batteryPercent, timeAgo } from "@/lib/utils";

declare const L: any;

interface Props {
  devices: Device[];
  center?: [number, number];
  zoom?: number;
  onDeviceClick?: (id: string) => void;
  route?: [number, number][] | null;
  routeSafe?: boolean;
  showUser?: boolean;
}

export function FloodMap({
  devices, center = [-80.137, 25.957], zoom = 15,
  onDeviceClick, route = null, routeSafe = true, showUser = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routeLayers = useRef<any[]>([]);
  const userLayers = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  // ── Init map ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    function init() {
      if (!containerRef.current || mapRef.current) return;
      
      const map = L.map(containerRef.current, {
        center: [center[1], center[0]],
        zoom,
        zoomControl: false,
        inertia: true,
        inertiaDeceleration: 2500,
        easeLinearity: 0.12,
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 100,
      });

      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        attribution: "&copy; Google",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      // Geolocation
      if (showUser && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          if (!devices.some((d) => d.lat && d.lng)) {
            map.setView([lat, lng], zoom);
          }
          userLayers.current.push(
            L.circle([lat, lng], {
              radius: Math.min(accuracy, 150),
              fillColor: "#4285f4", fillOpacity: 0.06,
              color: "#4285f4", weight: 1, opacity: 0.15,
            }).addTo(map),
            L.circleMarker([lat, lng], {
              radius: 7, fillColor: "#4285f4", fillOpacity: 1,
              color: "#fff", weight: 2.5,
            }).addTo(map)
          );
        }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
      }

      // Mark ready so route/markers effects can fire
      setReady(true);
    }

    if (typeof L !== "undefined") {
      init();
    } else {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = init;
      document.head.appendChild(s);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync markers when devices change ──────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const cur = new Set(devices.map((d) => d.deviceId));

    // Remove old
    for (const [id, m] of markersRef.current) {
      if (!cur.has(id)) { map.removeLayer(m); markersRef.current.delete(id); }
    }

    // Add/update
    for (const d of devices) {
      if (!d.lat || !d.lng) continue;
      const existing = markersRef.current.get(d.deviceId);
      if (existing) {
        existing.setLatLng([d.lat, d.lng]);
        existing.setIcon(makeIcon(d.status));
        if (existing.getPopup()) existing.getPopup().setContent(makePopup(d));
      } else {
        const m = L.marker([d.lat, d.lng], { icon: makeIcon(d.status) })
          .addTo(map)
          .bindPopup(makePopup(d), { maxWidth: 290, className: "flood-popup" });
        m.on("click", () => onDeviceClick?.(d.deviceId));
        markersRef.current.set(d.deviceId, m);
      }
    }
  }, [devices, ready]);

  // ── Draw route when route changes ─────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old route
    routeLayers.current.forEach((l) => { try { map.removeLayer(l); } catch {} });
    routeLayers.current = [];

    if (!route || route.length < 2) return;

    const color = routeSafe ? "#4285f4" : "#ef4444";

    // Shadow line
    const shadow = L.polyline(route, {
      color: "#000", weight: 10, opacity: 0.08,
      lineCap: "round", lineJoin: "round",
    }).addTo(map);
    routeLayers.current.push(shadow);

    // Main route line
    const main = L.polyline(route, {
      color, weight: 6, opacity: 0.85,
      lineCap: "round", lineJoin: "round",
    }).addTo(map);
    routeLayers.current.push(main);

    // Start marker (green circle)
    const startM = L.circleMarker(route[0], {
      radius: 9, fillColor: "#22c55e", fillOpacity: 1,
      color: "#fff", weight: 3, opacity: 1,
    }).addTo(map);
    routeLayers.current.push(startM);

    // End marker (red circle)
    const endM = L.circleMarker(route[route.length - 1], {
      radius: 9, fillColor: "#ef4444", fillOpacity: 1,
      color: "#fff", weight: 3, opacity: 1,
    }).addTo(map);
    routeLayers.current.push(endM);

    // Fit bounds with padding
    try {
      const bounds = L.latLngBounds(route);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      }
    } catch {}

  }, [route, routeSafe, ready]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />;
}

/* ── Helpers ─────────────────────────────────────── */
function makeIcon(status: FloodStatus) {
  const c = STATUS_CONFIG[status].mapColor;
  const isAlert = status === "ALERT";
  const d = isAlert ? 20 : 14;
  const o = isAlert ? 36 : 22;
  return L.divIcon({
    className: "",
    iconSize: [o, o], iconAnchor: [o/2, o/2], popupAnchor: [0, -(o/2+4)],
    html: `<div style="width:${o}px;height:${o}px;display:flex;align-items:center;justify-content:center;position:relative">
      ${isAlert ? `<div style="position:absolute;inset:0;border-radius:50%;background:${c};opacity:.25;animation:ping-marker 1.5s cubic-bezier(0,0,.2,1) infinite"></div>` : ""}
      <div style="width:${d}px;height:${d}px;border-radius:50%;background:${c};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);position:relative;z-index:1"></div>
    </div>`,
  });
}

function makePopup(d: Device): string {
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
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;font-family:'JetBrains Mono',monospace">${d.batteryV.toFixed(2)}V${d.rssi ? ` · ${d.rssi} dBm` : ""}${d.snr ? ` · SNR ${d.snr}` : ""}</div>
    </div>
  </div>`;
}
