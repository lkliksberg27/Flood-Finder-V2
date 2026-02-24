"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Cross, Shield, Flame, Navigation, Loader2 } from "lucide-react";

const SOSMap = dynamic(() => import("@/components/SOSMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0a0e1a]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f87171] border-t-transparent" />
    </div>
  ),
});

type ServiceType = "hospital" | "police" | "fire";

const SERVICES: {
  type: ServiceType;
  label: string;
  icon: typeof Cross;
  color: string;
  bg: string;
  border: string;
  query: string;
}[] = [
  {
    type: "hospital",
    label: "Hospital",
    icon: Cross,
    color: "text-[#f87171]",
    bg: "bg-[#f87171]/15",
    border: "border-[#f87171]/30",
    query: "hospital",
  },
  {
    type: "police",
    label: "Police",
    icon: Shield,
    color: "text-[#3b82f6]",
    bg: "bg-[#3b82f6]/15",
    border: "border-[#3b82f6]/30",
    query: "police station",
  },
  {
    type: "fire",
    label: "Fire Dept",
    icon: Flame,
    color: "text-[#fbbf24]",
    bg: "bg-[#fbbf24]/15",
    border: "border-[#fbbf24]/30",
    query: "fire station",
  },
];

export default function SOSPage() {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selected, setSelected] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [destName, setDestName] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {
          // Default to Aventura
          setUserLat(25.9565);
          setUserLng(-80.1392);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const findAndRoute = async () => {
    if (!selected || userLat === null || userLng === null) return;

    const service = SERVICES.find((s) => s.type === selected);
    if (!service) return;

    setLoading(true);
    setRouteGeometry(null);
    setRouteInfo(null);

    try {
      // Search for nearest service
      const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        service.query
      )}&format=json&limit=5&countrycodes=us&lat=${userLat}&lon=${userLng}&bounded=0`;

      const searchResp = await fetch(searchUrl);
      const searchResults = await searchResp.json();

      if (!searchResults || searchResults.length === 0) {
        alert(`No ${service.label.toLowerCase()} found nearby.`);
        setLoading(false);
        return;
      }

      // Find nearest by distance
      let nearest = searchResults[0];
      let minDist = Infinity;
      for (const result of searchResults) {
        const dlat = parseFloat(result.lat) - userLat;
        const dlng = parseFloat(result.lon) - userLng;
        const dist = dlat * dlat + dlng * dlng;
        if (dist < minDist) {
          minDist = dist;
          nearest = result;
        }
      }

      setDestName(nearest.display_name.split(",")[0]);

      // Get route
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${nearest.lon},${nearest.lat}?overview=full&geometries=geojson`;
      const routeResp = await fetch(routeUrl);
      const routeData = await routeResp.json();

      if (routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0];
        const geometry: [number, number][] = route.geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        );
        setRouteGeometry(geometry);
        setRouteInfo({
          distance: (route.distance / 1609.34).toFixed(1) + " mi",
          duration: Math.round(route.duration / 60) + " min",
        });
      }
    } catch {
      alert("Failed to find route. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col bg-[#0a0e1a]" style={{ height: "calc(100dvh - 72px)" }}>
      {/* Map top half */}
      <div className="relative h-[45%] shrink-0">
        <SOSMap
          userLat={userLat}
          userLng={userLng}
          routeGeometry={routeGeometry}
          destinationName={destName}
        />
        {routeInfo && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-3 rounded-xl border border-[#f87171]/30 bg-[#f87171]/15 px-4 py-2.5 backdrop-blur-xl">
            <Navigation size={16} className="text-[#f87171]" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#f1f5f9]">{destName}</p>
              <p className="text-[10px] text-[#f87171]">
                {routeInfo.distance} &middot; {routeInfo.duration}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Emergency controls */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <h1 className="mb-1 text-xl font-bold text-[#f1f5f9]">Emergency SOS</h1>
        <p className="mb-4 text-xs text-[#94a3b8]">
          Find the fastest route to emergency services
        </p>

        {/* Service buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const isSelected = selected === service.type;
            return (
              <button
                key={service.type}
                onClick={() => {
                  setSelected(service.type);
                  setRouteGeometry(null);
                  setRouteInfo(null);
                }}
                className={`press-scale flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? `${service.bg} ${service.border} ring-1 ring-current`
                    : "border-[#1e293b] bg-[#111827]"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${service.bg}`}
                >
                  <Icon size={24} className={service.color} />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? service.color : "text-[#94a3b8]"
                  }`}
                >
                  {service.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Get route button */}
        <button
          onClick={findAndRoute}
          disabled={!selected || loading || userLat === null}
          className="press-scale flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f87171] py-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Finding nearest...
            </>
          ) : (
            <>
              <Navigation size={18} />
              Get Fastest Route
            </>
          )}
        </button>

        {!selected && (
          <p className="mt-3 text-center text-xs text-[#64748b]">
            Select an emergency service above
          </p>
        )}
      </div>
    </div>
  );
}
