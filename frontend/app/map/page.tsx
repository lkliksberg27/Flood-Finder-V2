"use client";

import { useDevices, useFloodStats } from "@/hooks/use-firestore";
import { FloodMap } from "@/components/map/flood-map";
import AppShell from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/auth-context";
import { haptic } from "@/lib/haptics";
import { AlertTriangle, Droplets, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";
import Link from "next/link";

export default function MapPage() {
  const { devices, loading } = useDevices();
  const { isAdmin } = useAuth();
  const stats = useFloodStats(devices);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<FloodStatus | "ALL">("ALL");
  const [city, setCity] = useState("");

  const alerts = devices.filter((d) => d.status === "ALERT");
  const shown = filter === "ALL" ? devices : devices.filter((d) => d.status === filter);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (p) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.coords.latitude}&lon=${p.coords.longitude}&format=json`);
        const j = await r.json();
        const c = j.address?.city || j.address?.town || j.address?.village || "";
        const s = j.address?.state ? `, ${j.address.state}` : "";
        if (c) setCity(`${c}${s}`);
      } catch {}
    }, () => {}, { timeout: 5000 });
  }, []);

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="relative h-full" style={{ marginBottom: "-72px" }}>
        <FloodMap devices={devices} center={mapCenter(devices)} zoom={15} />

        {/* ── Floating header ─────────────────────── */}
        <div className="absolute top-2 left-3 right-3 z-[1000] anim-slide-up">
          <div className="bg-[#0f1629]/88 backdrop-blur-2xl rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-white tracking-tight">Flood Finder</h2>
                {city && <p className="text-[11px] text-slate-400">{city}</p>}
              </div>
              {stats.total > 0 && (
                <div className="flex gap-1.5">
                  {stats.ok > 0 && <Pill n={stats.ok} c="#34d399" />}
                  {stats.warn > 0 && <Pill n={stats.warn} c="#fbbf24" />}
                  {stats.alert > 0 && <Pill n={stats.alert} c="#f87171" />}
                </div>
              )}
            </div>
            {alerts.length > 0 && (
              <div className="bg-red-500/18 px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-bold text-red-300">{alerts.length} Severe Alert{alerts.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Legend ──────────────────────────────── */}
        <div className="absolute bottom-[90px] left-3 z-[1000] anim-fade">
          <div className="bg-[#0f1629]/80 backdrop-blur-xl rounded-xl px-3 py-2.5 border border-white/[0.04]">
            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Legend</p>
            {[
              { c: "#34d399", l: "None" },
              { c: "#fbbf24", l: "Mild" },
              { c: "#fb923c", l: "Moderate" },
              { c: "#f87171", l: "Severe" },
            ].map((i) => (
              <div key={i.l} className="flex items-center gap-2 py-[2px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: i.c }} />
                <span className="text-[10px] text-slate-400">{i.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom sheet ────────────────────────── */}
        <div className={cn(
          "absolute bottom-[72px] inset-x-0 z-[1000] transition-all duration-300 ease-[cubic-bezier(.32,.72,0,1)]",
          sheetOpen ? "max-h-[55vh]" : "max-h-[44px]"
        )}>
          <div className="bg-[#0f1629]/92 backdrop-blur-2xl rounded-t-2xl border-t border-white/[0.06] overflow-hidden h-full flex flex-col">
            <button onClick={() => { setSheetOpen(!sheetOpen); haptic.light(); }} className="flex flex-col items-center py-2 shrink-0">
              <div className="w-9 h-[3px] rounded-full bg-slate-600" />
              <span className="text-[10px] text-slate-500 font-medium mt-1">{sheetOpen ? "Close" : `${stats.total} sensors`}</span>
            </button>

            {sheetOpen && (
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="flex gap-1.5 px-4 pb-3">
                  {(["ALL", "ALERT", "WARN", "OK"] as const).map((f) => (
                    <button key={f} onClick={() => { setFilter(f); haptic.light(); }}
                      className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide tap-sm",
                        filter === f ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.04] text-slate-500"
                      )}>
                      {f}
                    </button>
                  ))}
                </div>
                <div>
                  {shown.map((d, i) => (
                    <Link key={d.deviceId} href={`/device/${d.deviceId}`} onClick={() => haptic.light()}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03] transition-colors border-b border-white/[0.02]"
                      style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: STATUS_CONFIG[d.status].color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-100 truncate">{d.name}</p>
                        <p className="text-[11px] text-slate-500">{d.waterLevelCm.toFixed(1)} cm • {timeAgo(d.lastSeen)}</p>
                      </div>
                      <StatusBadge status={d.status} />
                    </Link>
                  ))}
                  {shown.length === 0 && (
                    <div className="py-12 text-center">
                      <Droplets className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-500">No sensors</p>
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

function Pill({ n, c }: { n: number; c: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums" style={{ background: `${c}18`, color: c }}>{n}</span>;
}

function mapCenter(d: Device[]): [number, number] {
  const l = d.filter((x) => x.lat && x.lng);
  if (!l.length) return [-80.137, 25.957];
  return [l.reduce((s, x) => s + x.lng, 0) / l.length, l.reduce((s, x) => s + x.lat, 0) / l.length];
}
