"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRightLeft,
  Sparkles,
  Zap,
  Shield,
  Clock,
  TriangleAlert,
} from "lucide-react";
import AddressInput from "@/components/AddressInput";
import { Course, RouteData, loadCourses, saveCourses, generateId } from "@/lib/routes-store";
import { fetchRoutes, checkFloodingOnRoute } from "@/lib/geo-utils";
import { useSettings } from "@/lib/settings-context";

const SmartRouteMap = dynamic(() => import("@/components/SmartRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0a0e1a]">
      <Loader2 size={24} className="animate-spin text-[#3b82f6]" />
    </div>
  ),
});

const ROUTE_LABELS = ["Fastest", "Alternative 1", "Alternative 2"];

interface AIRanking {
  routeIndex: number;
  safetyScore: number;
  badge: string;
  shortReason: string;
}
interface AIAnalysis {
  rankings: AIRanking[];
  recommendation: string;
  overallCondition: "clear" | "moderate" | "severe";
}

const BADGE_STYLES: Record<string, { text: string; bg: string; icon: React.ReactNode }> = {
  "AI PICK": { text: "text-[#a78bfa]", bg: "bg-[#7c3aed]/20 border-[#7c3aed]/30", icon: <Sparkles size={8} /> },
  SAFEST:   { text: "text-[#34d399]", bg: "bg-[#34d399]/15 border-[#34d399]/25", icon: <Shield size={8} /> },
  FASTEST:  { text: "text-[#3b82f6]", bg: "bg-[#3b82f6]/15 border-[#3b82f6]/25", icon: <Zap size={8} /> },
  CAUTION:  { text: "text-[#fbbf24]", bg: "bg-[#fbbf24]/15 border-[#fbbf24]/25", icon: <TriangleAlert size={8} /> },
  AVOID:    { text: "text-[#f87171]", bg: "bg-[#f87171]/15 border-[#f87171]/25", icon: <AlertTriangle size={8} /> },
};

function SafetyRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ position: "relative", width: 48, height: 48 }}>
      <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={24} cy={24} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        <circle
          cx={24} cy={24} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 7, color: "#64748b", fontWeight: 500 }}>safe</span>
      </div>
    </div>
  );
}

