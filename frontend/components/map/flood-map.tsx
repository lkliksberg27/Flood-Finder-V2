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
}

export function FloodMap({
  devices,
  initialCenter = [-95.37, 29.76],
  initialZoom = 14,
  onDeviceClick,
}: FloodMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (typeof L === "undefined") {
      // Leaflet not loaded yet — load script dynamically
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapContainer.current || mapRef.current) return;
      // Leaflet uses [lat, lng] — our initialCenter is [lng, lat]
      const map = L.map(mapContainer.current, {
        center: [initialCenter[1], initialCenter[0]],
        zoom: initialZoom,
        zoomControl: true,
        attributionControl: true,
      });

      // Dark tile layer (free, no API key)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;

      // If devices already exist, trigger update
      if (devices.length > 0) {
        updateMarkers(map, devices);
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

  // Update markers when devices change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    updateMarkers(map, devices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  function updateMarkers(map: any, devs: Device[]) {
    const existingIds = new Set(markersRef.current.keys());
    const currentIds = new Set(devs.map((d) => d.deviceId));

    // Remove old markers
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        map.removeLayer(markersRef.current.get(id));
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    for (const device of devs) {
      if (!device.lat || !device.lng) continue;

      const color = STATUS_CONFIG[device.status].mapColor;
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

        marker.on("click", () => {
          onDeviceClick?.(device.deviceId);
        });

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
  const size = isAlert ? 18 : 14;
  const outerSize = isAlert ? 32 : 20;

  return L.divIcon({
    className: "flood-marker",
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
    popupAnchor: [0, -outerSize / 2],
    html: `
      <div style="position:relative;width:${outerSize}px;height:${outerSize}px;display:flex;align-items:center;justify-content:center;">
        ${
          isAlert
            ? `<div style="position:absolute;width:${outerSize}px;height:${outerSize}px;border-radius:50%;background:${color};opacity:0.3;animation:marker-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : ""
        }
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #111827;box-shadow:0 0 8px ${color}66;z-index:1;"></div>
      </div>
    `,
  });
}

function buildPopupHTML(device: Device): string {
  const statusConf = STATUS_CONFIG[device.status];
  const batt = batteryPercent(device.batteryV);
  const lastSeen = device.lastSeen ? timeAgo(device.lastSeen) : "never";

  return `
    <div style="padding: 14px 16px; font-family: 'DM Sans', sans-serif;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusConf.color};"></div>
        <span style="font-size: 14px; font-weight: 600; color: #e5e7eb;">${device.name}</span>
      </div>
      <div style="font-size: 11px; color: #6b7280; font-family: 'JetBrains Mono', monospace; margin-bottom: 10px;">
        ${device.deviceId}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
        <div>
          <div style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Water Level</div>
          <div style="color: ${statusConf.color}; font-weight: 600; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">
            ${device.waterLevelCm.toFixed(1)} cm
          </div>
        </div>
        <div>
          <div style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Battery</div>
          <div style="color: #d1d5db; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">
            ${device.batteryV.toFixed(2)}V (${batt}%)
          </div>
        </div>
        <div>
          <div style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Status</div>
          <div style="color: ${statusConf.color}; font-weight: 600; margin-top: 2px;">
            ${statusConf.label}
          </div>
        </div>
        <div>
          <div style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Last Seen</div>
          <div style="color: #d1d5db; margin-top: 2px;">${lastSeen}</div>
        </div>
      </div>
      <a href="/device/${device.deviceId}"
         style="display: block; text-align: center; margin-top: 12px; padding: 6px; background: rgba(59,130,246,0.15); color: #60a5fa; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
        View Details →
      </a>
    </div>
  `;
}
