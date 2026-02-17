"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { FloodMap } from "@/components/map/flood-map";
import { haptic } from "@/lib/haptics";
import {
  AlertTriangle, Plus, Trash2, Route, Shield, Loader2,
  ChevronDown, MapPin, X, Clock, CheckCircle2, AlertCircle,
  Navigation, ChevronRight, Pencil, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Device, STATUS_CONFIG } from "@/types";

/* ── Types ────────────────────────────────────────── */
interface RouteOption {
  id: string;
  label: string;
  waypoints: [number, number][];
  miles: number;
  mins: number;
}

interface Course {
  id: string;
  name: string;
  fromAddr: string;
  toAddr: string;
  fromCoord: [number, number] | null;
  toCoord: [number, number] | null;
  routes: RouteOption[];
  schedule: "always" | "custom";
  days: string[];
  startTime: string;
  endTime: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Geocode address → coords ─────────────────────── */
async function geocode(addr: string): Promise<[number, number] | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=us`);
    const d = await r.json();
    return d.length ? [parseFloat(d[0].lat), parseFloat(d[0].lon)] : null;
  } catch { return null; }
}

/* ── Fetch real driving routes via OSRM ───────────── */
async function fetchRoutes(from: [number, number], to: [number, number]): Promise<RouteOption[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=true`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.code !== "Ok" || !d.routes?.length) return fallback(from, to);
    const labels = ["Fastest route", "Via main roads", "Alternate route"];
    return d.routes.slice(0, 3).map((rt: any, i: number) => ({
      id: `r${i}`,
      label: labels[i] || `Option ${i + 1}`,
      waypoints: rt.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
      miles: +(rt.distance / 1609.34).toFixed(1),
      mins: Math.round(rt.duration / 60),
    }));
  } catch { return fallback(from, to); }
}

function fallback(a: [number, number], b: [number, number]): RouteOption[] {
  const mid: [number, number] = [(a[0]+b[0])/2, (a[1]+b[1])/2];
  const m = +(Math.hypot(b[0]-a[0], b[1]-a[1]) * 69).toFixed(1);
  return [{ id: "r0", label: "Direct", miles: m, mins: Math.max(3, Math.round(m*3)), waypoints: [a, mid, b] }];
}

/* ── Flood check ──────────────────────────────────── */
function checkFlood(route: RouteOption, devices: Device[]) {
  const near: Device[] = [];
  for (const d of devices) {
    if (d.status === "OK") continue;
    for (const [lat, lng] of route.waypoints) {
      if (Math.hypot(d.lat - lat, d.lng - lng) < 0.004) {
        if (!near.find((x) => x.deviceId === d.deviceId)) near.push(d);
        break;
      }
    }
  }
  return { safe: !near.length, near, risk: near.some((d) => d.status === "ALERT") ? "high" : near.length ? "moderate" : "none" } as const;
}

function isActiveNow(c: Course): boolean {
  if (c.schedule === "always") return true;
  const now = new Date();
  const today = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][now.getDay()];
  if (!c.days.includes(today)) return false;
  const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  return t >= c.startTime && t <= c.endTime;
}

/* ── Persistence ──────────────────────────────────── */
function load(): Course[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem("ff_v3"); return r ? JSON.parse(r) : []; } catch { return []; }
}
function save(c: Course[]) { try { localStorage.setItem("ff_v3", JSON.stringify(c)); } catch {} }

/* ════════════════════════════════════════════════════
   PAGE COMPONENT
   ════════════════════════════════════════════════════ */
