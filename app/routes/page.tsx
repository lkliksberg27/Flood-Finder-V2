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
  ArrowLeftRight,
  Clock,
  Zap,
} from "lucide-react";
import AddressInput from "@/components/AddressInput";
import { Course, RouteData, loadCourses, saveCourses, generateId } from "@/lib/routes-store";
import { fetchRoutes, checkFloodingOnRoute } from "@/lib/geo-utils";
import { useSettings } from "@/lib/settings-context";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-bg-primary">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  ),
});

const ROUTE_LABELS = ["Fastest", "Alternative 1", "Alternative 2"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  // Editing name
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
      alert("Failed to generate routes. Please check addresses and try again.");
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

  const updateSchedule = (id: string, patch: Partial<Course["schedule"]>) => {
    save(
      courses.map((c) =>
        c.id === id ? { ...c, schedule: { ...c.schedule, ...patch } } : c
      )
    );
  };

  const getDirection = (courseId: string) => directions[courseId] || "AtoB";
  const toggleDirection = (courseId: string) => {
    setDirections((prev) => ({
      ...prev,
      [courseId]: prev[courseId] === "BtoA" ? "AtoB" : "BtoA",
    }));
    if (selectedRoute?.courseId === courseId) {
      setSelectedRoute(null);
    }
  };

  const getDisplayRoutes = (course: Course): RouteData[] => {
    return getDirection(course.id) === "AtoB" ? course.routesAtoB : course.routesBtoA;
  };

  const getCourseStatus = (course: Course): { hasFlooding: boolean; level: string } => {
    const allRoutes = [...course.routesAtoB, ...course.routesBtoA];
    const hasFlooding = allRoutes.some((r) => r.hasFlooding);
    const hasSevere = allRoutes.some((r) => r.floodLevel === "severe");
    return {
      hasFlooding,
      level: hasSevere ? "severe" : hasFlooding ? "moderate" : "clear",
    };
  };

  // Determine which routes to show on map
  const mapRoutes: RouteData[] =
    selectedRoute && expanded
      ? (() => {
          const course = courses.find((c) => c.id === selectedRoute.courseId);
          if (!course) return [];
          return selectedRoute.direction === "AtoB"
            ? course.routesAtoB
            : course.routesBtoA;
        })()
      : expanded
      ? (() => {
          const course = courses.find((c) => c.id === expanded);
          if (!course) return [];
          return getDisplayRoutes(course);
        })()
      : [];

  const mapSelectedIndex = selectedRoute ? selectedRoute.index : null;

  // Map banner
  const getBanner = () => {
    if (!selectedRoute) return null;
    const course = courses.find((c) => c.id === selectedRoute.courseId);
    if (!course) return null;
    const routes =
      selectedRoute.direction === "AtoB" ? course.routesAtoB : course.routesBtoA;
    const route = routes[selectedRoute.index];
    if (!route) return null;

    if (route.floodLevel === "severe") {
      return {
        color: "bg-danger/20 border-danger/30",
        textColor: "text-danger",
        icon: <AlertTriangle size={16} className="text-danger" />,
        text: `Avoid this route — ${route.nearbySensors.length} sensor${route.nearbySensors.length > 1 ? "s" : ""} detecting flooding`,
      };
    }
    if (route.floodLevel === "moderate") {
      return {
        color: "bg-warn/20 border-warn/30",
        textColor: "text-warn",
        icon: <Zap size={16} className="text-warn" />,
        text: `Moderate risk — ${route.nearbySensors.length} sensor${route.nearbySensors.length > 1 ? "s" : ""} nearby`,
      };
    }
    return {
      color: "bg-safe/20 border-safe/30",
      textColor: "text-safe",
      icon: <CheckCircle2 size={16} className="text-safe" />,
      text: "Route is clear — no flooding detected",
    };
  };

  const banner = getBanner();

  return (
    <div className="flex h-[100dvh] flex-col bg-bg-primary">
      {/* Map section */}
      <div className="relative h-[40%] shrink-0">
        <RouteMap routes={mapRoutes} selectedIndex={mapSelectedIndex} />
        {banner && (
          <div
            className={`absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-2 rounded-xl border px-4 py-2.5 backdrop-blur-xl ${banner.color}`}
          >
            {banner.icon}
            <span className={`text-xs font-medium ${banner.textColor}`}>{banner.text}</span>
          </div>
        )}
      </div>

      {/* Course list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">Routes</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="press-scale flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Set Course
          </button>
        </div>

        {/* Add course form */}
        {showForm && (
          <div className="animate-fade-in-up mb-4 rounded-2xl border border-border-card bg-bg-card p-4">
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Course Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Morning Commute"
                className="w-full rounded-xl border border-border-card bg-bg-primary px-3 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent"
              />
            </div>
            <AddressInput
              label="Start"
              value={startAddress}
              onChange={(addr, lat, lng) => {
                setStartAddress(addr);
                setStartLat(lat);
                setStartLng(lng);
              }}
              placeholder="Starting address..."
            />
            <div className="mt-3">
              <AddressInput
                label="End"
                value={endAddress}
                onChange={(addr, lat, lng) => {
                  setEndAddress(addr);
                  setEndLat(lat);
                  setEndLng(lng);
                }}
                placeholder="Destination address..."
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading || !formName || !startAddress || !endAddress}
                className="press-scale flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Navigation size={16} />
                    Generate Routes
                  </>
                )}
              </button>
              <button
                onClick={resetForm}
                className="press-scale rounded-xl border border-border-card px-4 py-3 text-sm text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && !showForm && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
              <Navigation size={28} className="text-accent" />
            </div>
            <div>
              <p className="text-base font-semibold text-text-primary">No courses yet</p>
              <p className="mt-1 text-sm text-text-secondary">
                Tap Set Course to add your first route
              </p>
            </div>
          </div>
        )}

        {/* Course cards */}
        {courses.map((course, ci) => {
          const isExpanded = expanded === course.id;
          const status = getCourseStatus(course);
          const dir = getDirection(course.id);
          const displayRoutes = getDisplayRoutes(course);

          return (
            <div
              key={course.id}
              className="animate-fade-in-up mb-3 rounded-2xl border border-border-card bg-bg-card"
              style={{ animationDelay: `${ci * 0.05}s` }}
            >
              {/* Course header */}
              <button
                onClick={() => {
                  setExpanded(isExpanded ? null : course.id);
                  setSelectedRoute(null);
                }}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {editingName === course.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="w-32 rounded bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameCourse(course.id);
                            if (e.key === "Escape") setEditingName(null);
                          }}
                        />
                        <button onClick={() => renameCourse(course.id)}>
                          <Check size={14} className="text-safe" />
                        </button>
                        <button onClick={() => setEditingName(null)}>
                          <X size={14} className="text-text-muted" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-text-primary">
                          {course.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingName(course.id);
                            setEditNameValue(course.name);
                          }}
                        >
                          <Pencil size={12} className="text-text-muted" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-text-muted line-clamp-1">
                    {course.startAddress.split(",")[0]} →{" "}
                    {course.endAddress.split(",")[0]}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    status.level === "clear"
                      ? "bg-safe/15 text-safe"
                      : status.level === "severe"
                      ? "bg-danger/15 text-danger"
                      : "bg-warn/15 text-warn"
                  }`}
                >
                  {status.level === "clear" ? "Clear ✓" : "Flooding Detected"}
                </span>
                {isExpanded ? (
                  <ChevronDown size={18} className="text-text-muted" />
                ) : (
                  <ChevronRight size={18} className="text-text-muted" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border-card px-4 pb-4 pt-3">
                  {/* Direction toggle */}
                  <div className="mb-3 flex gap-2">
                    <button
                      onClick={() => dir !== "AtoB" && toggleDirection(course.id)}
                      className={`press-scale flex-1 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                        dir === "AtoB"
                          ? "bg-accent text-white"
                          : "bg-bg-primary text-text-secondary"
                      }`}
                    >
                      <span className="line-clamp-1">
                        {course.startAddress.split(",")[0]} → {course.endAddress.split(",")[0]}
                      </span>
                    </button>
                    <button
                      onClick={() => dir !== "BtoA" && toggleDirection(course.id)}
                      className={`press-scale flex-1 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                        dir === "BtoA"
                          ? "bg-accent text-white"
                          : "bg-bg-primary text-text-secondary"
                      }`}
                    >
                      <span className="line-clamp-1">
                        {course.endAddress.split(",")[0]} → {course.startAddress.split(",")[0]}
                      </span>
                    </button>
                  </div>

                  {/* Route options */}
                  <div className="space-y-2">
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
                              isSelected
                                ? null
                                : { courseId: course.id, direction: dir, index: ri }
                            )
                          }
                          className={`press-scale flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                            isSelected
                              ? "border-accent bg-accent/10"
                              : "border-border-card bg-bg-primary"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-text-primary">
                              {route.label}
                            </div>
                            <div className="mt-1 text-xs text-text-muted">
                              {miles} mi &middot; {mins} min
                            </div>
                          </div>
                          {route.hasFlooding ? (
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle
                                size={14}
                                className={
                                  route.floodLevel === "severe"
                                    ? "text-danger"
                                    : "text-warn"
                                }
                              />
                              <span
                                className={`text-[10px] font-semibold ${
                                  route.floodLevel === "severe"
                                    ? "text-danger"
                                    : "text-warn"
                                }`}
                              >
                                {route.nearbySensors.length} alert
                                {route.nearbySensors.length > 1 ? "s" : ""} nearby
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-safe" />
                              <span className="text-[10px] font-semibold text-safe">
                                Recommended
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Schedule section */}
                  <div className="mt-4 rounded-xl border border-border-card bg-bg-primary p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                      <Clock size={14} className="text-schedule" />
                      Schedule
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => updateSchedule(course.id, { mode: "always" })}
                        className={`press-scale rounded-lg px-3 py-1.5 text-xs font-medium ${
                          course.schedule.mode === "always"
                            ? "bg-schedule/20 text-schedule"
                            : "text-text-muted"
                        }`}
                      >
                        Always Active
                      </button>
                      <button
                        onClick={() => updateSchedule(course.id, { mode: "scheduled" })}
                        className={`press-scale rounded-lg px-3 py-1.5 text-xs font-medium ${
                          course.schedule.mode === "scheduled"
                            ? "bg-schedule/20 text-schedule"
                            : "text-text-muted"
                        }`}
                      >
                        Set Times
                      </button>
                    </div>
                    {course.schedule.mode === "scheduled" && (
                      <div className="mt-3">
                        <div className="flex gap-1">
                          {DAY_LABELS.map((day, di) => (
                            <button
                              key={day}
                              onClick={() => {
                                const days = [...course.schedule.days];
                                days[di] = !days[di];
                                updateSchedule(course.id, { days });
                              }}
                              className={`press-scale flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold ${
                                course.schedule.days[di]
                                  ? "bg-schedule/20 text-schedule"
                                  : "bg-bg-card text-text-muted"
                              }`}
                            >
                              {day[0]}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="time"
                            value={course.schedule.startTime}
                            onChange={(e) =>
                              updateSchedule(course.id, { startTime: e.target.value })
                            }
                            className="rounded-lg border border-border-card bg-bg-card px-2 py-1.5 text-xs text-text-primary outline-none"
                          />
                          <span className="text-xs text-text-muted">to</span>
                          <input
                            type="time"
                            value={course.schedule.endTime}
                            onChange={(e) =>
                              updateSchedule(course.id, { endTime: e.target.value })
                            }
                            className="rounded-lg border border-border-card bg-bg-card px-2 py-1.5 text-xs text-text-primary outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <div className="mt-4">
                    {deleteConfirm === course.id ? (
                      <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-3">
                        <span className="flex-1 text-xs text-danger">Delete this course?</span>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="press-scale rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="press-scale rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(course.id)}
                        className="press-scale flex items-center gap-2 text-xs text-danger"
                      >
                        <Trash2 size={14} />
                        Delete Course
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
