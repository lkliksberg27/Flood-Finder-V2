"use client";

import { useEffect, useRef, useCallback } from "react";
import { Device, STATUS_CONFIG, FloodStatus } from "@/types";
import { batteryPercent, timeAgo } from "@/lib/utils";

declare const L: any;

interface FloodMapProps {
  devices: Device[];
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  onDeviceClick?: (deviceId: string) => void;
  routePoints?: [number, number][]; // array of [lat, lng] for route
  routeColor?: string;
  showUserLocation?: boolean;
}

export function FloodMap({
  devices,
  initialCenter = [-80.137, 25.957], // Aventura default
  initialZoom = 14,
  onDeviceClick,
  routePoints,
  routeColor = "#3b82f6",
  showUserLocation = true,
}: FloodMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

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

      // Clean light tiles (Google Maps style)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Zoom control top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      mapRef.current = map;

      // Get user location
      if (showUserLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], initialZoom);

            // Blue dot for user location
            userMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              fillColor: "#4285f4",
              fillOpacity: 1,
              color: "#ffffff",
              weight: 3,
              opacity: 1,
            }).addTo(map);

            // Accuracy ring
            L.circleMarker([latitude, longitude], {
              radius: 20,
              fillColor: "#4285f4",
              fillOpacity: 0.1,
              color: "#4285f4",
              weight: 1,
              opacity: 0.3,
            }).addTo(map);
          },
          () => {
            // Geolocation denied — center on devices or default
            const located = devices.filter((d) => d.lat && d.lng);
            if (located.length > 0) {
              const avgLat = located.reduce((s, d) => s + d.lat, 0) / located.length;
              const avgLng = located.reduce((s, d) => s + d.lng, 0) / located.length;
              map.setView([avgLat, avgLng], initialZoom);
            }
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      if (devices.length > 0) updateMarkers(map, devices);
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

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    updateMarkers(map, devices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  // Update route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routePoints && routePoints.length > 1) {
      routeLayerRef.current = L.polyline(routePoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.8,
        dashArray: "10, 8",
        lineCap: "round",
      }).addTo(map);

      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
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
            maxWidth: 280,
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
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}

function createIcon(status: FloodStatus) {
  const color = STATUS_CONFIG[status].mapColor;
  const isAlert = status === "ALERT";
  const size = isAlert ? 20 : 16;
  const outerSize = isAlert ? 36 : 24;

  return L.divIcon({
    className: "flood-marker",
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
    popupAnchor: [0, -outerSize / 2],
    html: `
      <div style="position:relative;width:${outerSize}px;height:${outerSize}px;display:flex;align-items:center;justify-content:center;">
        ${isAlert ? `<div style="position:absolute;width:${outerSize}px;height:${outerSize}px;border-radius:50%;background:${color};opacity:0.3;animation:marker-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:1;"></div>
      </div>
    `,
  });
}

function buildPopupHTML(device: Device): string {
  const sc = STATUS_CONFIG[device.status];
  const batt = batteryPercent(device.batteryV);
  const lastSeen = device.lastSeen ? timeAgo(device.lastSeen) : "never";

  return `
    <div style="padding:14px 16px;font-family:'DM Sans',sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${sc.color};box-shadow:0 0 6px ${sc.color}88;"></div>
        <span style="font-size:15px;font-weight:600;color:#1f2937;">${device.name}</span>
      </div>
      <div style="font-size:11px;color:#9ca3af;font-family:'JetBrains Mono',monospace;margin-bottom:10px;">${device.deviceId}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
        <div>
          <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Water Level</div>
          <div style="color:${sc.color};font-weight:700;font-family:'JetBrains Mono',monospace;margin-top:2px;font-size:14px;">${device.waterLevelCm.toFixed(1)} cm</div>
        </div>
        <div>
          <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Battery</div>
          <div style="color:#374151;font-family:'JetBrains Mono',monospace;margin-top:2px;">${device.batteryV.toFixed(2)}V (${batt}%)</div>
        </div>
        <div>
          <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Status</div>
          <div style="color:${sc.color};font-weight:600;margin-top:2px;">${sc.label}</div>
        </div>
        <div>
          <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Last Seen</div>
          <div style="color:#374151;margin-top:2px;">${lastSeen}</div>
        </div>
      </div>
      <a href="/device/${device.deviceId}" style="display:block;text-align:center;margin-top:12px;padding:8px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;">View Details →</a>
    </div>
  `;
}
