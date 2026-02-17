"use client";

import { useState, useEffect } from "react";
import { useDevices } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { FloodMap } from "@/components/map/flood-map";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Navigation,
  AlertTriangle,
  MapPin,
  Plus,
  Trash2,
  Route,
  Shield,
  Clock,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Device, FloodStatus, STATUS_CONFIG } from "@/types";

interface SavedRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  // simplified waypoints as lat/lng
  waypoints: [number, number][];
}

// Pre-built example routes around Aventura
const EXAMPLE_ROUTES: SavedRoute[] = [
  {
    id: "route-1",
    name: "Home to School",
    from: "Home",
    to: "School",
    waypoints: [
      [25.957, -80.139],
      [25.958, -80.137],
      [25.960, -80.135],
      [25.962, -80.134],
      [25.964, -80.133],
    ],
  },
  {
    id: "route-2",
    name: "Home to Work",
    from: "Home",
    to: "Office",
    waypoints: [
      [25.957, -80.139],
      [25.956, -80.141],
      [25.954, -80.143],
      [25.953, -80.145],
      [25.951, -80.147],
    ],
  },
  {
    id: "route-3",
    name: "Morning Run",
    from: "Park Entrance",
    to: "Park Loop",
    waypoints: [
      [25.959, -80.132],
      [25.961, -80.130],
      [25.963, -80.131],
      [25.964, -80.134],
      [25.962, -80.136],
      [25.959, -80.134],
      [25.959, -80.132],
    ],
  },
];

function getRouteFloodStatus(
  route: SavedRoute,
  devices: Device[],
  radiusDeg: number = 0.003 // ~300m
): { safe: boolean; nearbyAlerts: Device[] } {
  const nearbyAlerts: Device[] = [];
  for (const device of devices) {
    if (device.status === "OK") continue;
    for (const [lat, lng] of route.waypoints) {
      const dist = Math.sqrt(
        Math.pow(device.lat - lat, 2) + Math.pow(device.lng - lng, 2)
      );
      if (dist < radiusDeg) {
        nearbyAlerts.push(device);
        break;
      }
    }
  }
  return { safe: nearbyAlerts.length === 0, nearbyAlerts };
}

