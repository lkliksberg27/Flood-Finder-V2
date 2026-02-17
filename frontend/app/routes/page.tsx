"use client";

import { useState, useEffect } from "react";
import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { FloodMap } from "@/components/map/flood-map";
import {
  Navigation,
  AlertTriangle,
  Plus,
  Trash2,
  Route,
  Shield,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Star,
  Clock,
  MapPin,
  ArrowRight,
  Edit3,
  Save,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";

interface SavedRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  waypoints: [number, number][];
  isFavorite: boolean;
  lastChecked?: string;
}

const DEFAULT_ROUTES: SavedRoute[] = [
  {
    id: "route-1",
    name: "Home → School",
    from: "Home",
    to: "Aventura School",
    isFavorite: true,
    waypoints: [
      [25.957, -80.139],
      [25.9575, -80.1375],
      [25.958, -80.136],
      [25.9588, -80.1348],
      [25.960, -80.1338],
      [25.9612, -80.1335],
      [25.962, -80.1332],
      [25.9635, -80.133],
    ],
  },
  {
    id: "route-2",
    name: "Home → Aventura Mall",
    from: "Home",
    to: "Aventura Mall",
    isFavorite: true,
    waypoints: [
      [25.957, -80.139],
      [25.956, -80.1395],
      [25.9548, -80.1405],
      [25.9535, -80.1418],
      [25.9525, -80.143],
      [25.9518, -80.1445],
      [25.9512, -80.146],
      [25.9508, -80.1475],
    ],
  },
  {
    id: "route-3",
    name: "Morning Jog",
    from: "Founders Park",
    to: "Founders Park (loop)",
    isFavorite: false,
    waypoints: [
      [25.959, -80.132],
      [25.9605, -80.1305],
      [25.962, -80.1308],
      [25.9635, -80.132],
      [25.9638, -80.1342],
      [25.9625, -80.1355],
      [25.961, -80.135],
      [25.9598, -80.1335],
      [25.959, -80.132],
    ],
  },
];

function getRouteFloodStatus(
  route: SavedRoute,
  devices: Device[],
  radiusDeg: number = 0.003
): { safe: boolean; nearbyAlerts: Device[]; severity: string } {
  const nearbyAlerts: Device[] = [];
  for (const device of devices) {
    if (device.status === "OK") continue;
    for (const [lat, lng] of route.waypoints) {
      const dist = Math.sqrt(
        Math.pow(device.lat - lat, 2) + Math.pow(device.lng - lng, 2)
      );
      if (dist < radiusDeg) {
        if (!nearbyAlerts.find((d) => d.deviceId === device.deviceId)) {
          nearbyAlerts.push(device);
        }
        break;
      }
    }
  }

  const hasSevere = nearbyAlerts.some((d) => d.status === "ALERT");
  const severity = hasSevere ? "Severe" : nearbyAlerts.length > 0 ? "Moderate" : "Clear";

  return { safe: nearbyAlerts.length === 0, nearbyAlerts, severity };
}

