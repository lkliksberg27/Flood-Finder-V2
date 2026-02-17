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
import { useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";
import Link from "next/link";

export default function MapPage() {
  const { devices, loading } = useDevices();
  const { isAdmin } = useAuth();
  const stats = useFloodStats(devices);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FloodStatus | "ALL">("ALL");

  const alertDevices = devices.filter((d) => d.status === "ALERT");
  const filteredDevices =
    selectedFilter === "ALL"
      ? devices
      : devices.filter((d) => d.status === selectedFilter);

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
        {/* ── Full-screen map ────────────────────────────────────── */}
        <FloodMap
          devices={devices}
          initialCenter={getMapCenter(devices)}
          initialZoom={devices.length > 0 ? 14 : 12}
        />

        {/* ── Top-left status bar ────────────────────────────────── */}
        <div className="absolute top-3 left-3 right-3 md:right-auto md:max-w-sm z-10">
          <div className="card p-3 backdrop-blur-sm bg-surface-1/90">
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200">
                  Neighborhood Flood Status
                </p>
                <p className="text-[11px] text-gray-500">
                  {stats.total} sensors • Live
                </p>
              </div>
              <div className="flex gap-1.5">
                <MiniStat count={stats.ok} status="OK" />
                <MiniStat count={stats.warn} status="WARN" />
                <MiniStat count={stats.alert} status="ALERT" />
              </div>
            </div>
          </div>

          {/* Alert banner */}
          {alertDevices.length > 0 && (
            <div className="card mt-2 p-3 backdrop-blur-sm bg-red-500/10 border-red-500/30 animate-pulse-slow">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">
                  <span className="font-semibold">{alertDevices.length} FLOOD ALERT{alertDevices.length > 1 ? "S" : ""}</span>
                  {" — "}
                  {alertDevices.map((d) => d.name).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom panel (mobile-friendly device list) ──────────── */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-10 transition-all duration-300",
            panelOpen ? "max-h-[60vh]" : "max-h-14"
          )}
        >
          <div className="card rounded-b-none backdrop-blur-sm bg-surface-1/95 overflow-hidden h-full flex flex-col">
            {/* Toggle bar */}
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
              <div className="flex-1 overflow-y-auto">
                {/* Filter tabs */}
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

                {/* Device list */}
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────
function MiniStat({ count, status }: { count: number; status: FloodStatus }) {
  if (count === 0) return null;
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums",
        config.bgClass,
        config.textClass
      )}
    >
      {count}
    </span>
  );
}

function getMapCenter(devices: Device[]): [number, number] {
  const located = devices.filter((d) => d.lat && d.lng);
  if (located.length === 0) return [-95.37, 29.76]; // Default: Houston
  const avgLng = located.reduce((s, d) => s + d.lng, 0) / located.length;
  const avgLat = located.reduce((s, d) => s + d.lat, 0) / located.length;
  return [avgLng, avgLat];
}
