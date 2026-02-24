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
  const size = sensor.status === "ALERT" ? 18 : 14;
  const pulseClass = sensor.status === "ALERT" ? "sensor-marker-alert" : "";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
    html: `<div class="sensor-marker ${pulseClass}" style="width:${size}px;height:${size}px;background:${color};"></div>`,
  });
}

function createPopupContent(sensor: Sensor): string {
  const color = STATUS_COLORS[sensor.status];
  const label = STATUS_LABELS[sensor.status];
  const battPct = getBatteryPercent(sensor.batteryV);
  const battColor = battPct > 60 ? "#34d399" : battPct > 30 ? "#fbbf24" : "#f87171";
  const relTime = getRelativeTime(sensor.lastSeen);
  const rssiBar = sensor.rssi
    ? `<div style="margin-top:8px;font-size:11px;color:#94a3b8;">Signal: ${sensor.rssi} dBm</div>`
    : "";

  return `
    <div style="padding:4px 2px;min-width:200px;">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#f1f5f9;">${sensor.name}</div>
      <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${color}22;color:${color};margin-bottom:10px;">${label}</div>
      <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:10px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#f1f5f9;">${sensor.waterLevelCm}</span>
        <span style="font-size:14px;color:#94a3b8;">cm</span>
      </div>
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;color:#94a3b8;">Battery</span>
          <span style="font-size:12px;color:${battColor};font-weight:600;">${battPct}%</span>
        </div>
        <div style="height:6px;background:#1e293b;border-radius:3px;overflow:hidden;">
          <div style="width:${battPct}%;height:100%;background:${battColor};border-radius:3px;transition:width 0.3s;"></div>
        </div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">${sensor.batteryV.toFixed(1)}V</div>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Last seen: ${relTime}</div>
      ${rssiBar}
    </div>
  `;
}

export default function MapView() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cityName, setCityName] = useState("Aventura, FL");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

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

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      attribution: "&copy; Google Maps",
    }).addTo(map);

    // Add sensor markers
    sensors.forEach((sensor) => {
      const marker = L.marker([sensor.lat, sensor.lng], {
        icon: createSensorIcon(sensor),
      }).addTo(map);

      marker.bindPopup(createPopupContent(sensor), {
        maxWidth: 260,
        closeButton: true,
      });
    });

    // User location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserPos([latitude, longitude]);

          L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              html: '<div class="user-location-dot"></div>',
            }),
          }).addTo(map);

          map.setView([latitude, longitude], 14);

          // Reverse geocode
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
          // Permission denied — center on Aventura
          map.setView([25.9565, -80.1392], 14);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-[100dvh] w-full">
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Floating header */}
      <div className="absolute left-0 right-0 top-0 z-[500] p-4">
        <div className="rounded-2xl border border-border-card bg-bg-card/80 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Droplets size={22} className="text-accent" />
            <h1 className="text-lg font-bold text-text-primary">Flood Finder</h1>
          </div>
          <p className="mt-1 text-xs text-text-secondary">{cityName}</p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-safe/15 px-3 py-1 text-xs font-semibold text-safe">
              {okCount} OK
            </span>
            <span className="rounded-full bg-warn/15 px-3 py-1 text-xs font-semibold text-warn">
              {warnCount} WARN
            </span>
            <span className="rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold text-danger">
              {alertCount} ALERT
            </span>
          </div>
        </div>

        {/* Alert banner */}
        {alertCount > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-danger/15 px-4 py-3 backdrop-blur-xl">
            <AlertTriangle size={18} className="text-danger" />
            <span className="text-sm font-medium text-danger">
              {alertCount} sensor{alertCount > 1 ? "s" : ""} detecting severe flooding nearby
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