export default function RoutesPage() {
  const { settings } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{
    courseId: string;
    direction: "AtoB" | "BtoA";
    index: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // AI state
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, AIAnalysis>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // Form
  const [formName, setFormName] = useState("");
  const [startAddress, setStartAddress] = useState("");
  const [startLat, setStartLat] = useState(0);
  const [startLng, setStartLng] = useState(0);
  const [endAddress, setEndAddress] = useState("");
  const [endLat, setEndLat] = useState(0);
  const [endLng, setEndLng] = useState(0);

  // Inline rename
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  // Direction per course
  const [directions, setDirections] = useState<Record<string, "AtoB" | "BtoA">>({});

  useEffect(() => { setCourses(loadCourses()); }, []);

  const save = useCallback((updated: Course[]) => {
    setCourses(updated);
    saveCourses(updated);
  }, []);

  const resetForm = () => {
    setFormName(""); setStartAddress(""); setStartLat(0); setStartLng(0);
    setEndAddress(""); setEndLat(0); setEndLng(0); setShowForm(false);
  };

  const buildRouteData = (
    rawRoutes: { geometry: [number, number][]; distance: number; duration: number }[]
  ): RouteData[] =>
    rawRoutes.map((r, i) => {
      const flood = checkFloodingOnRoute(r.geometry, settings.alertRadiusM);
      return {
        geometry: r.geometry,
        distance: r.distance,
        duration: r.duration,
        label: ROUTE_LABELS[i] || `Route ${i + 1}`,
        hasFlooding: flood.hasFlooding,
        floodLevel: flood.floodLevel,
        nearbySensors: flood.nearbySensors,
      };
    });

  // Run AI analysis for a course
  const runAIAnalysis = useCallback(async (courseId: string, routes: RouteData[], start: string, end: string) => {
    setAiLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const resp = await fetch("/api/ai-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes, startAddress: start, endAddress: end }),
      });
      if (!resp.ok) throw new Error("Request failed");
      const data: AIAnalysis = await resp.json();
      setAiAnalyses((prev) => ({ ...prev, [courseId]: data }));
    } catch {
      // AI is optional — fail silently, routes still work
    }
    setAiLoading((prev) => ({ ...prev, [courseId]: false }));
  }, []);

  const handleGenerate = async () => {
    if (!startAddress || !endAddress || !formName) return;
    setLoading(true);
    try {
      const [rawAtoB, rawBtoA] = await Promise.all([
        fetchRoutes(startLat, startLng, endLat, endLng),
        fetchRoutes(endLat, endLng, startLat, startLng),
      ]);

      const routesAtoB = buildRouteData(rawAtoB);
      const routesBtoA = buildRouteData(rawBtoA);
      const id = generateId();

      const newCourse: Course = {
        id,
        name: formName,
        startAddress, startLat, startLng,
        endAddress, endLat, endLng,
        routesAtoB,
        routesBtoA,
        schedule: {
          mode: "always",
          days: [true, true, true, true, true, false, false],
          startTime: "07:00",
          endTime: "09:00",
        },
      };

      const updated = [...courses, newCourse];
      save(updated);
      resetForm();
      setExpanded(id);

      // Kick off AI analysis immediately
      runAIAnalysis(id, routesAtoB, startAddress, endAddress);
    } catch {
      alert("Failed to generate routes. Check addresses and try again.");
    }
    setLoading(false);
  };

  const handleExpand = (courseId: string) => {
    const next = expanded === courseId ? null : courseId;
    setExpanded(next);
    setSelectedRoute(null);
    // Auto-trigger AI analysis when expanding a course that hasn't been analyzed yet
    if (next && !aiAnalyses[next] && !aiLoading[next]) {
      const course = courses.find((c) => c.id === next);
      if (course) runAIAnalysis(next, course.routesAtoB, course.startAddress, course.endAddress);
    }
  };

  const deleteCourse = (id: string) => {
    save(courses.filter((c) => c.id !== id));
    setDeleteConfirm(null);
    if (selectedRoute?.courseId === id) setSelectedRoute(null);
    if (expanded === id) setExpanded(null);
  };

  const renameCourse = (id: string) => {
    save(courses.map((c) => (c.id === id ? { ...c, name: editNameValue } : c)));
    setEditingName(null);
  };

  const getDirection = (id: string) => directions[id] || "AtoB";
  const toggleDirection = (id: string) => {
    setDirections((prev) => ({ ...prev, [id]: prev[id] === "BtoA" ? "AtoB" : "BtoA" }));
    if (selectedRoute?.courseId === id) setSelectedRoute(null);
  };

  const getDisplayRoutes = (course: Course) =>
    getDirection(course.id) === "AtoB" ? course.routesAtoB : course.routesBtoA;

  const getCourseStatus = (course: Course) => {
    const all = [...course.routesAtoB, ...course.routesBtoA];
    const hasSevere = all.some((r) => r.floodLevel === "severe");
    const hasFlooding = all.some((r) => r.hasFlooding);
    return { level: hasSevere ? "severe" : hasFlooding ? "moderate" : "clear" };
  };

  // Map data
  const mapRoutes: RouteData[] = expanded
    ? (() => {
        const course = courses.find((c) => c.id === expanded);
        if (!course) return [];
        return selectedRoute?.courseId === expanded
          ? (selectedRoute.direction === "AtoB" ? course.routesAtoB : course.routesBtoA)
          : getDisplayRoutes(course);
      })()
    : [];

  const mapSelectedIndex = selectedRoute?.courseId === expanded ? selectedRoute.index : null;
  const expandedCourse = courses.find((c) => c.id === expanded);
  const expandedAI = expanded ? aiAnalyses[expanded] : undefined;
  const expandedAILoading = expanded ? aiLoading[expanded] : false;
  const mapAIRankings = expandedAI?.rankings;

  // Banner for selected route
  const getBanner = () => {
    if (!selectedRoute) return null;
    const course = courses.find((c) => c.id === selectedRoute.courseId);
    if (!course) return null;
    const routes = selectedRoute.direction === "AtoB" ? course.routesAtoB : course.routesBtoA;
    const route = routes[selectedRoute.index];
    if (!route) return null;
    if (route.floodLevel === "severe")
      return { cls: "bg-[#f87171]/15 border-[#f87171]/30", text: `⚠ Avoid — ${route.nearbySensors.length} active flood sensor${route.nearbySensors.length > 1 ? "s" : ""}`, color: "text-[#f87171]" };
    if (route.floodLevel === "moderate")
      return { cls: "bg-[#fbbf24]/15 border-[#fbbf24]/30", text: `Moderate risk — ${route.nearbySensors.length} warning sensor${route.nearbySensors.length > 1 ? "s" : ""} nearby`, color: "text-[#fbbf24]" };
    return { cls: "bg-[#34d399]/15 border-[#34d399]/30", text: "Route is clear of flooding ✓", color: "text-[#34d399]" };
  };
  const banner = getBanner();

  return (
    <div className="flex flex-col bg-[#0a0e1a]" style={{ height: "calc(100dvh - 72px)" }}>
      {/* Map */}
      <div className="relative shrink-0" style={{ height: "42%" }}>
        <SmartRouteMap
          routes={mapRoutes}
          selectedIndex={mapSelectedIndex}
          alertRadiusM={settings.alertRadiusM}
          aiRankings={mapAIRankings}
        />
        {banner && (
          <div className={`absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-xl ${banner.cls}`}>
            <span className={`text-[11px] font-semibold ${banner.color}`}>{banner.text}</span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#f1f5f9]">Routes</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="press-scale flex items-center gap-1.5 rounded-xl bg-[#3b82f6] px-3.5 py-2.5 text-xs font-semibold text-white"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="animate-fade-in-up mb-3 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Route name (e.g. Work Commute)"
              className="mb-3 w-full rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-3 py-2.5 text-sm text-[#f1f5f9] outline-none placeholder:text-[#64748b] focus:border-[#3b82f6]"
            />
            <AddressInput
              label="Start"
              value={startAddress}
              onChange={(a, lat, lng) => { setStartAddress(a); setStartLat(lat); setStartLng(lng); }}
              placeholder="Starting address..."
            />
            <div className="mt-2">
              <AddressInput
                label="End"
                value={endAddress}
                onChange={(a, lat, lng) => { setEndAddress(a); setEndLat(lat); setEndLng(lng); }}
                placeholder="Destination..."
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading || !formName || !startAddress || !endAddress}
                className="press-scale flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3b82f6] py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" />Analyzing routes...</>
                ) : (
                  <><Sparkles size={15} />Generate AI Routes</>
                )}
              </button>
              <button
                onClick={resetForm}
                className="press-scale rounded-xl border border-[#1e293b] px-4 py-3 text-xs text-[#94a3b8]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && !showForm && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7c3aed]/15">
              <Sparkles size={24} className="text-[#a78bfa]" />
            </div>
            <p className="text-sm font-semibold text-[#f1f5f9]">No routes yet</p>
            <p className="text-xs text-[#94a3b8]">
              Tap + Add and let AI find the safest path
            </p>
          </div>
        )}

        {/* Course cards */}
        {courses.map((course, ci) => {
          const isExpanded = expanded === course.id;
          const status = getCourseStatus(course);
          const dir = getDirection(course.id);
          const displayRoutes = getDisplayRoutes(course);
          const analysis = aiAnalyses[course.id];
          const isAILoading = aiLoading[course.id];

          return (
            <div
              key={course.id}
              className="animate-fade-in-up mb-2.5 rounded-2xl border border-[#1e293b] bg-[#111827]"
              style={{ animationDelay: `${ci * 0.05}s` }}
            >
              {/* Course header row */}
              <button
                onClick={() => handleExpand(course.id)}
                className="flex w-full items-center gap-2.5 p-3.5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {editingName === course.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="w-28 rounded bg-[#0a0e1a] px-2 py-1 text-xs text-[#f1f5f9] outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameCourse(course.id);
                            if (e.key === "Escape") setEditingName(null);
                          }}
                        />
                        <button onClick={() => renameCourse(course.id)}><Check size={12} className="text-[#34d399]" /></button>
                        <button onClick={() => setEditingName(null)}><X size={12} className="text-[#64748b]" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-[#f1f5f9]">{course.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setEditingName(course.id); setEditNameValue(course.name); }}>
                          <Pencil size={11} className="text-[#64748b]" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#64748b] truncate">
                    {course.startAddress.split(",")[0]} → {course.endAddress.split(",")[0]}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  status.level === "clear" ? "bg-[#34d399]/15 text-[#34d399]"
                  : status.level === "severe" ? "bg-[#f87171]/15 text-[#f87171]"
                  : "bg-[#fbbf24]/15 text-[#fbbf24]"
                }`}>
                  {status.level === "clear" ? "Clear ✓" : "Flood ⚠"}
                </span>
                {isExpanded ? <ChevronDown size={16} className="text-[#64748b]" /> : <ChevronRight size={16} className="text-[#64748b]" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[#1e293b] px-3.5 pb-3.5 pt-3 space-y-3">

                  {/* ── AI Analysis Panel ──────────────────────────────── */}
                  <div className="rounded-2xl border border-[#7c3aed]/20 bg-gradient-to-br from-[#7c3aed]/8 via-transparent to-[#3b82f6]/5 p-3.5">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed]/25">
                        <Sparkles size={12} className="text-[#a78bfa]" />
                      </div>
                      <span className="text-xs font-bold text-[#f1f5f9]">AI Route Intelligence</span>
                      {isAILoading && <Loader2 size={11} className="ml-auto animate-spin text-[#7c3aed]" />}
                      {analysis && !isAILoading && (
                        <span className={`ml-auto text-[8px] font-bold px-2 py-0.5 rounded-full ${
                          analysis.overallCondition === "clear" ? "bg-[#34d399]/15 text-[#34d399]"
                          : analysis.overallCondition === "severe" ? "bg-[#f87171]/15 text-[#f87171]"
                          : "bg-[#fbbf24]/15 text-[#fbbf24]"
                        }`}>
                          {analysis.overallCondition} conditions
                        </span>
                      )}
                    </div>

                    {/* Loading dots */}
                    {isAILoading && (
                      <div className="flex items-center gap-2.5 py-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-[#7c3aed]"
                            style={{ animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
                          />
                        ))}
                        <span className="text-[10px] text-[#64748b]">AI is analyzing route safety...</span>
                      </div>
                    )}

                    {/* AI recommendation text */}
                    {analysis && !isAILoading && (
                      <>
                        <p className="text-[11px] leading-relaxed text-[#94a3b8] mb-3">
                          {analysis.recommendation}
                        </p>

                        {/* Route ranking cards */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {analysis.rankings.map((ranking) => {
                            const route = displayRoutes[ranking.routeIndex];
                            if (!route) return null;
                            const style = BADGE_STYLES[ranking.badge] || { text: "text-[#94a3b8]", bg: "bg-[#1e293b] border-[#1e293b]", icon: null };
                            const score = ranking.safetyScore;
                            const isRouteSelected =
                              selectedRoute?.courseId === course.id &&
                              selectedRoute?.direction === dir &&
                              selectedRoute?.index === ranking.routeIndex;

                            return (
                              <button
                                key={ranking.routeIndex}
                                onClick={() =>
                                  setSelectedRoute(
                                    isRouteSelected
                                      ? null
                                      : { courseId: course.id, direction: dir, index: ranking.routeIndex }
                                  )
                                }
                                className={`flex flex-col items-center rounded-xl border p-2 transition-all ${
                                  isRouteSelected
                                    ? "border-[#7c3aed]/50 bg-[#7c3aed]/10"
                                    : "border-[#1e293b] bg-[#0a0e1a]"
                                }`}
                              >
                                <SafetyRing score={score} />
                                <div className="mt-1.5 text-[9px] font-semibold text-[#94a3b8]">
                                  {route.label}
                                </div>
                                <span className={`mt-1 flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[7px] font-bold ${style.bg} ${style.text}`}>
                                  {style.icon}
                                  {ranking.badge}
                                </span>
                                <p className="mt-1 text-[8px] leading-tight text-[#64748b] text-center">
                                  {ranking.shortReason}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* No AI key fallback */}
                    {!analysis && !isAILoading && (
                      <p className="text-[10px] text-[#64748b]">
                        Add an <span className="text-[#a78bfa] font-mono">ANTHROPIC_API_KEY</span> to enable AI analysis.
                      </p>
                    )}
                  </div>

                  {/* ── Direction toggle ───────────────────────────────── */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => dir !== "AtoB" && toggleDirection(course.id)}
                      className={`press-scale flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium ${
                        dir === "AtoB" ? "bg-[#3b82f6] text-white" : "bg-[#0a0e1a] text-[#94a3b8]"
                      }`}
                    >
                      <span className="truncate">{course.startAddress.split(",")[0]}</span>
                      <span>→</span>
                      <span className="truncate">{course.endAddress.split(",")[0]}</span>
                    </button>
                    <button
                      onClick={() => dir !== "BtoA" && toggleDirection(course.id)}
                      className="press-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0a0e1a]"
                    >
                      <ArrowRightLeft size={14} className="text-[#94a3b8]" />
                    </button>
                  </div>

                  {/* ── Route option buttons ───────────────────────────── */}
                  <div className="space-y-1.5">
                    {displayRoutes.map((route, ri) => {
                      const isSelected =
                        selectedRoute?.courseId === course.id &&
                        selectedRoute?.direction === dir &&
                        selectedRoute?.index === ri;
                      const miles = (route.distance / 1609.34).toFixed(1);
                      const mins = Math.round(route.duration / 60);
                      const aiRank = analysis?.rankings.find((r) => r.routeIndex === ri);

                      return (
                        <button
                          key={ri}
                          onClick={() =>
                            setSelectedRoute(
                              isSelected ? null : { courseId: course.id, direction: dir, index: ri }
                            )
                          }
                          className={`press-scale flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${
                            isSelected
                              ? "border-[#3b82f6] bg-[#3b82f6]/10"
                              : "border-[#1e293b] bg-[#0a0e1a]"
                          }`}
                        >
                          {/* Colored status dot */}
                          <div
                            className="shrink-0 h-2 w-2 rounded-full"
                            style={{
                              background:
                                route.floodLevel === "severe" ? "#f87171"
                                : route.floodLevel === "moderate" ? "#fbbf24"
                                : "#34d399",
                              boxShadow:
                                route.floodLevel === "severe" ? "0 0 6px #f8717180"
                                : route.floodLevel === "moderate" ? "0 0 6px #fbbf2480"
                                : "0 0 6px #34d39980",
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-[#f1f5f9]">
                                {route.label}
                              </span>
                              {/* AI badge inline */}
                              {aiRank && (
                                <span className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[7px] font-bold ${
                                  (BADGE_STYLES[aiRank.badge] || { bg: "bg-[#1e293b] border-[#1e293b]", text: "text-[#94a3b8]" }).bg
                                } ${(BADGE_STYLES[aiRank.badge] || { text: "text-[#94a3b8]" }).text}`}>
                                  {BADGE_STYLES[aiRank.badge]?.icon}
                                  {aiRank.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#64748b] flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <Navigation size={8} className="text-[#64748b]" />
                                {miles} mi
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Clock size={8} className="text-[#64748b]" />
                                {mins} min
                              </span>
                            </p>
                          </div>

                          {/* Flood status */}
                          {route.hasFlooding ? (
                            <span className={`shrink-0 text-[9px] font-semibold ${
                              route.floodLevel === "severe" ? "text-[#f87171]" : "text-[#fbbf24]"
                            }`}>
                              {route.nearbySensors.length} alert{route.nearbySensors.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[9px] font-semibold text-[#34d399]">Clear ✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Delete ────────────────────────────────────────── */}
                  <div>
                    {deleteConfirm === course.id ? (
                      <div className="flex items-center gap-2 rounded-xl bg-[#f87171]/10 p-2.5">
                        <span className="flex-1 text-[11px] text-[#f87171]">Delete this route?</span>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 text-[11px] text-[#94a3b8]">Cancel</button>
                        <button onClick={() => deleteCourse(course.id)} className="rounded-lg bg-[#f87171] px-2.5 py-1 text-[11px] font-semibold text-white">Delete</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(course.id)} className="flex items-center gap-1.5 text-[11px] text-[#f87171]">
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
