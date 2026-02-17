"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { FloodMap } from "@/components/map/flood-map";
import { haptic } from "@/lib/haptics";
import {
  AlertTriangle, Plus, Trash2, Route, Shield, Loader2,
  ChevronDown, MapPin, X, Clock, CheckCircle2, AlertCircle,
  Navigation, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Device, STATUS_CONFIG } from "@/types";

/* ────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────── */
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
  from: string;
  to: string;
  fromCoord: [number, number];
  toCoord: [number, number];
  routes: RouteOption[];
  schedule: "always" | "custom";
  days: string[];
  startTime: string;
  endTime: string;
}

/* ────────────────────────────────────────────────────
   Known locations around Aventura
   ──────────────────────────────────────────────────── */
const PLACES: { name: string; coord: [number, number] }[] = [
  { name: "Home", coord: [25.957, -80.139] },
  { name: "Aventura Mall", coord: [25.9565, -80.1425] },
  { name: "School", coord: [25.964, -80.133] },
  { name: "Founders Park", coord: [25.960, -80.132] },
  { name: "Gym", coord: [25.953, -80.144] },
  { name: "Office", coord: [25.951, -80.148] },
  { name: "Target", coord: [25.9485, -80.1505] },
  { name: "Waterways Dog Park", coord: [25.955, -80.135] },
];

function coordFor(name: string): [number, number] {
  return PLACES.find((p) => p.name === name)?.coord || [25.957 + Math.random() * 0.01, -80.139 + Math.random() * 0.01];
}

/* ────────────────────────────────────────────────────
   Generate 3 route options between two points
   ──────────────────────────────────────────────────── */
function makeRoutes(a: [number, number], b: [number, number]): RouteOption[] {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const spread = 0.004;
  const baseMiles = +(d * 69 * 0.95).toFixed(1);

  return [
    {
      id: "r1", label: "Fastest route", miles: baseMiles, mins: Math.max(4, Math.round(baseMiles * 3)),
      waypoints: [a, [a[0] + (b[0]-a[0])*0.3, a[1] + (b[1]-a[1])*0.2], [mid[0]+spread*0.2, mid[1]-spread*0.1], [a[0] + (b[0]-a[0])*0.7, a[1] + (b[1]-a[1])*0.8], b],
    },
    {
      id: "r2", label: "Via main roads", miles: +(baseMiles * 1.2).toFixed(1), mins: Math.max(5, Math.round(baseMiles * 4)),
      waypoints: [a, [a[0]-spread, a[1]+(b[1]-a[1])*0.3], [mid[0]-spread, mid[1]], [b[0]-spread*0.5, b[1]-spread*0.3], b],
    },
    {
      id: "r3", label: "Alternate route", miles: +(baseMiles * 1.35).toFixed(1), mins: Math.max(6, Math.round(baseMiles * 5)),
      waypoints: [a, [a[0]+spread, a[1]-spread*0.4], [mid[0]+spread, mid[1]+spread], [b[0]+spread*0.3, b[1]+spread*0.4], b],
    },
  ];
}

/* ────────────────────────────────────────────────────
   Check a single route for nearby flood sensors
   ──────────────────────────────────────────────────── */
function checkFlood(route: RouteOption, devices: Device[]) {
  const nearby: Device[] = [];
  for (const dev of devices) {
    if (dev.status === "OK") continue;
    for (const [lat, lng] of route.waypoints) {
      if (Math.hypot(dev.lat - lat, dev.lng - lng) < 0.004) {
        if (!nearby.find((x) => x.deviceId === dev.deviceId)) nearby.push(dev);
        break;
      }
    }
  }
  const hasSevere = nearby.some((d) => d.status === "ALERT");
  return {
    safe: nearby.length === 0,
    nearby,
    risk: hasSevere ? "high" : nearby.length > 0 ? "moderate" : "none",
  } as const;
}

/* ────────────────────────────────────────────────────
   Is this course currently active based on schedule?
   ──────────────────────────────────────────────────── */
function isActiveNow(c: Course): boolean {
  if (c.schedule === "always") return true;
  const now = new Date();
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  if (!c.days.includes(dayName)) return false;
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return t >= c.startTime && t <= c.endTime;
}

/* ────────────────────────────────────────────────────
   Persistence
   ──────────────────────────────────────────────────── */
