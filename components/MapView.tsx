"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sensors, Sensor, getBatteryPercent, getRelativeTime } from "@/lib/mock-data";
import { Droplets, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  OK: "#34d399",
  WARN: "#fbbf24",
  ALERT: "#f87171",
};

const STATUS_LABELS: Record<string, string> = {
  OK: "NORMAL",
  WARN: "WARNING",
  ALERT: "SEVERE",
};

function createSensorIcon(sensor: Sensor): L.DivIcon {
  const color = STATUS_COLORS[sensor.status];
  const size = sensor.status === "ALERT" ? 20 : 14;
  const pulseClass = sensor.status === "ALERT" ? "sensor-marker-alert" : "";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 6],
    html: `<div class="sensor-marker ${pulseClass}" style="width:${size}px;height:${size}px;background:${color};"></div>`,
  });
}

function createPopupContent(sensor: Sensor): string {
  const color = STATUS_COLORS[sensor.status];
  const label = STATUS_LABELS[sensor.status];
  const battPct = getBatteryPercent(sensor.batteryV);
  const battColor = battPct > 60 ? "#34d399" : battPct > 30 ? "#fbbf24" : "#f87171";
  const relTime = getRelativeTime(sensor.lastSeen);

  return `
    <div style="min-width:210px;font-family:'DM Sans',system-ui,sans-serif;">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#f1f5f9;">${sensor.name}</div>
      <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${color}22;color:${color};margin-bottom:12px;">${label}</div>
      <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:12px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:#f1f5f9;">${sensor.waterLevelCm}</span>
        <span style="font-size:14px;color:#94a3b8;">cm</span>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:11px;color:#94a3b8;">Battery</span>
          <span style="font-size:11px;color:${battColor};font-weight:600;">${battPct}%</span>
        </div>
        <div style="height:5px;background:#1e293b;border-radius:3px;overflow:hidden;">
          <div style="width:${battPct}%;height:100%;background:${battColor};border-radius:3px;"></div>
        </div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">${sensor.batteryV.toFixed(1)}V</div>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Last seen: ${relTime}</div>
      ${sensor.rssi ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">Signal: ${sensor.rssi} dBm</div>` : ""}
    </div>
  `;
}

export default function MapView() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cityName, setCityName] = useState("Aventura, FL");

  const okCount = sensors.filter((s) => s.status === "OK").length;
  const warnCount = sensors.filter((s) => s.status === "WARN").length;
  const alertCount = sensors.filter((s) => s.status === "ALERT").length;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25.9565, -80.1392],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // Add zoom controls to the right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Google Maps tiles
    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      attribution: "&copy; Google Maps",
    }).addTo(map);

    // Force invalidate after render
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Add sensor markers
    sensors.forEach((sensor) => {
      const marker = L.marker([sensor.lat, sensor.lng], {
        icon: createSensorIcon(sensor),
      }).addTo(map);

      marker.bindPopup(createPopupContent(sensor), {
        maxWidth: 280,
        closeButton: true,
      });
    });

    // User location
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              html: '<div class="user-location-dot"></div>',
            }),
          }).addTo(map);

          map.setView([latitude, longitude], 14);

          // Reverse geocode for city name
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
            .then((r) => r.json())
            .then((data) => {
              const city =
                data.address?.city ||
                data.address?.town ||
                data.address?.suburb ||
                "Aventura";
              const state = data.address?.state || "FL";
              setCityName(`${city}, ${state}`);
            })
            .catch(() => {});
        },
        () => {
          map.setView([25.9565, -80.1392], 14);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    mapRef.current = map;

    // Additional invalidate after tiles load
    map.on("load", () => map.invalidateSize());
    window.addEventListener("resize", () => map.invalidateSize());

    return () => {
      window.removeEventListener("resize", () => map.invalidateSize());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full" style={{ height: "calc(100dvh - 72px)" }}>
      {/* Map container — explicit dimensions */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      />

      {/* Floating header */}
      <div className="absolute left-0 right-0 top-0 z-[500] p-3">
        <div className="rounded-2xl border border-[#1e293b] bg-[#111827]/85 p-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Droplets size={20} className="text-[#3b82f6]" />
            <h1 className="text-base font-bold text-[#f1f5f9]">Flood Finder</h1>
          </div>
          <p className="mt-0.5 text-[11px] text-[#94a3b8]">{cityName}</p>
          <div className="mt-2.5 flex gap-2">
            <span className="rounded-full bg-[#34d399]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#34d399]">
              {okCount} OK
            </span>
            <span className="rounded-full bg-[#fbbf24]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#fbbf24]">
              {warnCount} WARN
            </span>
            <span className="rounded-full bg-[#f87171]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#f87171]">
              {alertCount} ALERT
            </span>
          </div>
        </div>

        {alertCount > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#f87171]/15 px-4 py-2.5 backdrop-blur-xl">
            <AlertTriangle size={16} className="text-[#f87171]" />
            <span className="text-xs font-medium text-[#f87171]">
              {alertCount} sensor{alertCount > 1 ? "s" : ""} detecting severe flooding
            </span>
          </div>
        )}
      </div>

      {/* Map Legend — bottom left */}
      <div className="absolute bottom-4 left-3 z-[500]">
        <div className="map-legend">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#34d399] ring-2 ring-white/80" />
              <span className="text-[10px] text-[#94a3b8]">Clear</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#fbbf24] ring-2 ring-white/80" />
              <span className="text-[10px] text-[#94a3b8]">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#f87171] ring-2 ring-white/80" />
              <span className="text-[10px] text-[#94a3b8]">Flooding</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