export default function RoutesPage() {
  const { devices, loading } = useDevices();
  const [routes, setRoutes] = useState<SavedRoute[]>(EXAMPLE_ROUTES);
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

  // Check all routes for flood proximity
  const routeStatuses = routes.map((r) => ({
    route: r,
    ...getRouteFloodStatus(r, devices),
  }));

  const unsafeRoutes = routeStatuses.filter((r) => !r.safe);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  function addRoute() {
    if (!newRouteName.trim()) return;
    const newRoute: SavedRoute = {
      id: `route-${Date.now()}`,
      name: newRouteName,
      from: newFrom || "Start",
      to: newTo || "End",
      waypoints: [
        [25.957 + Math.random() * 0.01, -80.139 + Math.random() * 0.01],
        [25.960 + Math.random() * 0.01, -80.135 + Math.random() * 0.01],
        [25.963 + Math.random() * 0.01, -80.133 + Math.random() * 0.01],
      ],
    };
    setRoutes([...routes, newRoute]);
    setNewRouteName("");
    setNewFrom("");
    setNewTo("");
    setShowAddForm(false);
  }

  function deleteRoute(id: string) {
    setRoutes(routes.filter((r) => r.id !== id));
    if (selectedRoute === id) setSelectedRoute(null);
  }

  return (
    <AppShell>
      <div className="relative h-full">
        {/* Map */}
        <FloodMap
          devices={devices}
          initialZoom={14}
          routePoints={activeRoute?.waypoints}
          routeColor={
            activeRouteStatus?.safe ? "#22c55e" : "#ef4444"
          }
        />

        {/* Top banner — warning if selected route has floods */}
        {activeRoute && activeRouteStatus && !activeRouteStatus.safe && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <div className="card p-3 bg-red-500/15 border-red-500/30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-300">
                    Flooding on "{activeRoute.name}"
                  </p>
                  <p className="text-xs text-red-400/80 mt-0.5">
                    {activeRouteStatus.nearbyAlerts.length} flood sensor{activeRouteStatus.nearbyAlerts.length > 1 ? "s" : ""} detected near this route. Consider an alternate path.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeRoute && activeRouteStatus?.safe && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <div className="card p-3 bg-green-500/10 border-green-500/30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-300">
                    "{activeRoute.name}" is clear
                  </p>
                  <p className="text-xs text-green-400/80 mt-0.5">
                    No flooding detected along this route
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom panel */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-10 transition-all duration-300",
            panelOpen ? "max-h-[55vh]" : "max-h-14"
          )}
        >
          <div className="card rounded-b-none backdrop-blur-md bg-surface-1/95 overflow-hidden h-full flex flex-col">
            {/* Toggle */}
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            >
              {panelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              {panelOpen ? "Close" : `${routes.length} saved routes`}
            </button>

            {panelOpen && (
              <div className="flex-1 overflow-y-auto px-4 pb-20">
                {/* Unsafety summary */}
                {unsafeRoutes.length > 0 && (
                  <div className="bg-red-500/10 rounded-xl p-3 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">
                      <span className="font-semibold">{unsafeRoutes.length}</span> of your routes {unsafeRoutes.length === 1 ? "has" : "have"} flooding nearby
                    </p>
                  </div>
                )}

                {/* Routes list */}
                <div className="space-y-2 mb-4">
                  {routes.map((route) => {
                    const status = getRouteFloodStatus(route, devices);
                    const isSelected = selectedRoute === route.id;
                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRoute(isSelected ? null : route.id)}
                        className={cn(
                          "card p-3.5 cursor-pointer transition-all",
                          isSelected
                            ? status.safe
                              ? "ring-1 ring-green-500/40 bg-green-500/5"
                              : "ring-1 ring-red-500/40 bg-red-500/5"
                            : "hover:bg-surface-2/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              status.safe ? "bg-green-500/15" : "bg-red-500/15"
                            )}>
                              <Route className={cn(
                                "w-4 h-4",
                                status.safe ? "text-green-400" : "text-red-400"
                              )} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-100">{route.name}</p>
                              <p className="text-[11px] text-gray-500">
                                {route.from} → {route.to}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!status.safe && (
                              <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                                {status.nearbyAlerts.length} alert{status.nearbyAlerts.length > 1 ? "s" : ""}
                              </span>
                            )}
                            {status.safe && (
                              <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                                Clear
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }}
                              className="p-1.5 rounded-lg hover:bg-surface-3/50 text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded: show alerts near route */}
                        {isSelected && !status.safe && (
                          <div className="mt-3 pt-3 border-t border-surface-3/30 space-y-2">
                            {status.nearbyAlerts.map((d) => (
                              <div key={d.deviceId} className="flex items-center gap-2 text-xs">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: STATUS_CONFIG[d.status].mapColor }}
                                />
                                <span className="text-gray-300">{d.name}</span>
                                <span className="text-gray-500">—</span>
                                <span className={cn(
                                  "font-medium",
                                  d.status === "ALERT" ? "text-red-400" : "text-amber-400"
                                )}>
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

                {/* Add route form */}
                {showAddForm ? (
                  <div className="card p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">New Route</p>
                      <button onClick={() => setShowAddForm(false)} className="text-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <input
                        placeholder="Route name (e.g. Home to Gym)"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        className="w-full bg-surface-2 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="From"
                          value={newFrom}
                          onChange={(e) => setNewFrom(e.target.value)}
                          className="bg-surface-2 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                        <input
                          placeholder="To"
                          value={newTo}
                          onChange={(e) => setNewTo(e.target.value)}
                          className="bg-surface-2 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                      </div>
                      <button
                        onClick={addRoute}
                        className="w-full bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-600 transition-colors"
                      >
                        Save Route
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full card p-3 flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-500/5 transition-colors mb-4"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Route</span>
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
