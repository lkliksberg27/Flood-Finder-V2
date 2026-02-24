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
} from "lucide-react";
import AddressInput from "@/components/AddressInput";
import { Course, RouteData, loadCourses, saveCourses, generateId } from "@/lib/routes-store";
import { fetchRoutes, checkFloodingOnRoute } from "@/lib/geo-utils";
import { useSettings } from "@/lib/settings-context";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0a0e1a]">
      <Loader2 size={24} className="animate-spin text-[#3b82f6]" />
    </div>
  ),
});

const ROUTE_LABELS = ["Fastest", "Alternative 1", "Alternative 2"];

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

  // Form state
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

  useEffect(() => {
    setCourses(loadCourses());
  }, []);

  const save = useCallback((updated: Course[]) => {
    setCourses(updated);
    saveCourses(updated);
  }, []);

  const resetForm = () => {
    setFormName("");
    setStartAddress("");
    setStartLat(0);
    setStartLng(0);
    setEndAddress("");
    setEndLat(0);
    setEndLng(0);
    setShowForm(false);
  };

  const buildRouteData = (
    rawRoutes: { geometry: [number, number][]; distance: number; duration: number }[]
  ): RouteData[] => {
    return rawRoutes.map((r, i) => {
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
  };

  const handleGenerate = async () => {
    if (!startAddress || !endAddress || !formName) return;
    setLoading(true);
    try {
      const [rawAtoB, rawBtoA] = await Promise.all([
        fetchRoutes(startLat, startLng, endLat, endLng),
        fetchRoutes(endLat, endLng, startLat, startLng),
      ]);

      const newCourse: Course = {
        id: generateId(),
        name: formName,
        startAddress,
        startLat,
        startLng,
        endAddress,
        endLat,
        endLng,
        routesAtoB: buildRouteData(rawAtoB),
        routesBtoA: buildRouteData(rawBtoA),
        schedule: {
          mode: "always",
          days: [true, true, true, true, true, false, false],
          startTime: "07:00",
          endTime: "09:00",
        },
      };

      save([...courses, newCourse]);
      resetForm();
    } catch {
      alert("Failed to generate routes. Check addresses and try again.");
    }
    setLoading(false);
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
    setDirections((prev) => ({
      ...prev,
      [id]: prev[id] === "BtoA" ? "AtoB" : "BtoA",
    }));
    if (selectedRoute?.courseId === id) setSelectedRoute(null);
  };

  const getDisplayRoutes = (course: Course) =>
    getDirection(course.id) === "AtoB" ? course.routesAtoB : course.routesBtoA;

  const getCourseStatus = (course: Course) => {
    const all = [...course.routesAtoB, ...course.routesBtoA];
    const hasFlooding = all.some((r) => r.hasFlooding);
    const hasSevere = all.some((r) => r.floodLevel === "severe");
    return { hasFlooding, level: hasSevere ? "severe" : hasFlooding ? "moderate" : "clear" };
  };

  // Map data
  const mapRoutes: RouteData[] = expanded
    ? (() => {
        const course = courses.find((c) => c.id === expanded);
        if (!course) return [];
        if (selectedRoute?.courseId === expanded) {
          return selectedRoute.direction === "AtoB" ? course.routesAtoB : course.routesBtoA;
        }
        return getDisplayRoutes(course);
      })()
    : [];

  const mapSelectedIndex = selectedRoute?.courseId === expanded ? selectedRoute.index : null;

  // Banner
  const getBanner = () => {
    if (!selectedRoute) return null;
    const course = courses.find((c) => c.id === selectedRoute.courseId);
    if (!course) return null;
    const routes =
      selectedRoute.direction === "AtoB" ? course.routesAtoB : course.routesBtoA;
    const route = routes[selectedRoute.index];
    if (!route) return null;

    if (route.floodLevel === "severe")
      return {
        cls: "bg-[#f87171]/15 border-[#f87171]/30",
        text: `Avoid — ${route.nearbySensors.length} sensor${route.nearbySensors.length > 1 ? "s" : ""} flooding`,
        color: "text-[#f87171]",
        icon: <AlertTriangle size={14} className="text-[#f87171]" />,
      };
    if (route.floodLevel === "moderate")
      return {
        cls: "bg-[#fbbf24]/15 border-[#fbbf24]/30",
        text: `Moderate risk — ${route.nearbySensors.length} nearby`,
        color: "text-[#fbbf24]",
        icon: <AlertTriangle size={14} className="text-[#fbbf24]" />,
      };
    return {
      cls: "bg-[#34d399]/15 border-[#34d399]/30",
      text: "Route is clear",
      color: "text-[#34d399]",
      icon: <CheckCircle2 size={14} className="text-[#34d399]" />,
    };
  };

  const banner = getBanner();

  return (
    <div className="flex flex-col bg-[#0a0e1a]" style={{ height: "calc(100dvh - 72px)" }}>
      {/* Map */}
      <div className="relative h-[38%] shrink-0">
        <RouteMap routes={mapRoutes} selectedIndex={mapSelectedIndex} />
        {banner && (
          <div
            className={`absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-xl ${banner.cls}`}
          >
            {banner.icon}
            <span className={`text-[11px] font-medium ${banner.color}`}>{banner.text}</span>
          </div>
        )}
      </div>

      {/* Course list */}
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

        {/* Form */}
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
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Navigation size={15} />
                    Generate
                  </>
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

        {/* Empty */}
        {courses.length === 0 && !showForm && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3b82f6]/15">
              <Navigation size={24} className="text-[#3b82f6]" />
            </div>
            <p className="text-sm font-semibold text-[#f1f5f9]">No routes yet</p>
            <p className="text-xs text-[#94a3b8]">Tap + Add to create your first route</p>
          </div>
        )}

        {/* Cards */}
        {courses.map((course, ci) => {
          const isExpanded = expanded === course.id;
          const status = getCourseStatus(course);
          const dir = getDirection(course.id);
          const displayRoutes = getDisplayRoutes(course);

          return (
            <div
              key={course.id}
              className="animate-fade-in-up mb-2.5 rounded-2xl border border-[#1e293b] bg-[#111827]"
              style={{ animationDelay: `${ci * 0.05}s` }}
            >
              <button
                onClick={() => {
                  setExpanded(isExpanded ? null : course.id);
                  setSelectedRoute(null);
                }}
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
                        <button onClick={() => renameCourse(course.id)}>
                          <Check size={12} className="text-[#34d399]" />
                        </button>
                        <button onClick={() => setEditingName(null)}>
                          <X size={12} className="text-[#64748b]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-[#f1f5f9]">{course.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingName(course.id);
                            setEditNameValue(course.name);
                          }}
                        >
                          <Pencil size={11} className="text-[#64748b]" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#64748b] truncate">
                    {course.startAddress.split(",")[0]} → {course.endAddress.split(",")[0]}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    status.level === "clear"
                      ? "bg-[#34d399]/15 text-[#34d399]"
                      : status.level === "severe"
                      ? "bg-[#f87171]/15 text-[#f87171]"
                      : "bg-[#fbbf24]/15 text-[#fbbf24]"
                  }`}
                >
                  {status.level === "clear" ? "Clear ✓" : "Flood ⚠"}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-[#64748b]" />
                ) : (
                  <ChevronRight size={16} className="text-[#64748b]" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-[#1e293b] px-3.5 pb-3.5 pt-3">
                  {/* Direction toggle */}
                  <div className="mb-3 flex gap-2">
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
                      onClick={() => {
                        if (dir !== "BtoA") toggleDirection(course.id);
                      }}
                      className="press-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0a0e1a]"
                    >
                      <ArrowRightLeft size={14} className="text-[#94a3b8]" />
                    </button>
                  </div>

                  {/* Route options */}
                  <div className="space-y-1.5">
                    {displayRoutes.map((route, ri) => {
                      const isSelected =
                        selectedRoute?.courseId === course.id &&
                        selectedRoute?.direction === dir &&
                        selectedRoute?.index === ri;
                      const miles = (route.distance / 1609.34).toFixed(1);
                      const mins = Math.round(route.duration / 60);

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
                          <div className="flex-1">
                            <span className="text-[11px] font-semibold text-[#f1f5f9]">
                              {route.label}
                            </span>
                            <p className="text-[10px] text-[#64748b]">
                              {miles} mi &middot; {mins} min
                            </p>
                          </div>
                          {route.hasFlooding ? (
                            <span
                              className={`text-[9px] font-semibold ${
                                route.floodLevel === "severe" ? "text-[#f87171]" : "text-[#fbbf24]"
                              }`}
                            >
                              {route.nearbySensors.length} alert{route.nearbySensors.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-[#34d399]">Safe ✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Delete */}
                  <div className="mt-3">
                    {deleteConfirm === course.id ? (
                      <div className="flex items-center gap-2 rounded-xl bg-[#f87171]/10 p-2.5">
                        <span className="flex-1 text-[11px] text-[#f87171]">Delete?</span>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2.5 py-1 text-[11px] text-[#94a3b8]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="rounded-lg bg-[#f87171] px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(course.id)}
                        className="flex items-center gap-1.5 text-[11px] text-[#f87171]"
                      >
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
