"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { FloodMap } from "@/components/map/flood-map";
import { haptic } from "@/lib/haptics";
import {
  AlertTriangle, Plus, Trash2, Route, Shield, Loader2,
  ChevronDown, MapPin, X, Clock, CheckCircle2, AlertCircle,
  Navigation, ChevronRight, Pencil, Check, ArrowRight, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Device, STATUS_CONFIG } from "@/types";

const MB = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/* ── Types ───────────────────────────────────────── */
interface RouteOption { id: string; label: string; waypoints: [number, number][]; miles: number; mins: number; }
interface Course {
  id: string; name: string; fromAddr: string; toAddr: string;
  fromCoord: [number, number]; toCoord: [number, number];
  routesAB: RouteOption[]; routesBA: RouteOption[];
  schedule: "always" | "custom"; days: string[]; startTime: string; endTime: string;
}
type Dir = "AB" | "BA";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Mapbox Geocoding (autocomplete) ─────────────── */
interface Suggestion { text: string; place: string; coord: [number, number]; }

async function searchPlaces(q: string): Promise<Suggestion[]> {
  if (q.length < 3 || !MB) return [];
  try {
    const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MB}&country=us&limit=5&types=address,poi,place,locality`);
    const d = await r.json();
    return (d.features || []).map((f: any) => ({
      text: f.text,
      place: f.place_name,
      coord: [f.center[1], f.center[0]] as [number, number], // [lat, lng]
    }));
  } catch { return []; }
}

/* ── AutoInput component ─────────────────────────── */
function AutoInput({ placeholder, value, onChange, onSelect }: {
  placeholder: string; value: string;
  onChange: (v: string) => void; onSelect: (s: Suggestion) => void;
}) {
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);
  const wrap = useRef<HTMLDivElement>(null);

  function handleType(v: string) {
    onChange(v);
    clearTimeout(timer.current);
    if (v.length < 3) { setResults([]); setOpen(false); return; }
    setBusy(true);
    timer.current = setTimeout(async () => {
      const res = await searchPlaces(v);
      setResults(res); setOpen(res.length > 0); setBusy(false);
    }, 300);
  }

  function pick(s: Suggestion) {
    onSelect(s);
    onChange(s.place);
    setOpen(false);
    haptic.light();
  }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={wrap} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input placeholder={placeholder} value={value}
          onChange={(e) => handleType(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-8 py-3 text-[13px] text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/30 transition-shadow" />
        {busy && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 animate-spin" />}
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a2038] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50 max-h-[200px] overflow-y-auto">
          {results.map((s, i) => (
            <button key={i} onClick={() => pick(s)}
              className="w-full text-left px-3.5 py-2.5 active:bg-white/[0.06] transition-colors border-b border-white/[0.03] last:border-0 flex items-start gap-2.5">
              <MapPin className="w-3 h-3 text-blue-400 mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-200 truncate">{s.text}</p>
                <p className="text-[10px] text-slate-400 truncate">{s.place}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Mapbox Directions ───────────────────────────── */
async function fetchDirections(from: [number, number], to: [number, number]): Promise<RouteOption[]> {
  if (!MB) return fallback(from, to);
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[1]},${from[0]};${to[1]},${to[0]}?alternatives=true&geometries=geojson&overview=full&access_token=${MB}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.routes?.length) return fallback(from, to);
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
  const m = +(Math.hypot(b[0]-a[0], b[1]-a[1]) * 69).toFixed(1);
  return [{ id: "r0", label: "Direct", miles: m, mins: Math.max(2, Math.round(m*3)), waypoints: [a, b] }];
}

/* ── Flood check ─────────────────────────────────── */
function checkFlood(route: RouteOption, devs: Device[]) {
  const near: Device[] = [];
  for (const d of devs) {
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

function isActive(c: Course): boolean {
  if (c.schedule === "always") return true;
  const today = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  if (!c.days.includes(today)) return false;
  const n = new Date();
  const t = `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
  return t >= c.startTime && t <= c.endTime;
}

/* ── Persist ─────────────────────────────────────── */
function load(): Course[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem("ff_v5") || "[]"); } catch { return []; } }
function save(c: Course[]) { try { localStorage.setItem("ff_v5", JSON.stringify(c)); } catch {} }

function short(addr: string) { const p = addr.split(",")[0]; return p.length > 20 ? p.slice(0, 20) + "…" : p; }

