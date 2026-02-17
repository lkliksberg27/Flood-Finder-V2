"use client";

import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { hapticLight, hapticWarning } from "@/lib/haptics";
import { AlertTriangle, Droplets, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";
import Link from "next/link";

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
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+8px)] pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[28px] font-bold tracking-tight">Alerts</h1>
          {alertDevices.length > 0 && (
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-400" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {alertDevices.length}
              </span>
            </div>
          )}
        </div>
        <p className="text-[13px] text-gray-500 mb-5">Real-time flood alerts</p>

        {/* Summary pills */}
        <div className="flex gap-2.5 mb-5">
          <div className="flex-1 bg-red-500/10 rounded-2xl p-3.5">
            <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider">Severe</p>
            <p className="text-[28px] font-bold text-red-400 leading-tight mt-0.5">{severe}</p>
          </div>
          <div className="flex-1 bg-amber-500/10 rounded-2xl p-3.5">
            <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider">Moderate</p>
            <p className="text-[28px] font-bold text-amber-400 leading-tight mt-0.5">{moderate}</p>
          </div>
          <div className="flex-1 bg-surface-2/60 rounded-2xl p-3.5">
            <p className="text-[10px] text-gray-400/70 font-semibold uppercase tracking-wider">Active</p>
            <p className="text-[28px] font-bold text-gray-200 leading-tight mt-0.5">{alertDevices.length}</p>
          </div>
        </div>

        {/* Alert cards */}
        {alertDevices.length === 0 ? (
          <div className="flex flex-col items-center py-16 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-lg font-semibold text-gray-200">All Clear</p>
            <p className="text-[13px] text-gray-500 mt-1">No active flood alerts in your area</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertDevices.map((device, i) => (
              <Link
                key={device.deviceId}
                href={`/device/${device.deviceId}`}
                onClick={() => hapticLight()}
                className={cn(
                  "block card border-l-[3px] p-4 active:scale-[0.98] transition-transform duration-100 animate-slideUp",
                  device.status === "ALERT" ? "border-l-red-500" : "border-l-amber-500"
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3 mb-2.5">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    device.status === "ALERT" ? "bg-red-500/15" : "bg-amber-500/15"
                  )}>
                    <AlertTriangle className={cn(
                      "w-[18px] h-[18px]",
                      device.status === "ALERT" ? "text-red-400" : "text-amber-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-100">{device.name}</p>
                    <p className={cn(
                      "text-[11px] font-bold mt-0.5",
                      device.status === "ALERT" ? "text-red-400" : "text-amber-400"
                    )}>
                      {device.status === "ALERT" ? "Severe Flooding" : "Moderate Flooding"}
                    </p>
                  </div>
                </div>

                <p className="text-[13px] text-gray-400 leading-relaxed mb-3">
                  {device.status === "ALERT"
                    ? `Severe flooding detected. Water depth: ${device.waterLevelCm.toFixed(0)} cm. Avoid this area.`
                    : `Moderate flooding detected. Water depth: ${device.waterLevelCm.toFixed(0)} cm. Use caution.`}
                </p>

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Droplets className="w-3 h-3" />
                    {device.waterLevelCm.toFixed(0)} cm
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Clock className="w-3 h-3" />
                    {device.lastSeen ? timeAgo(device.lastSeen) : "Just now"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Bell(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
