"use client";

import { useDevices, useFloodStats } from "@/hooks/use-firestore";
import { FloodMap } from "@/components/map/flood-map";
import AppShell from "@/components/layout/app-shell";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Device, STATUS_CONFIG } from "@/types";

export default function MapPage() {
  const { devices, loading } = useDevices();
  const stats = useFloodStats(devices);
  const [city, setCity] = useState("");
  const alerts = devices.filter((d) => d.status === "ALERT");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (p) => {
      try {
        const MB = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!MB) return;
        const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${p.coords.longitude},${p.coords.latitude}.json?access_token=${MB}&types=place`);
        const d = await r.json();
        if (d.features?.[0]) setCity(d.features[0].place_name.split(",").slice(0, 2).join(","));
      } catch {}
    }, () => {}, { timeout: 5000 });
  }, []);

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="relative h-full" style={{ marginBottom: "-56px" }}>
        <FloodMap devices={devices} center={mapCenter(devices)} zoom={15} />

        {/* Header */}
        <div className="absolute top-2 left-2 right-14 z-10 anim-slide-up">
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

        {/* Legend */}
        <div className="absolute bottom-[66px] left-2 z-10 anim-fade">
          <div className="bg-[#0f1629]/80 backdrop-blur-xl rounded-xl px-3 py-2.5 border border-white/[0.04]">
            {[{ c: "#34d399", l: "Normal" }, { c: "#fbbf24", l: "Warning" }, { c: "#f87171", l: "Severe" }].map((i) => (
              <div key={i.l} className="flex items-center gap-2 py-[2px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: i.c }} />
                <span className="text-[10px] text-slate-400">{i.l}</span>
              </div>
            ))}
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