function loadCourses(): Course[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ff_courses");
    return raw ? JSON.parse(raw) : defaults();
  } catch { return defaults(); }
}
function save(courses: Course[]) {
  try { localStorage.setItem("ff_courses", JSON.stringify(courses)); } catch {}
}
function defaults(): Course[] {
  const home = coordFor("Home");
  const school = coordFor("School");
  const mall = coordFor("Aventura Mall");
  return [
    {
      id: "c1", name: "Morning Commute", from: "Home", to: "School",
      fromCoord: home, toCoord: school, routes: makeRoutes(home, school),
      schedule: "custom", days: ["Mon","Tue","Wed","Thu","Fri"], startTime: "07:00", endTime: "08:30",
    },
    {
      id: "c2", name: "Mall Trip", from: "Home", to: "Aventura Mall",
      fromCoord: home, toCoord: mall, routes: makeRoutes(home, mall),
      schedule: "always", days: [], startTime: "", endTime: "",
    },
  ];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════ */
export default function RoutesPage() {
  const { devices, loading } = useDevices();
  const [courses, setCourses] = useState<Course[]>([]);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [viewingRoute, setViewingRoute] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState<string | null>(null);

  // Add form
  const [fName, setFName] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  useEffect(() => { setCourses(loadCourses()); }, []);

  const persist = useCallback((c: Course[]) => { setCourses(c); save(c); }, []);

  // Currently displayed route on map
  const activeCourse = courses.find((c) => c.id === openCourse);
  const activeRoute = activeCourse?.routes.find((r) => r.id === viewingRoute);
  const routeFlood = activeRoute ? checkFlood(activeRoute, devices) : null;

  // Auto-pick safest route when opening a course
  useEffect(() => {
    if (activeCourse && !viewingRoute) {
      const safest = activeCourse.routes.find((r) => checkFlood(r, devices).safe);
      setViewingRoute(safest?.id || activeCourse.routes[0]?.id || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCourse]);

  if (loading)
    return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div></AppShell>;

  function addCourse() {
    if (!fName.trim() || !fFrom || !fTo || fFrom === fTo) return;
    const fc = coordFor(fFrom);
    const tc = coordFor(fTo);
    const c: Course = {
      id: `c-${Date.now()}`, name: fName, from: fFrom, to: fTo,
      fromCoord: fc, toCoord: tc, routes: makeRoutes(fc, tc),
      schedule: "always", days: [], startTime: "", endTime: "",
    };
    persist([...courses, c]);
    setOpenCourse(c.id);
    setViewingRoute(null);
    setFName(""); setFFrom(""); setFTo(""); setShowAdd(false);
    haptic.success();
  }

  function deleteCourse(id: string) {
    persist(courses.filter((c) => c.id !== id));
    if (openCourse === id) { setOpenCourse(null); setViewingRoute(null); }
    haptic.medium();
  }

  function setScheduleType(id: string, type: "always" | "custom") {
    persist(courses.map((c) => c.id === id ? { ...c, schedule: type } : c));
    haptic.light();
  }

  function toggleDay(id: string, day: string) {
    persist(courses.map((c) => {
      if (c.id !== id) return c;
      const days = c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day];
      return { ...c, days };
    }));
    haptic.light();
  }

  function setTime(id: string, field: "startTime" | "endTime", val: string) {
    persist(courses.map((c) => c.id === id ? { ...c, [field]: val } : c));
  }

  return (
    <AppShell>
      <div className="relative h-full" style={{ marginBottom: "-72px" }}>
        {/* Map background */}
        <FloodMap
          devices={devices}
          zoom={15}
          route={activeRoute?.waypoints || null}
          routeSafe={routeFlood?.safe ?? true}
        />

        {/* ── Top: route status banner ─────────────── */}
        {activeRoute && routeFlood && !routeFlood.safe && (
          <div className="absolute top-2 left-3 right-3 z-[1000] anim-slide-up">
            <div className={cn("rounded-2xl p-3.5 backdrop-blur-xl shadow-xl border",
              routeFlood.risk === "high" ? "bg-red-600/90 border-red-500/40" : "bg-amber-500/90 border-amber-400/40"
            )}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-white">
                    {routeFlood.risk === "high" ? "Avoid this route" : "Risk on this route"}
                  </p>
                  <p className="text-[11px] text-white/75 mt-0.5">
                    {routeFlood.nearby.length} flood sensor{routeFlood.nearby.length > 1 ? "s" : ""} nearby — check other routes below
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeRoute && routeFlood?.safe && (
          <div className="absolute top-2 left-3 right-3 z-[1000] anim-slide-up">
            <div className="bg-emerald-600/90 backdrop-blur-xl rounded-2xl p-3.5 shadow-xl border border-emerald-500/40">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-white shrink-0" />
                <p className="text-[13px] font-bold text-white">✓ Route clear — {activeRoute.label}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom sheet ──────────────────────────── */}
        <div className="absolute bottom-[72px] inset-x-0 z-[1000] max-h-[62vh]">
          <div className="bg-[#0f1629]/94 backdrop-blur-2xl rounded-t-2xl border-t border-white/[0.06] overflow-hidden h-full flex flex-col">
            {/* Handle */}
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-bold text-slate-200">My Courses</span>
              </div>
              <button onClick={() => { setShowAdd(true); haptic.light(); }}
                className="flex items-center gap-1 bg-blue-500/15 text-blue-400 text-[11px] font-bold px-3 py-1.5 rounded-full tap-sm">
                <Plus className="w-3 h-3" /> Set Course
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
              {/* ── Add Course Form ─────────────── */}
              {showAdd && (
                <div className="fcard p-4 mb-3 anim-slide-up">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-bold text-slate-200">Set New Course</span>
                    <button onClick={() => setShowAdd(false)} className="tap-sm p-1"><X className="w-4 h-4 text-slate-500" /></button>
                  </div>

                  <input placeholder="Course name (e.g. Morning Commute)" value={fName} onChange={(e) => setFName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/40 mb-2" />

                  <div className="flex gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 px-1">Start Point</label>
                      <select value={fFrom} onChange={(e) => setFFrom(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[13px] text-slate-100 outline-none appearance-none">
                        <option value="">Select...</option>
                        {PLACES.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 px-1">End Point</label>
                      <select value={fTo} onChange={(e) => setFTo(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[13px] text-slate-100 outline-none appearance-none">
                        <option value="">Select...</option>
                        {PLACES.filter((p) => p.name !== fFrom).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button onClick={addCourse} disabled={!fName.trim() || !fFrom || !fTo || fFrom === fTo}
                    className="w-full bg-blue-500 text-white rounded-xl py-3 text-[13px] font-bold tap disabled:opacity-30 flex items-center justify-center gap-2">
                    <Route className="w-4 h-4" /> Generate Routes
                  </button>
                </div>
              )}

              {/* ── Course List ─────────────────── */}
              {courses.length === 0 && !showAdd && (
                <div className="flex flex-col items-center py-16 anim-fade">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Navigation className="w-7 h-7 text-blue-400" />
                  </div>
                  <p className="text-[15px] font-bold text-slate-200">No courses yet</p>
                  <p className="text-[12px] text-slate-500 mt-1">Tap "Set Course" to plan your first route</p>
                </div>
              )}

              {courses.map((course) => {
                const isOpen = openCourse === course.id;
                const active = isActiveNow(course);
                const routeChecks = course.routes.map((r) => ({ ...r, flood: checkFlood(r, devices) }));
                const safest = routeChecks.find((r) => r.flood.safe);
                const allBlocked = !safest;

                return (
                  <div key={course.id} className="mb-2.5">
                    {/* Course card */}
                    <div
                      onClick={() => {
                        const next = isOpen ? null : course.id;
                        setOpenCourse(next);
                        setViewingRoute(null);
                        setScheduleOpen(null);
                        haptic.light();
                      }}
                      className={cn("fcard p-4 tap border transition-all",
                        isOpen ? "border-blue-500/15 bg-blue-500/[0.02]" : "border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          allBlocked ? "bg-red-500/12" : "bg-emerald-500/12"
                        )}>
                          <Route className={cn("w-5 h-5", allBlocked ? "text-red-400" : "text-emerald-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-100 truncate">{course.name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />{course.from} → {course.to}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                            active ? "bg-blue-500/15 text-blue-400" : "bg-white/[0.04] text-slate-600"
                          )}>
                            {active ? "Active" : course.schedule === "custom" ? `${course.startTime}` : "Always"}
                          </span>
                          {allBlocked ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/12 text-red-400">Flooded</span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400">Clear ✓</span>
                          )}
                          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-600 transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </div>
                    </div>

                    {/* ── Expanded content ──────────── */}
                    {isOpen && (
                      <div className="mt-1 space-y-2 anim-slide-up">
                        {/* Route options */}
                        <div className="fcard p-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                            {allBlocked ? "⚠ All routes have flooding — pick safest:" : "Route Options"}
                          </p>
                          {routeChecks.map((r) => {
                            const isSel = viewingRoute === r.id;
                            const { safe, nearby, risk } = r.flood;
                            return (
                              <button key={r.id}
                                onClick={(e) => { e.stopPropagation(); setViewingRoute(r.id); haptic.light(); }}
                                className={cn("w-full flex items-center gap-3 p-3 rounded-xl text-left tap-sm mb-1.5 border transition-all",
                                  isSel ? "bg-blue-500/[0.06] border-blue-500/20" : "bg-white/[0.015] border-transparent"
                                )}>
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  safe ? "bg-emerald-500/12" : risk === "high" ? "bg-red-500/12" : "bg-amber-500/12"
                                )}>
                                  {safe ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className="flex-1">
                                  <p className="text-[12px] font-semibold text-slate-200">{r.label}</p>
                                  <p className="text-[10px] text-slate-500">{r.miles} mi • {r.mins} min</p>
                                </div>
                                {safe ? (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Recommended</span>
                                ) : (
                                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                                    risk === "high" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                                  )}>{nearby.length} alert{nearby.length > 1 ? "s" : ""}</span>
                                )}
                              </button>
                            );
                          })}

                          {/* Flood detail for selected route */}
                          {viewingRoute && routeFlood && !routeFlood.safe && (
                            <div className="mt-2 p-2.5 bg-red-500/[0.06] rounded-xl space-y-1.5">
                              <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Flooding on this route</p>
                              {routeFlood.nearby.map((d) => (
                                <div key={d.deviceId} className="flex items-center gap-2 text-[11px]">
                                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[d.status].mapColor }} />
                                  <span className="text-slate-300 flex-1">{d.name}</span>
                                  <span className={cn("font-mono font-bold",
                                    d.status === "ALERT" ? "text-red-400" : "text-amber-400"
                                  )}>{d.waterLevelCm.toFixed(0)} cm</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Schedule settings */}
                        <div className="fcard overflow-hidden">
                          <button
                            onClick={(e) => { e.stopPropagation(); setScheduleOpen(scheduleOpen === course.id ? null : course.id); haptic.light(); }}
                            className="w-full flex items-center justify-between p-3 tap-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-purple-400" />
                              <span className="text-[12px] font-semibold text-slate-200">Schedule</span>
                              <span className="text-[10px] text-slate-500">
                                {course.schedule === "always" ? "Always active" : `${course.days.join(", ")} ${course.startTime}–${course.endTime}`}
                              </span>
                            </div>
                            <ChevronRight className={cn("w-3.5 h-3.5 text-slate-600 transition-transform", scheduleOpen === course.id && "rotate-90")} />
                          </button>

                          {scheduleOpen === course.id && (
                            <div className="px-3 pb-3 space-y-3 anim-slide-up">
                              {/* Always / Custom toggle */}
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setScheduleType(course.id, "always"); }}
                                  className={cn("flex-1 py-2 rounded-xl text-[12px] font-bold tap-sm",
                                    course.schedule === "always" ? "bg-purple-500 text-white" : "bg-white/[0.04] text-slate-500"
                                  )}>Always On</button>
                                <button onClick={(e) => { e.stopPropagation(); setScheduleType(course.id, "custom"); }}
                                  className={cn("flex-1 py-2 rounded-xl text-[12px] font-bold tap-sm",
                                    course.schedule === "custom" ? "bg-purple-500 text-white" : "bg-white/[0.04] text-slate-500"
                                  )}>Set Times</button>
                              </div>

                              {course.schedule === "custom" && (
                                <>
                                  {/* Day picker */}
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Active Days</p>
                                    <div className="flex gap-1">
                                      {DAYS.map((d) => (
                                        <button key={d}
                                          onClick={(e) => { e.stopPropagation(); toggleDay(course.id, d); }}
                                          className={cn("flex-1 py-2 rounded-lg text-[10px] font-bold tap-sm",
                                            course.days.includes(d) ? "bg-purple-500/20 text-purple-400" : "bg-white/[0.03] text-slate-600"
                                          )}>{d.charAt(0)}</button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Time pickers */}
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</p>
                                      <input type="time" value={course.startTime}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setTime(course.id, "startTime", e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-[12px] text-slate-200 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</p>
                                      <input type="time" value={course.endTime}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setTime(course.id, "endTime", e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-[12px] text-slate-200 outline-none" />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <button onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] text-red-400/60 tap-sm">
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
      </div>
    </AppShell>
  );
}
