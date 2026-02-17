"use client";

import { useDevices, useFloodStats } from "@/hooks/use-firestore";
import { FloodMap } from "@/components/map/flood-map";
import AppShell from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/auth-context";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import {
  Droplets,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Locate,
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
  const [cityName, setCityName] = useState("");

  const alertDevices = devices.filter((d) => d.status === "ALERT");
  const filteredDevices =
    selectedFilter === "ALL"
      ? devices
      : devices.filter((d) => d.status === selectedFilter);

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
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const state = data.address?.state || "";
            setCityName(city ? `${city}, ${state}` : "");
          } catch { setCityName(""); }
        },
        () => {},
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
      <div className="relative h-full -mb-[68px]">
        <FloodMap
          devices={devices}
          initialCenter={getMapCenter(devices)}
          initialZoom={15}
        />

        {/* ── Top floating card ──────────────────────── */}
        <div className="absolute top-[env(safe-area-inset-top,8px)] left-3 right-3 z-10 pt-2 animate-slideUp">
          <div className="bg-surface-1/85 backdrop-blur-2xl rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/20 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-white tracking-tight">Flood Finder</h2>
                {cityName && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{cityName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {stats.total > 0 && (
                  <div className="flex gap-1">
                    {stats.ok > 0 && <MiniPill count={stats.ok} status="OK" />}
                    {stats.warn > 0 && <MiniPill count={stats.warn} status="WARN" />}
                    {stats.alert > 0 && <MiniPill count={stats.alert} status="ALERT" />}
                  </div>
                )}
              </div>
            </div>
            {alertDevices.length > 0 && (
              <div className="bg-red-500/20 px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-[11px] font-semibold text-red-300">
                  {alertDevices.length} Severe Alert{alertDevices.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Legend ──────────────────────────────────── */}
        <div className="absolute bottom-[88px] left-3 z-10 animate-fadeIn">
          <div className="bg-surface-1/80 backdrop-blur-xl rounded-xl px-3 py-2.5 border border-white/[0.04]">
            <div className="space-y-1.5">
              {[
                { color: "#22c55e", label: "Normal" },
                { color: "#f59e0b", label: "Warning" },
                { color: "#ef4444", label: "Severe" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-gray-400 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom sheet ────────────────────────────── */}
        <div
          className={cn(
            "absolute bottom-[68px] left-0 right-0 z-10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            panelOpen ? "max-h-[55vh]" : "max-h-12"
          )}
        >
          <div className="bg-surface-1/90 backdrop-blur-2xl rounded-t-2xl border-t border-white/[0.06] overflow-hidden h-full flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
            {/* Drag handle */}
            <button
              onClick={() => { setPanelOpen(!panelOpen); hapticLight(); }}
              className="flex flex-col items-center py-2.5 shrink-0 active:bg-surface-2/30"
            >
              <div className="w-9 h-1 rounded-full bg-gray-600 mb-1" />
              <span className="text-[11px] text-gray-500 font-medium">
                {panelOpen ? "Close" : `${stats.total} sensors nearby`}
              </span>
            </button>

            {panelOpen && (
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {/* Filter pills */}
                <div className="flex gap-1.5 px-4 pb-3">
                  {(["ALL", "ALERT", "WARN", "OK"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setSelectedFilter(f); hapticLight(); }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95",
                        selectedFilter === f
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-surface-2/50 text-gray-500"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-white/[0.03]">
                  {filteredDevices.map((device, i) => (
                    <Link
                      key={device.deviceId}
                      href={`/device/${device.deviceId}`}
                      onClick={() => hapticLight()}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2/30 transition-colors"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: STATUS_CONFIG[device.status].color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-100 truncate">{device.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {device.waterLevelCm.toFixed(1)} cm • {timeAgo(device.lastSeen)}
                        </p>
                      </div>
                      <StatusBadge status={device.status} />
                    </Link>
                  ))}
                  {filteredDevices.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <Droplets className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No sensors found</p>
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

function MiniPill({ count, status }: { count: number; status: FloodStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
      style={{ background: `${config.color}20`, color: config.color }}
    >
      {count}
    </span>
  );
}

function getMapCenter(devices: Device[]): [number, number] {
  const located = devices.filter((d) => d.lat && d.lng);
  if (located.length === 0) return [-80.137, 25.957];
  const avgLng = located.reduce((s, d) => s + d.lng, 0) / located.length;
  const avgLat = located.reduce((s, d) => s + d.lat, 0) / located.length;
  return [avgLng, avgLat];
}