export default function RoutesPage() {
  const { devices, loading } = useDevices();
  const [courses, setCourses] = useState<Course[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [schedId, setSchedId] = useState<string | null>(null);
  const [editNameId, setEditNameId] = useState<string | null>(null);
  const [tmpName, setTmpName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [fName, setFName] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { setCourses(load()); }, []);
  const persist = useCallback((c: Course[]) => { setCourses(c); save(c); }, []);

  const openCourse = courses.find((c) => c.id === openId);
  const activeRoute = openCourse?.routes.find((r) => r.id === routeId);
  const routeCheck = activeRoute ? checkFlood(activeRoute, devices) : null;

  // Auto-select safest route when course opens
  useEffect(() => {
    if (openCourse && openCourse.routes.length) {
      const safe = openCourse.routes.find((r) => checkFlood(r, devices).safe);
      setRouteId(safe?.id || openCourse.routes[0]?.id || null);
    }
  }, [openId]);

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  async function addCourse() {
    if (!fName.trim() || !fFrom.trim() || !fTo.trim()) return;
    setErr(""); setGenerating(true); haptic.light();
    const [fc, tc] = await Promise.all([geocode(fFrom), geocode(fTo)]);
    if (!fc) { setErr(`Can't find "${fFrom}"`); setGenerating(false); return; }
    if (!tc) { setErr(`Can't find "${fTo}"`); setGenerating(false); return; }
    const routes = await fetchRoutes(fc, tc);
    const c: Course = {
      id: `c${Date.now()}`, name: fName, fromAddr: fFrom, toAddr: fTo,
      fromCoord: fc, toCoord: tc, routes,
      schedule: "always", days: [], startTime: "07:00", endTime: "09:00",
    };
    persist([...courses, c]);
    setOpenId(c.id); setRouteId(null);
    setFName(""); setFFrom(""); setFTo(""); setShowAdd(false); setGenerating(false);
    haptic.success();
  }

  return (
    <AppShell>
      {/* Split layout: map top, panel bottom (mobile) / map left, panel right (desktop) */}
      <div className="flex flex-col md:flex-row h-full" style={{ marginBottom: "-72px" }}>

        {/* ── Map ──────────────────────────────────── */}
        <div className="relative h-[40vh] md:h-full md:flex-1 shrink-0">
          <FloodMap
            devices={devices}
            zoom={14}
            route={activeRoute?.waypoints || null}
            routeSafe={routeCheck?.safe ?? true}
          />

          {/* Route status banner */}
          {activeRoute && routeCheck && !routeCheck.safe && (
            <div className="absolute top-2 left-2 right-2 z-[1000] anim-slide-up">
              <div className={cn("rounded-2xl p-3 backdrop-blur-xl shadow-lg border",
                routeCheck.risk === "high" ? "bg-red-600/90 border-red-500/30" : "bg-amber-500/90 border-amber-400/30"
              )}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold text-white">{routeCheck.risk === "high" ? "Avoid this route" : "Flooding risk"}</p>
                    <p className="text-[10px] text-white/70">{routeCheck.near.length} sensor{routeCheck.near.length > 1 ? "s" : ""} — try another route</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeRoute && routeCheck?.safe && (
            <div className="absolute top-2 left-2 right-2 z-[1000] anim-slide-up">
              <div className="bg-emerald-600/90 backdrop-blur-xl rounded-2xl p-3 shadow-lg border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white shrink-0" />
                  <p className="text-[12px] font-bold text-white">✓ Route clear — {activeRoute.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Panel ────────────────────────────────── */}
        <div className="flex-1 md:w-[420px] md:max-w-[420px] md:flex-none md:border-l md:border-white/[0.04] overflow-y-auto overscroll-contain bg-[#0c1021]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-[#0c1021]/95 backdrop-blur-lg z-10 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span className="text-[14px] font-bold text-slate-200">My Courses</span>
            </div>
            <button onClick={() => { setShowAdd(true); setErr(""); haptic.light(); }}
              className="flex items-center gap-1.5 bg-blue-500 text-white text-[12px] font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-transform">
              <Plus className="w-3.5 h-3.5" /> Set Course
            </button>
          </div>

          <div className="px-4 py-3 pb-24 md:pb-6">
            {/* ── Add form ─────────────────────── */}
            {showAdd && (
              <div className="fcard p-4 mb-4 anim-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-bold text-slate-100">Set New Course</span>
                  <button onClick={() => { setShowAdd(false); haptic.light(); }} className="p-1 active:scale-90 transition-transform">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <input placeholder="Course name (e.g. Morning Commute)" value={fName} onChange={(e) => setFName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40" />

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 px-1">Start Address</label>
                    <input placeholder="e.g. 3000 NE 191st St, Aventura, FL" value={fFrom} onChange={(e) => setFFrom(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 px-1">End Address</label>
                    <input placeholder="e.g. 19501 Biscayne Blvd, Aventura, FL" value={fTo} onChange={(e) => setFTo(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>

                  {err && <p className="text-[11px] text-red-400 px-1">{err}</p>}

                  <button onClick={addCourse} disabled={!fName.trim() || !fFrom.trim() || !fTo.trim() || generating}
                    className="w-full bg-blue-500 text-white rounded-xl py-3 text-[13px] font-bold active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2">
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding routes...</> : <><Route className="w-4 h-4" /> Generate Routes</>}
                  </button>
                </div>
              </div>
            )}

            {/* ── Empty state ──────────────────── */}
            {courses.length === 0 && !showAdd && (
              <div className="flex flex-col items-center py-16 anim-fade">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Navigation className="w-7 h-7 text-blue-400" />
                </div>
                <p className="text-[15px] font-bold text-slate-200">No courses yet</p>
                <p className="text-[12px] text-slate-500 mt-1 text-center">Tap "Set Course" to add a route.<br/>We'll monitor it for flooding.</p>
              </div>
            )}

            {/* ── Courses ──────────────────────── */}
            {courses.map((course) => {
              const isOpen = openId === course.id;
              const active = isActiveNow(course);
              const checks = course.routes.map((r) => ({ ...r, fl: checkFlood(r, devices) }));
              const hasSafe = checks.some((c) => c.fl.safe);

              return (
                <div key={course.id} className="mb-3">
                  {/* Header */}
                  <button
                    onClick={() => { setOpenId(isOpen ? null : course.id); setRouteId(null); setSchedId(null); setEditNameId(null); haptic.light(); }}
                    className={cn("w-full fcard p-4 text-left active:scale-[0.98] transition-transform border",
                      isOpen ? "border-blue-500/15" : "border-transparent"
                    )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        hasSafe ? "bg-emerald-500/12" : "bg-red-500/12"
                      )}>
                        <Route className={cn("w-5 h-5", hasSafe ? "text-emerald-400" : "text-red-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editNameId === course.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input value={tmpName} onChange={(e) => setTmpName(e.target.value)} autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") { persist(courses.map((c) => c.id === course.id ? { ...c, name: tmpName } : c)); setEditNameId(null); haptic.light(); } }}
                              className="text-[13px] font-bold text-slate-100 bg-white/[0.06] rounded-lg px-2 py-1 outline-none w-full" />
                            <button onClick={(e) => { e.stopPropagation(); persist(courses.map((c) => c.id === course.id ? { ...c, name: tmpName } : c)); setEditNameId(null); haptic.light(); }}>
                              <Check className="w-4 h-4 text-emerald-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-bold text-slate-100 truncate">{course.name}</p>
                            {isOpen && (
                              <button onClick={(e) => { e.stopPropagation(); setEditNameId(course.id); setTmpName(course.name); haptic.light(); }}>
                                <Pencil className="w-3 h-3 text-slate-500" />
                              </button>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{course.fromAddr} → {course.toAddr}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                          active ? "bg-blue-500/15 text-blue-400" : "bg-white/[0.04] text-slate-600"
                        )}>{active ? "Active" : course.schedule === "always" ? "Always" : course.startTime}</span>
                        {hasSafe
                          ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400">Clear ✓</span>
                          : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/12 text-red-400">Flooded</span>
                        }
                        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-600 transition-transform", isOpen && "rotate-180")} />
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded ────────────────── */}
                  {isOpen && (
                    <div className="mt-1.5 space-y-2 anim-slide-up">
                      {/* Route options */}
                      <div className="fcard p-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Route Options</p>
                        <div className="space-y-1.5">
                          {checks.map((r) => {
                            const sel = routeId === r.id;
                            return (
                              <button key={r.id} onClick={() => { setRouteId(r.id); haptic.light(); }}
                                className={cn("w-full flex items-center gap-3 p-3 rounded-xl text-left active:scale-[0.98] transition-transform border",
                                  sel ? "bg-blue-500/[0.06] border-blue-500/15" : "bg-white/[0.01] border-transparent"
                                )}>
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  r.fl.safe ? "bg-emerald-500/12" : r.fl.risk === "high" ? "bg-red-500/12" : "bg-amber-500/12"
                                )}>
                                  {r.fl.safe ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-slate-200">{r.label}</p>
                                  <p className="text-[10px] text-slate-500">{r.miles} mi · {r.mins} min</p>
                                </div>
                                {r.fl.safe
                                  ? <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Recommended</span>
                                  : <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                                      r.fl.risk === "high" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                                    )}>{r.fl.near.length} alert{r.fl.near.length > 1 ? "s" : ""}</span>
                                }
                              </button>
                            );
                          })}
                        </div>

                        {routeId && routeCheck && !routeCheck.safe && (
                          <div className="mt-2 p-2.5 bg-red-500/[0.05] rounded-xl space-y-1.5">
                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Flooding detected</p>
                            {routeCheck.near.map((d) => (
                              <div key={d.deviceId} className="flex items-center gap-2 text-[11px]">
                                <div className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[d.status].mapColor }} />
                                <span className="text-slate-300 flex-1">{d.name}</span>
                                <span className={cn("font-mono font-bold", d.status === "ALERT" ? "text-red-400" : "text-amber-400")}>{d.waterLevelCm.toFixed(0)} cm</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Schedule */}
                      <div className="fcard overflow-hidden">
                        <button onClick={() => { setSchedId(schedId === course.id ? null : course.id); haptic.light(); }}
                          className="w-full flex items-center justify-between p-3 active:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-[12px] font-semibold text-slate-200">Schedule</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                              {course.schedule === "always" ? "Always" : `${course.days.join(", ")} ${course.startTime}–${course.endTime}`}
                            </span>
                          </div>
                          <ChevronRight className={cn("w-3.5 h-3.5 text-slate-600 transition-transform", schedId === course.id && "rotate-90")} />
                        </button>

                        {schedId === course.id && (
                          <div className="px-3 pb-3 space-y-3 anim-slide-up">
                            <div className="flex gap-2">
                              {(["always", "custom"] as const).map((t) => (
                                <button key={t} onClick={() => { persist(courses.map((c) => c.id === course.id ? { ...c, schedule: t } : c)); haptic.light(); }}
                                  className={cn("flex-1 py-2.5 rounded-xl text-[12px] font-bold active:scale-95 transition-transform",
                                    course.schedule === t ? "bg-blue-500 text-white" : "bg-white/[0.04] text-slate-500"
                                  )}>{t === "always" ? "Always On" : "Set Times"}</button>
                              ))}
                            </div>

                            {course.schedule === "custom" && (
                              <>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Active Days</p>
                                  <div className="flex gap-1">
                                    {DAYS.map((d) => (
                                      <button key={d} onClick={() => { persist(courses.map((c) => c.id === course.id ? { ...c, days: c.days.includes(d) ? c.days.filter((x) => x !== d) : [...c.days, d] } : c)); haptic.light(); }}
                                        className={cn("flex-1 py-2 rounded-lg text-[10px] font-bold active:scale-90 transition-transform",
                                          course.days.includes(d) ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.03] text-slate-600"
                                        )}>{d.slice(0, 2)}</button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {(["startTime", "endTime"] as const).map((f) => (
                                    <div key={f} className="flex-1">
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{f === "startTime" ? "From" : "To"}</p>
                                      <input type="time" value={course[f]}
                                        onChange={(e) => { persist(courses.map((c) => c.id === course.id ? { ...c, [f]: e.target.value } : c)); haptic.light(); }}
                                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 outline-none" />
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <button onClick={() => { persist(courses.filter((c) => c.id !== course.id)); if (openId === course.id) { setOpenId(null); setRouteId(null); } haptic.medium(); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] text-red-400/60 active:text-red-400 active:scale-95 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> Remove Course
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