export default function RoutesPage() {
  const { devices, loading } = useDevices();
  const [routes, setRoutes] = useState<SavedRoute[]>(DEFAULT_ROUTES);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);

  const activeRoute = routes.find((r) => r.id === selectedRoute);
  const activeRouteStatus = activeRoute
    ? getRouteFloodStatus(activeRoute, devices)
    : null;

  const unsafeCount = routes.filter(
    (r) => !getRouteFloodStatus(r, devices).safe
  ).length;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  function toggleFavorite(id: string) {
    setRoutes(
      routes.map((r) =>
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
  }

  function addRoute() {
    if (!newRouteName.trim()) return;
    const newRoute: SavedRoute = {
      id: `route-${Date.now()}`,
      name: newRouteName,
      from: newFrom || "Start",
      to: newTo || "End",
      isFavorite: false,
      waypoints: [
        [25.957 + Math.random() * 0.008, -80.139 + Math.random() * 0.008],
        [25.958 + Math.random() * 0.005, -80.137 + Math.random() * 0.005],
        [25.960 + Math.random() * 0.005, -80.135 + Math.random() * 0.005],
        [25.962 + Math.random() * 0.003, -80.134 + Math.random() * 0.003],
      ],
    };
    setRoutes([...routes, newRoute]);
    setNewRouteName("");
    setNewFrom("");
    setNewTo("");
    setShowAddForm(false);
    setSelectedRoute(newRoute.id);
  }

  function deleteRoute(id: string) {
    setRoutes(routes.filter((r) => r.id !== id));
    if (selectedRoute === id) setSelectedRoute(null);
  }

  // Sort: favorites first, then alphabetical
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <AppShell>
      <div className="relative h-full">
        {/* Map */}
        <FloodMap
          devices={devices}
          initialZoom={15}
          routePoints={activeRoute?.waypoints}
          routeColor={
            activeRouteStatus?.safe
              ? "#4285f4"
              : activeRouteStatus?.severity === "Severe"
              ? "#ef4444"
              : "#f59e0b"
          }
        />

        {/* Top banner */}
        {activeRoute && activeRouteStatus && !activeRouteStatus.safe && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <div
              className={cn(
                "rounded-xl p-3.5 backdrop-blur-md shadow-lg",
                activeRouteStatus.severity === "Severe"
                  ? "bg-red-600/90 border border-red-500/50"
                  : "bg-amber-500/90 border border-amber-400/50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">
                    {activeRouteStatus.severity === "Severe" ? "⚠️ Severe" : "⚡ Moderate"} flooding on route
                  </p>
                  <p className="text-xs text-white/80 mt-0.5">
                    {activeRouteStatus.nearbyAlerts.length} sensor{activeRouteStatus.nearbyAlerts.length > 1 ? "s" : ""} detecting flooding nearby — consider alternate route
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeRoute && activeRouteStatus?.safe && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <div className="bg-green-600/90 backdrop-blur-md rounded-xl p-3.5 shadow-lg border border-green-500/50">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-white shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">✓ Route is clear</p>
                  <p className="text-xs text-white/80 mt-0.5">No flooding detected along "{activeRoute.name}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom panel */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-10 transition-all duration-300",
            panelOpen ? "max-h-[60vh]" : "max-h-14"
          )}
        >
          <div className="card rounded-b-none backdrop-blur-md bg-surface-1/95 overflow-hidden h-full flex flex-col shadow-2xl">
            <button
              onClick={() => { setPanelOpen(!panelOpen); hapticLight(); }}
              className="flex items-center justify-between px-5 py-3 shrink-0"
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-gray-200">
                  My Routes
                </span>
                {unsafeCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unsafeCount} affected
                  </span>
                )}
              </div>
              {panelOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {panelOpen && (
              <div className="flex-1 overflow-y-auto px-4 pb-20">
                {/* Routes */}
                <div className="space-y-2.5 mb-4">
                  {sortedRoutes.map((route) => {
                    const status = getRouteFloodStatus(route, devices);
                    const isSelected = selectedRoute === route.id;
                    return (
                      <div
                        key={route.id}
                        onClick={() =>
                          setSelectedRoute(isSelected ? null : route.id)
                        }
                        className={cn(
                          "rounded-xl p-4 cursor-pointer transition-all border",
                          isSelected
                            ? status.safe
                              ? "bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20"
                              : "bg-red-500/5 border-red-500/30 ring-1 ring-red-500/20"
                            : "bg-surface-2/40 border-surface-3/30 hover:bg-surface-2/60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Route icon */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              status.safe
                                ? "bg-green-500/15"
                                : status.severity === "Severe"
                                ? "bg-red-500/15"
                                : "bg-amber-500/15"
                            )}
                          >
                            <Route
                              className={cn(
                                "w-5 h-5",
                                status.safe
                                  ? "text-green-400"
                                  : status.severity === "Severe"
                                  ? "text-red-400"
                                  : "text-amber-400"
                              )}
                            />
                          </div>

                          {/* Route info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-100 truncate">
                                {route.name}
                              </p>
                              {route.isFavorite && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span>{route.from}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span>{route.to}</span>
                            </div>
                          </div>

                          {/* Status + actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!status.safe ? (
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2.5 py-1 rounded-full",
                                  status.severity === "Severe"
                                    ? "bg-red-500/15 text-red-400"
                                    : "bg-amber-500/15 text-amber-400"
                                )}
                              >
                                {status.nearbyAlerts.length} alert{status.nearbyAlerts.length > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                                Clear ✓
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(route.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-3/50 text-gray-600 hover:text-amber-400 transition-colors"
                            >
                              <Star
                                className={cn(
                                  "w-3.5 h-3.5",
                                  route.isFavorite && "text-amber-400 fill-amber-400"
                                )}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRoute(route.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-3/50 text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded: nearby alerts */}
                        {isSelected && !status.safe && (
                          <div className="mt-3 pt-3 border-t border-surface-3/30 space-y-2">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                              Flooding near route
                            </p>
                            {status.nearbyAlerts.map((d) => (
                              <div
                                key={d.deviceId}
                                className="flex items-center gap-2.5 text-xs bg-surface-2/40 rounded-lg p-2.5"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      STATUS_CONFIG[d.status].mapColor,
                                  }}
                                />
                                <span className="text-gray-300 flex-1">
                                  {d.name}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono font-semibold",
                                    d.status === "ALERT"
                                      ? "text-red-400"
                                      : "text-amber-400"
                                  )}
                                >
                                  {d.waterLevelCm.toFixed(0)} cm
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add route */}
                {showAddForm ? (
                  <div className="rounded-xl bg-surface-2/60 border border-surface-3/30 p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-200">
                        Add New Route
                      </p>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <input
                        placeholder="Route name (e.g. Home → Gym)"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        className="w-full bg-surface-1 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 border border-surface-3/30"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="From"
                          value={newFrom}
                          onChange={(e) => setNewFrom(e.target.value)}
                          className="bg-surface-1 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 border border-surface-3/30"
                        />
                        <input
                          placeholder="To"
                          value={newTo}
                          onChange={(e) => setNewTo(e.target.value)}
                          className="bg-surface-1 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 border border-surface-3/30"
                        />
                      </div>
                      <button
                        onClick={() => { addRoute(); hapticSuccess(); }}
                        disabled={!newRouteName.trim()}
                        className="w-full bg-blue-500 text-white rounded-xl py-3 active:scale-[0.98] text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Route
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAddForm(true); hapticLight(); }}
                    className="w-full rounded-xl border-2 border-dashed active:scale-[0.98] transition-transform border-surface-3/50 p-3.5 flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all mb-4"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add New Route</span>
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