/* ════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════ */
export default function RoutesPage() {
  const { devices, loading } = useDevices();
  const [courses, setCourses] = useState<Course[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [dir, setDir] = useState<Dir>("AB");
  const [showAdd, setShowAdd] = useState(false);
  const [schedId, setSchedId] = useState<string | null>(null);
  const [editNameId, setEditNameId] = useState<string | null>(null);
  const [tmpName, setTmpName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fFromCoord, setFFromCoord] = useState<[number, number] | null>(null);
  const [fToCoord, setFToCoord] = useState<[number, number] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { setCourses(load()); }, []);
  const persist = useCallback((c: Course[]) => { setCourses(c); save(c); }, []);

  const open = courses.find((c) => c.id === openId);
  const routes = open ? (dir === "AB" ? open.routesAB : open.routesBA) : [];
  const activeRt = routes.find((r) => r.id === routeId);
  const rtCheck = activeRt ? checkFlood(activeRt, devices) : null;

  // Auto-pick safest when course/direction changes
  useEffect(() => {
    if (!open) { setRouteId(null); return; }
    const rts = dir === "AB" ? open.routesAB : open.routesBA;
    if (rts.length) {
      const safe = rts.find((r) => checkFlood(r, devices).safe);
      setRouteId(safe?.id || rts[0].id);
    }
  }, [openId, dir]);

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  async function addCourse() {
    if (!fName.trim() || !fFromCoord || !fToCoord) {
      if (!fFromCoord) setErr("Select a start address from the dropdown");
      else if (!fToCoord) setErr("Select an end address from the dropdown");
      return;
    }
    setErr(""); setGenerating(true); haptic.light();
    const [ab, ba] = await Promise.all([fetchDirections(fFromCoord, fToCoord), fetchDirections(fToCoord, fFromCoord)]);
    if (!ab.length) { setErr("Couldn't find routes. Try different addresses."); setGenerating(false); return; }
    const c: Course = {
      id: `c${Date.now()}`, name: fName, fromAddr: fFrom, toAddr: fTo,
      fromCoord: fFromCoord, toCoord: fToCoord, routesAB: ab, routesBA: ba,
      schedule: "always", days: [], startTime: "07:00", endTime: "09:00",
    };
    persist([...courses, c]);
    setOpenId(c.id); setRouteId(null); setDir("AB");
    setFName(""); setFFrom(""); setFTo(""); setFFromCoord(null); setFToCoord(null); setShowAdd(false); setGenerating(false);
    haptic.success();
  }

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row h-full" style={{ marginBottom: "-56px" }}>
        {/* Map */}
        <div className="relative h-[38vh] lg:h-full lg:flex-1 shrink-0">
          <FloodMap devices={devices} zoom={14} route={activeRt?.waypoints || null} routeSafe={rtCheck?.safe ?? true} />
          {/* Banner */}
          {activeRt && rtCheck && !rtCheck.safe && (
            <div className="absolute top-2 left-2 right-14 z-10 anim-slide-up">
              <div className={cn("rounded-2xl p-3 backdrop-blur-xl shadow-lg border",
                rtCheck.risk === "high" ? "bg-red-600/92 border-red-500/25" : "bg-amber-500/92 border-amber-400/25"
              )}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold text-white">{rtCheck.risk === "high" ? "⚠ Avoid this route" : "⚡ Flooding risk"}</p>
                    <p className="text-[10px] text-white/75">{rtCheck.near.length} sensor{rtCheck.near.length > 1 ? "s" : ""} — try another route</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeRt && rtCheck?.safe && (
            <div className="absolute top-2 left-2 right-14 z-10 anim-slide-up">
              <div className="bg-emerald-600/92 backdrop-blur-xl rounded-2xl p-3 shadow-lg border border-emerald-500/25">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white shrink-0" />
                  <p className="text-[12px] font-bold text-white">✓ Route clear — {activeRt.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel */}
        <div className="flex-1 lg:w-[400px] lg:max-w-[400px] lg:flex-none lg:border-l lg:border-white/[0.04] flex flex-col overflow-hidden bg-[#0c1021]">
          <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span className="text-[14px] font-bold text-slate-100">My Courses</span>
            </div>
            <button onClick={() => { setShowAdd(true); setErr(""); haptic.light(); }}
              className="flex items-center gap-1.5 bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform">
              <Plus className="w-3.5 h-3.5" /> Set Course
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-20">
            {/* Add form */}
            {showAdd && (
              <div className="fcard p-4 mb-4 anim-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-bold text-slate-100">Set New Course</span>
                  <button onClick={() => { setShowAdd(false); haptic.light(); }} className="p-1 active:scale-90 transition-transform"><X className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="space-y-2.5">
                  <input placeholder="Course name (e.g. Morning Commute)" value={fName} onChange={(e) => setFName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/30" />
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 px-1">Start</label>
                    <AutoInput placeholder="Search address..." value={fFrom}
                      onChange={(v) => { setFFrom(v); setFFromCoord(null); }}
                      onSelect={(s) => { setFFromCoord(s.coord); setFFrom(s.place); }} />
                    {fFromCoord && <p className="text-[9px] text-emerald-400 mt-1 px-1">✓ Location found</p>}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 px-1">End</label>
                    <AutoInput placeholder="Search address..." value={fTo}
                      onChange={(v) => { setFTo(v); setFToCoord(null); }}
                      onSelect={(s) => { setFToCoord(s.coord); setFTo(s.place); }} />
                    {fToCoord && <p className="text-[9px] text-emerald-400 mt-1 px-1">✓ Location found</p>}
                  </div>
                  {err && <div className="flex items-center gap-2 bg-red-500/10 rounded-xl p-3"><AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /><p className="text-[11px] text-red-400">{err}</p></div>}
                  <button onClick={addCourse} disabled={!fName.trim() || !fFrom.trim() || !fTo.trim() || generating}
                    className="w-full bg-blue-500 text-white rounded-xl py-3 text-[13px] font-bold active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center justify-center gap-2">
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding routes...</> : <><Route className="w-4 h-4" /> Generate Routes</>}
                  </button>
                </div>
              </div>
            )}

            {/* Empty */}
            {!courses.length && !showAdd && (
              <div className="flex flex-col items-center py-14 anim-fade">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4"><Navigation className="w-7 h-7 text-blue-400" /></div>
                <p className="text-[15px] font-bold text-slate-100">No courses yet</p>
                <p className="text-[12px] text-slate-400 mt-1 text-center leading-relaxed">Tap "Set Course" to add a route.<br/>We'll monitor both directions for flooding.</p>
              </div>
            )}

            {/* Courses */}
            {courses.map((course) => {
              const isOpen = openId === course.id;
              const hasSafe = course.routesAB.some((r) => checkFlood(r, devices).safe) || course.routesBA.some((r) => checkFlood(r, devices).safe);
              const act = isActive(course);

              return (
                <div key={course.id} className="mb-3">
                  <button onClick={() => { setOpenId(isOpen ? null : course.id); setDir("AB"); setRouteId(null); setSchedId(null); setEditNameId(null); setConfirmDel(null); haptic.light(); }}
                    className={cn("w-full fcard p-4 text-left active:scale-[0.98] transition-transform border", isOpen ? "border-blue-500/12" : "border-transparent")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", hasSafe ? "bg-emerald-500/12" : "bg-red-500/12")}>
                        <Route className={cn("w-5 h-5", hasSafe ? "text-emerald-400" : "text-red-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editNameId === course.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input value={tmpName} onChange={(e) => setTmpName(e.target.value)} autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") { persist(courses.map((c) => c.id === course.id ? { ...c, name: tmpName } : c)); setEditNameId(null); haptic.light(); } }}
                              className="text-[13px] font-bold text-slate-100 bg-white/[0.06] rounded-lg px-2 py-1 outline-none w-full" />
                            <button onClick={(e) => { e.stopPropagation(); persist(courses.map((c) => c.id === course.id ? { ...c, name: tmpName } : c)); setEditNameId(null); haptic.light(); }}>
                              <Check className="w-4 h-4 text-emerald-400" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-bold text-slate-100 truncate">{course.name}</p>
                            {isOpen && <button onClick={(e) => { e.stopPropagation(); setEditNameId(course.id); setTmpName(course.name); haptic.light(); }}><Pencil className="w-3 h-3 text-slate-400" /></button>}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{short(course.fromAddr)} ↔ {short(course.toAddr)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", act ? "bg-blue-500/15 text-blue-400" : "bg-white/[0.04] text-slate-500")}>
                          {act ? "Active" : course.schedule === "always" ? "Always" : course.startTime}</span>
                        {hasSafe ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400">Clear ✓</span>
                          : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/12 text-red-400">Flooded</span>}
                        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-1.5 space-y-2 anim-slide-up">
                      {/* Direction toggle */}
                      <div className="fcard p-1 flex gap-1">
                        {(["AB", "BA"] as Dir[]).map((d) => {
                          const lbl = d === "AB" ? `${short(course.fromAddr)} → ${short(course.toAddr)}` : `${short(course.toAddr)} → ${short(course.fromAddr)}`;
                          const Icon = d === "AB" ? ArrowRight : ArrowLeft;
                          return (
                            <button key={d} onClick={() => { setDir(d); setRouteId(null); haptic.light(); }}
                              className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all",
                                dir === d ? "bg-blue-500 text-white" : "text-slate-400"
                              )}><Icon className="w-3 h-3" />{lbl}</button>
                          );
                        })}
                      </div>

                      {/* Route options */}
                      <div className="fcard p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Route Options</p>
                        <div className="space-y-1.5">
                          {routes.map((r) => {
                            const fl = checkFlood(r, devices); const sel = routeId === r.id;
                            return (
                              <button key={r.id} onClick={() => { setRouteId(r.id); haptic.light(); }}
                                className={cn("w-full flex items-center gap-3 p-3 rounded-xl text-left active:scale-[0.98] transition-transform border",
                                  sel ? "bg-blue-500/[0.06] border-blue-500/15" : "bg-white/[0.01] border-transparent")}>
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  fl.safe ? "bg-emerald-500/12" : fl.risk === "high" ? "bg-red-500/12" : "bg-amber-500/12")}>
                                  {fl.safe ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-slate-200">{r.label}</p>
                                  <p className="text-[10px] text-slate-400">{r.miles} mi · {r.mins} min</p>
                                </div>
                                {fl.safe ? <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">Recommended</span>
                                  : <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                    fl.risk === "high" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400")}>{fl.near.length} alert{fl.near.length > 1 ? "s" : ""}</span>}
                              </button>
                            );
                          })}
                        </div>
                        {routeId && rtCheck && !rtCheck.safe && (
                          <div className="mt-2 p-2.5 bg-red-500/[0.05] rounded-xl space-y-1.5">
                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Flooding on route</p>
                            {rtCheck.near.map((d) => (
                              <div key={d.deviceId} className="flex items-center gap-2 text-[11px]">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_CONFIG[d.status].mapColor }} />
                                <span className="text-slate-300 flex-1 truncate">{d.name}</span>
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
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {course.schedule === "always" ? "Always" : `${course.days.join(", ")} ${course.startTime}–${course.endTime}`}</span>
                          </div>
                          <ChevronRight className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", schedId === course.id && "rotate-90")} />
                        </button>
                        {schedId === course.id && (
                          <div className="px-3 pb-3 space-y-3 anim-slide-up">
                            <div className="flex gap-1.5 bg-white/[0.02] rounded-xl p-1">
                              {(["always", "custom"] as const).map((t) => (
                                <button key={t} onClick={() => { persist(courses.map((c) => c.id === course.id ? { ...c, schedule: t } : c)); haptic.light(); }}
                                  className={cn("flex-1 py-2.5 rounded-lg text-[12px] font-bold active:scale-95 transition-all",
                                    course.schedule === t ? "bg-blue-500 text-white shadow-lg shadow-blue-500/15" : "text-slate-400")}>{t === "always" ? "Always On" : "Set Times"}</button>
                              ))}
                            </div>
                            {course.schedule === "custom" && (<>
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Active Days</p>
                                <div className="flex gap-1">
                                  {DAYS.map((d) => (
                                    <button key={d} onClick={() => { persist(courses.map((c) => c.id === course.id ? { ...c, days: c.days.includes(d) ? c.days.filter((x) => x !== d) : [...c.days, d] } : c)); haptic.light(); }}
                                      className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-bold active:scale-90 transition-all",
                                        course.days.includes(d) ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.03] text-slate-500")}>{d.slice(0,2)}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {(["startTime","endTime"] as const).map((f) => (
                                  <div key={f} className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{f === "startTime" ? "From" : "To"}</p>
                                    <input type="time" value={course[f]}
                                      onChange={(e) => { persist(courses.map((c) => c.id === course.id ? { ...c, [f]: e.target.value } : c)); haptic.light(); }}
                                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 outline-none" />
                                  </div>
                                ))}
                              </div>
                            </>)}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      {confirmDel === course.id ? (
                        <div className="fcard p-3 flex items-center justify-between anim-slide-up">
                          <p className="text-[12px] text-slate-300">Delete this course?</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setConfirmDel(null); haptic.light(); }} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.04] text-slate-400 active:scale-95 transition-transform">Cancel</button>
                            <button onClick={() => { persist(courses.filter((c) => c.id !== course.id)); if (openId === course.id) { setOpenId(null); setRouteId(null); } setConfirmDel(null); haptic.heavy(); }}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500 text-white active:scale-95 transition-transform">Delete</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setConfirmDel(course.id); haptic.light(); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] text-slate-500 active:text-red-400 active:scale-95 transition-all">
                          <Trash2 className="w-3.5 h-3.5" /> Remove Course
                        </button>
                      )}
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
