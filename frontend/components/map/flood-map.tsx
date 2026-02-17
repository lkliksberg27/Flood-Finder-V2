"use client";

import { useEffect, useRef } from "react";
import { Device, STATUS_CONFIG, FloodStatus } from "@/types";
import { batteryPercent, timeAgo } from "@/lib/utils";

declare const L: any;

interface FloodMapProps {
  devices: Device[];
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  onDeviceClick?: (deviceId: string) => void;
  routePoints?: [number, number][];
  routeColor?: string;
  showUserLocation?: boolean;
}

export function FloodMap({
  devices,
  initialCenter = [-80.137, 25.957],
  initialZoom = 15,
  onDeviceClick,
  routePoints,
  routeColor = "#4285f4",
  showUserLocation = true,
}: FloodMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const accuracyRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (typeof L === "undefined") {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapContainer.current || mapRef.current) return;

      const map = L.map(mapContainer.current, {
        center: [initialCenter[1], initialCenter[0]],
        zoom: initialZoom,
        zoomControl: false,
      });

      // Google Maps-style tiles (clean, colorful, detailed)
      L.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
        }
      ).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      // User location
      if (showUserLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            // Only recenter if no devices
            const located = devices.filter((d) => d.lat && d.lng);
            if (located.length === 0) {
              map.setView([latitude, longitude], initialZoom);
            }

            // Blue dot
            userMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 7,
              fillColor: "#4285f4",
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2.5,
              opacity: 1,
            }).addTo(map).bindPopup(
              `<div style="font-family:'DM Sans',sans-serif;padding:4px 2px;text-align:center;">
                <span style="font-size:13px;font-weight:600;color:#1f2937;">Your Location</span>
              </div>`
            );

            // Accuracy circle
            accuracyRef.current = L.circle([latitude, longitude], {
              radius: Math.min(accuracy, 200),
              fillColor: "#4285f4",
              fillOpacity: 0.08,
              color: "#4285f4",
              weight: 1,
              opacity: 0.2,
            }).addTo(map);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      if (devices.length > 0) {
        updateMarkers(map, devices);
        // Fit bounds to show all devices
        const located = devices.filter((d) => d.lat && d.lng);
        if (located.length > 1) {
          const bounds = L.latLngBounds(located.map((d: Device) => [d.lat, d.lng]));
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    updateMarkers(map, devices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routePoints && routePoints.length > 1) {
      // Draw route with Google Maps-style look
      // Shadow line underneath
      L.polyline(routePoints, {
        color: "rgba(0,0,0,0.15)",
        weight: 8,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routeLayerRef.current = L.polyline(routePoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Start/end markers
      const startIcon = L.divIcon({
        className: "route-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      });
      const endIcon = L.divIcon({
        className: "route-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      });

      L.marker(routePoints[0], { icon: startIcon }).addTo(map);
      L.marker(routePoints[routePoints.length - 1], { icon: endIcon }).addTo(map);

      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [80, 80] });
    }
  }, [routePoints, routeColor]);

  function updateMarkers(map: any, devs: Device[]) {
    const existingIds = new Set(markersRef.current.keys());
    const currentIds = new Set(devs.map((d) => d.deviceId));

    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        map.removeLayer(markersRef.current.get(id));
        markersRef.current.delete(id);
      }
    }

    for (const device of devs) {
      if (!device.lat || !device.lng) continue;
      const existing = markersRef.current.get(device.deviceId);

      if (existing) {
        existing.setLatLng([device.lat, device.lng]);
        existing.setIcon(createIcon(device.status));
        existing.setPopupContent(buildPopupHTML(device));
      } else {
        const marker = L.marker([device.lat, device.lng], {
          icon: createIcon(device.status),
        })
          .addTo(map)
          .bindPopup(buildPopupHTML(device), {
            maxWidth: 300,
            className: "flood-popup",
          });

        marker.on("click", () => onDeviceClick?.(device.deviceId));
        markersRef.current.set(device.deviceId, marker);
      }
    }
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-full overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}

function createIcon(status: FloodStatus) {
  const color = STATUS_CONFIG[status].mapColor;
  const isAlert = status === "ALERT";
  const size = isAlert ? 22 : 16;
  const outerSize = isAlert ? 40 : 28;

  return L.divIcon({
    className: "flood-marker",
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
    popupAnchor: [0, -outerSize / 2],
    html: `
      <div style="position:relative;width:${outerSize}px;height:${outerSize}px;display:flex;align-items:center;justify-content:center;">
        ${isAlert ? `<div style="position:absolute;width:${outerSize}px;height:${outerSize}px;border-radius:50%;background:${color};opacity:0.25;animation:marker-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);z-index:1;"></div>
      </div>
    `,
  });
}

function buildPopupHTML(device: Device): string {
  const sc = STATUS_CONFIG[device.status];
  const batt = batteryPercent(device.batteryV);
  const lastSeen = device.lastSeen ? timeAgo(device.lastSeen) : "never";

  // Battery bar color
  const battColor = batt > 60 ? "#22c55e" : batt > 30 ? "#f59e0b" : "#ef4444";

  return `
    <div style="padding:16px 18px;font-family:'DM Sans',sans-serif;min-width:240px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:12px;height:12px;border-radius:50%;background:${sc.color};box-shadow:0 0 8px ${sc.color}66;"></div>
        <span style="font-size:15px;font-weight:700;color:#1f2937;">${device.name}</span>
      </div>
      <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.04em;margin-bottom:12px;background:${sc.color}18;color:${sc.color};">${sc.label.toUpperCase()}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:12px;">
        <div style="background:#f8fafc;border-radius:10px;padding:10px;">
          <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Water Level</div>
          <div style="color:${sc.color};font-weight:700;font-family:'JetBrains Mono',monospace;font-size:16px;">${device.waterLevelCm.toFixed(1)}<span style="font-size:11px;color:#9ca3af;"> cm</span></div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:10px;">
          <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Last Seen</div>
          <div style="color:#374151;font-weight:600;font-size:13px;">${lastSeen}</div>
        </div>
      </div>

      <!-- Battery bar -->
      <div style="background:#f8fafc;border-radius:10px;padding:10px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Battery</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#374151;">${batt}% <span style="color:#9ca3af;font-size:10px;">(${device.batteryV.toFixed(2)}V)</span></span>
        </div>
        <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${batt}%;background:${battColor};border-radius:3px;transition:width 0.3s;"></div>
        </div>
      </div>

      ${device.rssi ? `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:8px 10px;">
          <div style="color:#9ca3af;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;">Signal</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#374151;">${device.rssi} dBm</div>
        </div>
        ${device.snr ? `
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:8px 10px;">
          <div style="color:#9ca3af;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;">SNR</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#374151;">${device.snr}</div>
        </div>` : ""}
      </div>` : ""}

      <a href="/device/${device.deviceId}" style="display:block;text-align:center;padding:10px;background:#4285f4;color:#fff;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(66,133,244,0.3);">View Details →</a>
    </div>
  `;
}
