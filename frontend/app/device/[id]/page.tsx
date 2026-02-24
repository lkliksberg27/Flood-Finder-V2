"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useDeviceReadings } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  WaterLevelChart,
  BatteryChart,
} from "@/components/charts/water-level-chart";
import { Device, STATUS_CONFIG } from "@/types";
import {
  batteryPercent,
  batteryColor,
  timeAgo,
  cn,
} from "@/lib/utils";
import {
  ArrowLeft,
  Battery,
  Droplets,
  MapPin,
  Radio,
  Wifi,
  WifiOff,
  Loader2,
  Clock,
} from "lucide-react";

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceId = params.id as string;
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<1 | 6 | 24>(1);
  const { readings, loading: readingsLoading } = useDeviceReadings(
    deviceId,
    timeRange,
    timeRange === 1 ? 600 : timeRange === 6 ? 1000 : 2000
  );

  // Redirect non-admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Subscribe to device doc
  useEffect(() => {
    if (!deviceId) return;
    const unsub = onSnapshot(
      doc(db, "devices", deviceId),
      (snap) => {
        if (snap.exists()) {
          setDevice(snap.data() as Device);
        }
        setDeviceLoading(false);
      },
      (err) => {
        console.error("Device fetch error:", err);
        setDeviceLoading(false);
      }
    );
    return unsub;
  }, [deviceId]);

  if (authLoading || deviceLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!device) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
          <Radio className="w-12 h-12" />
          <p className="text-sm">Device not found: {deviceId}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-surface-2 text-gray-300 text-sm rounded-lg hover:bg-surface-3"
          >
            Back to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  const statusConf = STATUS_CONFIG[device.status];
  const isStale = device.lastSeen
    ? Date.now() - device.lastSeen.toMillis() > 2 * 60 * 1000
    : true;

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* ── Back + Header ──────────────────────────────────────── */}
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-100">
                  {device.name}
                </h1>
                <StatusBadge status={device.status} size="md" />
              </div>
              <p className="text-sm text-gray-500 font-mono mt-1">
                {device.deviceId}
              </p>
            </div>

            {/* Online status pill */}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ring-1",
                isStale
                  ? "bg-red-500/10 text-red-400 ring-red-500/20"
                  : "bg-green-500/10 text-green-400 ring-green-500/20"
              )}
            >
              {isStale ? (
                <WifiOff className="w-3.5 h-3.5" />
              ) : (
                <Wifi className="w-3.5 h-3.5" />
              )}
              {isStale ? "Offline" : "Online"} • {timeAgo(device.lastSeen)}
            </div>
          </div>
        </div>

        {/* ── Quick Stats Row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickStat
            icon={Droplets}
            label="Water Level"
            value={`${device.waterLevelCm.toFixed(1)} cm`}
            color={statusConf.color}
          />
          <QuickStat
            icon={Battery}
            label="Battery"
            value={`${device.batteryV.toFixed(2)}V (${batteryPercent(device.batteryV)}%)`}
            color={batteryPercent(device.batteryV) > 20 ? "#a78bfa" : "#ef4444"}
          />
          <QuickStat
            icon={MapPin}
            label="Distance"
            value={`${device.distanceCm.toFixed(1)} cm`}
            color="#94a3b8"
          />
          <QuickStat
            icon={Radio}
            label="RSSI / SNR"
            value={
              device.rssi != null
                ? `${device.rssi} dBm / ${device.snr?.toFixed(1) ?? "—"}`
                : "No data"
            }
            color="#94a3b8"
          />
        </div>

        {/* ── Water Level Chart ──────────────────────────────────── */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">
              Water Level
            </h2>
            <div className="flex gap-1">
              {([1, 6, 24] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setTimeRange(h)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all",
                    timeRange === h
                      ? "bg-blue-500/15 text-blue-400"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            {readingsLoading ? (
              <div className="flex items-center justify-center h-[260px]">
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : (
              <WaterLevelChart
                readings={readings}
                warnThreshold={device.thresholds.warnCm}
                alertThreshold={device.thresholds.alertCm}
              />
            )}
          </div>
        </div>

        {/* ── Battery Chart ──────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-200">
              Battery Trend
            </h2>
          </div>
          <div className="card-body">
            <BatteryChart readings={readings} />
          </div>
        </div>

        {/* ── Recent Packets ─────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-200">
              Last {Math.min(readings.length, 20)} Packets
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-3/50 text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-left">Water</th>
                  <th className="px-4 py-2.5 text-left">Distance</th>
                  <th className="px-4 py-2.5 text-left">Battery</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">RSSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3/20 font-mono">
                {readings
                  .slice(-20)
                  .reverse()
                  .map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-surface-2/20 transition-colors"
                    >
                      <td className="px-4 py-2 text-gray-400">
                        {r.receivedAt
                          ? new Date(r.receivedAt.toMillis()).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-200">
                        {r.waterLevelCm.toFixed(1)} cm
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {r.distanceCm.toFixed(1)} cm
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {r.batteryV.toFixed(2)}V
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {r.rssi ?? "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Device Config (Admin) ──────────────────────────────── */}
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-gray-200">
                Device Configuration
              </h2>
            </div>
            <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <ConfigItem label="Mount Height" value={`${device.mountHeightCm} cm`} />
              <ConfigItem label="Warn Threshold" value={`${device.thresholds.warnCm} cm`} />
              <ConfigItem label="Alert Threshold" value={`${device.thresholds.alertCm} cm`} />
              <ConfigItem
                label="Location"
                value={device.lat && device.lng ? `${device.lat.toFixed(4)}, ${device.lng.toFixed(4)}` : "Not set"}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────
function QuickStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[11px] text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold font-mono tabular-nums text-gray-200">
        {value}
      </p>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-mono text-gray-300">{value}</p>
    </div>
  );
}
