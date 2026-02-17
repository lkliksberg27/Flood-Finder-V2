"use client";

import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertTriangle, Droplets, Clock, Loader2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";

export default function AlertsPage() {
  const { devices, loading } = useDevices();

  const alertDevices = devices
    .filter((d) => d.status === "WARN" || d.status === "ALERT")
    .sort((a, b) => {
      const order: Record<FloodStatus, number> = { ALERT: 0, WARN: 1, OK: 2 };
      return order[a.status] - order[b.status];
    });

  const severe = devices.filter((d) => d.status === "ALERT").length;
  const moderate = devices.filter((d) => d.status === "WARN").length;
  const total = alertDevices.length;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  function getSeverityLabel(status: FloodStatus): string {
    if (status === "ALERT") return "Severe Flooding";
    if (status === "WARN") return "Moderate Flooding";
    return "Normal";
  }

  function getAlertMessage(device: Device): string {
    if (device.status === "ALERT") {
      return `SEVERE FLOODING at ${device.name}. Water depth: ${device.waterLevelCm.toFixed(0)} cm. Do not enter the area!`;
    }
    if (device.status === "WARN") {
      return `Moderate flooding at ${device.name}. Water depth: ${device.waterLevelCm.toFixed(0)} cm. Avoid the area if possible.`;
    }
    return `Conditions normal at ${device.name}.`;
  }

  function getBorderColor(status: FloodStatus): string {
    if (status === "ALERT") return "border-l-red-500";
    if (status === "WARN") return "border-l-amber-500";
    return "border-l-green-500";
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Alerts</h1>
          <div className="relative">
            <AlertTriangle className="w-6 h-6 text-gray-400" />
            {total > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {total}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">Real-time flood alerts for your area</p>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-red-500/15 rounded-xl p-3">
            <p className="text-[11px] text-red-400 font-medium">Severe</p>
            <p className="text-2xl font-bold text-red-400">{severe}</p>
          </div>
          <div className="bg-amber-500/15 rounded-xl p-3">
            <p className="text-[11px] text-amber-400 font-medium">Moderate</p>
            <p className="text-2xl font-bold text-amber-400">{moderate}</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-[11px] text-gray-400 font-medium">Total Active</p>
            <p className="text-2xl font-bold text-gray-200">{total}</p>
          </div>
        </div>

        {/* Alert list */}
        {alertDevices.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-gray-300 font-medium">All Clear</p>
            <p className="text-sm text-gray-500 mt-1">No active flood alerts in your area</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertDevices.map((device) => (
              <div
                key={device.deviceId}
                className={cn(
                  "card border-l-4 p-4",
                  getBorderColor(device.status)
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      device.status === "ALERT" ? "bg-red-500/15" : "bg-amber-500/15"
                    )}>
                      <AlertTriangle className={cn(
                        "w-4.5 h-4.5",
                        device.status === "ALERT" ? "text-red-400" : "text-amber-400"
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-100">{device.name}</p>
                      <p className={cn(
                        "text-xs font-semibold",
                        device.status === "ALERT" ? "text-red-400" : "text-amber-400"
                      )}>
                        {getSeverityLabel(device.status)}
                      </p>
                    </div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0 mt-1" />
                </div>
                <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                  {getAlertMessage(device)}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" />
                    {device.waterLevelCm.toFixed(0)} cm depth
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {device.lastSeen ? timeAgo(device.lastSeen) : "Just now"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
