"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { FloodMap } from "@/components/map/flood-map";
import { haptic } from "@/lib/haptics";
import {
  AlertTriangle, Plus, Trash2, Route, Shield, Loader2,
  ChevronUp, ChevronDown, Star, MapPin, ArrowRight, X, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Device, STATUS_CONFIG } from "@/types";

interface SavedRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  waypoints: [number, number][];
  favorite: boolean;
}

const DEFAULTS: SavedRoute[] = [
  {
    id: "r1", name: "Home → School", from: "Home", to: "School", favorite: true,
    waypoints: [[25.957,-80.139],[25.9575,-80.1375],[25.958,-80.136],[25.9595,-80.1345],[25.961,-80.1335],[25.9625,-80.133],[25.964,-80.1328]],
  },
  {
    id: "r2", name: "Home → Mall", from: "Home", to: "Aventura Mall", favorite: true,
    waypoints: [[25.957,-80.139],[25.956,-80.14],[25.955,-80.141],[25.954,-80.1425],[25.953,-80.144],[25.952,-80.1455],[25.951,-80.147]],
  },
  {
    id: "r3", name: "Morning Run", from: "Park", to: "Park (loop)", favorite: false,
    waypoints: [[25.959,-80.132],[25.9605,-80.1305],[25.962,-80.131],[25.9635,-80.132],[25.9638,-80.1342],[25.962,-80.135],[25.96,-80.1335],[25.959,-80.132]],
  },
];

function loadRoutes(): SavedRoute[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("ff_routes");
    return raw ? JSON.parse(raw) : DEFAULTS;
  } catch { return DEFAULTS; }
}

function saveRoutes(routes: SavedRoute[]) {
  try { localStorage.setItem("ff_routes", JSON.stringify(routes)); } catch {}
}

function floodCheck(route: SavedRoute, devices: Device[]) {
  const near: Device[] = [];
  for (const d of devices) {
    if (d.status === "OK") continue;
    for (const [lat, lng] of route.waypoints) {
      if (Math.hypot(d.lat - lat, d.lng - lng) < 0.003) {
        if (!near.find((x) => x.deviceId === d.deviceId)) near.push(d);
        break;
      }
    }
  }
  const hasSevere = near.some((d) => d.status === "ALERT");
  return { safe: near.length === 0, near, severity: hasSevere ? "Severe" : near.length ? "Moderate" : "Clear" };
}

