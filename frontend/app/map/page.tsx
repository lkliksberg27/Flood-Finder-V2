"use client";

import { useDevices, useFloodStats } from "@/hooks/use-firestore";
import { FloodMap } from "@/components/map/flood-map";
import AppShell from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/auth-context";
import {
  Droplets,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";
import Link from "next/link";

export default function MapPage() {
  const { devices, loading } = useDevices();
  const { isAdmin } = useAuth();
  const stats = useFloodStats(devices);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FloodStatus | "ALL">("ALL");
  const [cityName, setCityName] = useState("Loading...");

  const alertDevices = devices.filter((d) => d.status === "ALERT");
  const filteredDevices =
    selectedFilter === "ALL"
      ? devices
      : devices.filter((d) => d.status === selectedFilter);

  // Get city name from geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await resp.json();
            const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
            const state = data.address?.state || "";
            setCityName(`${city}, ${state}`);
          } catch {
            setCityName("Your Area");
          }
        },
        () => setCityName("Your Area"),
        { timeout: 5000 }
      );
    }
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative h-full">
        {/* Full-screen map */}
        <FloodMap
          devices={devices}
          initialCenter={getMapCenter(devices)}
          initialZoom={devices.length > 0 ? 14 : 14}
        />

        {/* Top header card */}
        <div className="absolute top-3 left-3 right-3 md:right-auto md:max-w-sm z-10">
          <div className="card overflow-hidden backdrop-blur-md bg-surface-1/90">
            <div className="px-4 py-3">
              <h2 className="text-base font-bold text-gray-100">Flood Finder</h2>
              <p className="text-xs text-gray-500">{cityName}</p>
            </div>
            {alertDevices.length > 0 && (
              <div className="bg-red-500/20 px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-semibold text-red-300">
                  {alertDevices.length} Severe Alert{alertDevices.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-20 md:bottom-4 left-3 z-10">
          <div className="card px-3 py-2.5 backdrop-blur-md bg-surface-1/90">
            <p className="text-[10px] text-gray-400 font-semibold mb-1.5">Legend</p>
            <div className="space-y-1">
              {[
                { color: "#22c55e", label: "None" },
                { color: "#f59e0b", label: "Mild" },
                { color: "#f97316", label: "Moderate" },
                { color: "#ef4444", label: "Severe" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom panel (device list) */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-10 transition-all duration-300",
            panelOpen ? "max-h-[60vh]" : "max-h-14"
          )}
        >
          <div className="card rounded-b-none backdrop-blur-md bg-surface-1/95 overflow-hidden h-full flex flex-col">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            >
              {panelOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
              {panelOpen ? "Close" : `${stats.total} devices`}
            </button>

            {panelOpen && (
              <div className="flex-1 overflow-y-auto pb-16">
                <div className="flex gap-1 px-4 pb-2">
                  {(["ALL", "ALERT", "WARN", "OK"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFilter(f)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                        selectedFilter === f
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-surface-3/30">
                  {filteredDevices.map((device) => (
                    <div
                      key={device.deviceId}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/30 transition-colors"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: STATUS_CONFIG[device.status].color,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">
                          {device.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {device.waterLevelCm.toFixed(1)} cm •{" "}
                          {timeAgo(device.lastSeen)}
                        </p>
                      </div>
                      <StatusBadge status={device.status} />
                      {isAdmin && (
                        <Link
                          href={`/device/${device.deviceId}`}
                          className="text-[11px] text-blue-400"
                        >
                          Details
                        </Link>
                      )}
                    </div>
                  ))}
                  {filteredDevices.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No devices found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function getMapCenter(devices: Device[]): [number, number] {
  const located = devices.filter((d) => d.lat && d.lng);
  if (located.length === 0) return [-80.137, 25.957]; // Aventura default
  const avgLng = located.reduce((s, d) => s + d.lng, 0) / located.length;
  const avgLat = located.reduce((s, d) => s + d.lat, 0) / located.length;
  return [avgLng, avgLat];
}
