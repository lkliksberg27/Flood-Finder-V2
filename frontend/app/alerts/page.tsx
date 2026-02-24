"use client";

import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { haptic } from "@/lib/haptics";
import { AlertTriangle, Bell, Droplets, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Device } from "@/types";
import Link from "next/link";

export default function AlertsPage() {
  const { devices, loading } = useDevices();
  const active = devices.filter((d) => d.status !== "OK").sort((a, b) => (a.status === "ALERT" ? -1 : 1) - (b.status === "ALERT" ? -1 : 1));
  const severe = devices.filter((d) => d.status === "ALERT").length;
  const moderate = devices.filter((d) => d.status === "WARN").length;

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="px-4 pt-3 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[26px] font-extrabold tracking-tight text-white">Alerts</h1>
          {active.length > 0 && (
            <div className="relative">
              <Bell className="w-6 h-6 text-slate-400" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">{active.length}</span>
            </div>
          )}
        </div>
        <p className="text-[13px] text-slate-400 mb-5">Real-time flood alerts</p>

        <div className="flex gap-2.5 mb-5">
          <Card label="Severe" val={severe} color="#f87171" bg="bg-red-500/10" />
          <Card label="Moderate" val={moderate} color="#fbbf24" bg="bg-amber-500/10" />
          <Card label="Active" val={active.length} color="#94a3b8" bg="bg-white/[0.04]" />
        </div>

        {!active.length ? (
          <div className="flex flex-col items-center py-20 anim-fade">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>
            <p className="text-lg font-bold text-slate-100">All Clear</p>
            <p className="text-[13px] text-slate-400 mt-1">No active flood alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((d, i) => (
              <Link key={d.deviceId} href={`/device/${d.deviceId}`} onClick={() => haptic.light()}
                className={cn("block fcard border-l-[3px] p-4 active:scale-[0.98] transition-transform anim-slide-up",
                  d.status === "ALERT" ? "border-l-red-500" : "border-l-amber-500")} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start gap-3 mb-2">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", d.status === "ALERT" ? "bg-red-500/12" : "bg-amber-500/12")}>
                    <AlertTriangle className={cn("w-[18px] h-[18px]", d.status === "ALERT" ? "text-red-400" : "text-amber-400")} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-slate-100">{d.name}</p>
                    <p className={cn("text-[11px] font-bold mt-0.5", d.status === "ALERT" ? "text-red-400" : "text-amber-400")}>{d.status === "ALERT" ? "Severe Flooding" : "Moderate Flooding"}</p>
                  </div>
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed mb-3">Water depth: {d.waterLevelCm.toFixed(0)} cm. {d.status === "ALERT" ? "Avoid this area." : "Use caution."}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5"><Droplets className="w-3 h-3" />{d.waterLevelCm.toFixed(0)} cm</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{d.lastSeen ? timeAgo(d.lastSeen) : "Just now"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Card({ label, val, color, bg }: { label: string; val: number; color: string; bg: string }) {
  return <div className={cn("flex-1 rounded-2xl p-3.5", bg)}>
    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${color}99` }}>{label}</p>
    <p className="text-[28px] font-extrabold leading-tight mt-0.5" style={{ color }}>{val}</p>
  </div>;
}