export default function RoutesPage() {
  const { devices, loading } = useDevices();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sheet, setSheet] = useState(true);

  useEffect(() => { setRoutes(loadRoutes()); }, []);

  const persist = useCallback((r: SavedRoute[]) => { setRoutes(r); saveRoutes(r); }, []);

  const active = routes.find((r) => r.id === selected);
  const check = active ? floodCheck(active, devices) : null;
  const unsafeN = routes.filter((r) => !floodCheck(r, devices).safe).length;

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  function add() {
    if (!name.trim()) return;
    const r: SavedRoute = {
      id: `r-${Date.now()}`, name, from: from || "A", to: to || "B", favorite: false,
      waypoints: [
        [25.957 + Math.random() * 0.007, -80.139 + Math.random() * 0.007],
        [25.959 + Math.random() * 0.004, -80.136 + Math.random() * 0.004],
        [25.961 + Math.random() * 0.004, -80.134 + Math.random() * 0.004],
        [25.963 + Math.random() * 0.003, -80.133 + Math.random() * 0.003],
      ],
    };
    persist([...routes, r]);
    setSelected(r.id);
    setName(""); setFrom(""); setTo(""); setAdding(false);
    haptic.success();
  }

  const sorted = [...routes].sort((a, b) => +b.favorite - +a.favorite || a.name.localeCompare(b.name));

  return (
    <AppShell>
      <div className="relative h-full" style={{ marginBottom: "-72px" }}>
        <FloodMap devices={devices} zoom={15} route={active?.waypoints} routeSafe={check?.safe ?? true} />

        {/* Top banner */}
        {active && check && !check.safe && (
          <div className="absolute top-2 left-3 right-3 z-[1000] anim-slide-up">
            <div className={cn("rounded-2xl p-3.5 backdrop-blur-xl shadow-xl border",
              check.severity === "Severe" ? "bg-red-600/85 border-red-500/40" : "bg-amber-500/85 border-amber-400/40"
            )}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-white">⚠️ {check.severity} flooding on route</p>
                  <p className="text-[11px] text-white/75 mt-0.5">{check.near.length} sensor{check.near.length > 1 ? "s" : ""} near route — consider alternate path</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {active && check?.safe && (
          <div className="absolute top-2 left-3 right-3 z-[1000] anim-slide-up">
            <div className="bg-emerald-600/85 backdrop-blur-xl rounded-2xl p-3.5 shadow-xl border border-emerald-500/40">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-white shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-white">✓ Route is clear</p>
                  <p className="text-[11px] text-white/75 mt-0.5">No flooding on "{active.name}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom sheet */}
        <div className={cn(
          "absolute bottom-[72px] inset-x-0 z-[1000] transition-all duration-300 ease-[cubic-bezier(.32,.72,0,1)]",
          sheet ? "max-h-[58vh]" : "max-h-[44px]"
        )}>
          <div className="bg-[#0f1629]/92 backdrop-blur-2xl rounded-t-2xl border-t border-white/[0.06] overflow-hidden h-full flex flex-col">
            <button onClick={() => { setSheet(!sheet); haptic.light(); }} className="flex items-center justify-between px-5 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-bold text-slate-200">My Routes</span>
                {unsafeN > 0 && <span className="bg-red-500/15 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full">{unsafeN} affected</span>}
              </div>
              {sheet ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronUp className="w-4 h-4 text-slate-600" />}
            </button>

            {sheet && (
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
                <div className="space-y-2 mb-3">
                  {sorted.map((r) => {
                    const st = floodCheck(r, devices);
                    const sel = selected === r.id;
                    return (
                      <div key={r.id}
                        onClick={() => { setSelected(sel ? null : r.id); haptic.light(); }}
                        className={cn("fcard p-3.5 tap border", sel
                          ? st.safe ? "border-blue-500/25 bg-blue-500/5" : "border-red-500/25 bg-red-500/5"
                          : "border-transparent"
                        )}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            st.safe ? "bg-emerald-500/12" : st.severity === "Severe" ? "bg-red-500/12" : "bg-amber-500/12"
                          )}>
                            <Route className={cn("w-5 h-5",
                              st.safe ? "text-emerald-400" : st.severity === "Severe" ? "text-red-400" : "text-amber-400"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold text-slate-100 truncate">{r.name}</span>
                              {r.favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />{r.from} <ArrowRight className="w-2 h-2" /> {r.to}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {st.safe
                              ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400">Clear ✓</span>
                              : <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                                  st.severity === "Severe" ? "bg-red-500/12 text-red-400" : "bg-amber-500/12 text-amber-400"
                                )}>{st.near.length} alert{st.near.length > 1 ? "s" : ""}</span>
                            }
                            <button onClick={(e) => { e.stopPropagation(); haptic.light();
                              persist(routes.map((x) => x.id === r.id ? { ...x, favorite: !x.favorite } : x));
                            }} className="p-1.5 tap-sm">
                              <Star className={cn("w-3.5 h-3.5 text-slate-600", r.favorite && "text-amber-400 fill-amber-400")} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); haptic.medium();
                              persist(routes.filter((x) => x.id !== r.id));
                              if (selected === r.id) setSelected(null);
                            }} className="p-1.5 tap-sm text-slate-600 active:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {sel && !st.safe && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Flooding near route</p>
                            {st.near.map((d) => (
                              <div key={d.deviceId} className="flex items-center gap-2 bg-white/[0.02] rounded-lg px-2.5 py-2 text-[11px]">
                                <div className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[d.status].mapColor }} />
                                <span className="text-slate-300 flex-1">{d.name}</span>
                                <span className={cn("font-mono font-bold", d.status === "ALERT" ? "text-red-400" : "text-amber-400")}>{d.waterLevelCm.toFixed(0)} cm</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {adding ? (
                  <div className="fcard p-4 anim-slide-up">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-bold text-slate-200">New Route</span>
                      <button onClick={() => setAdding(false)} className="tap-sm"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="space-y-2">
                      <input placeholder="Route name" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40 border border-white/[0.04]" />
                      <div className="flex gap-2">
                        <input placeholder="From" value={from} onChange={(e) => setFrom(e.target.value)}
                          className="flex-1 bg-white/[0.04] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40 border border-white/[0.04]" />
                        <input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)}
                          className="flex-1 bg-white/[0.04] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40 border border-white/[0.04]" />
                      </div>
                      <button onClick={add} disabled={!name.trim()}
                        className="w-full bg-blue-500 text-white rounded-xl py-3 text-[13px] font-bold tap disabled:opacity-30 flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Save Route
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAdding(true); haptic.light(); }}
                    className="w-full rounded-xl border-2 border-dashed border-slate-700/50 py-3 flex items-center justify-center gap-2 text-blue-400 tap active:border-blue-500/30">
                    <Plus className="w-4 h-4" /><span className="text-[13px] font-semibold">Add Route</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
