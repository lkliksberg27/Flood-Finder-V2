"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { sensors } from "@/lib/mock-data";
import { haversineDistance } from "@/lib/geo-utils";

interface WatchedPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  alertRadiusM: number;
  threshold: "any" | "warning" | "severe";
}

const THRESHOLD_LABELS = {
  any: "Any activity",
  warning: "Warning+",
  severe: "Severe only",
};

function getFloodStatus(place: WatchedPlace) {
  const nearbySensors = sensors.filter((s) => {
    if (place.threshold === "severe" && s.status !== "ALERT") return false;
    if (place.threshold === "warning" && s.status === "OK") return false;
    if (place.threshold === "any" && s.status === "OK") return false;
    const dist = haversineDistance(place.lat, place.lng, s.lat, s.lng);
    return dist <= place.alertRadiusM;
  });
  const hasSevere = nearbySensors.some((s) => s.status === "ALERT");
  return { count: nearbySensors.length, hasSevere, sensors: nearbySensors };
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<WatchedPlace[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formQuery, setFormQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { display_name: string; lat: number; lng: number }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("ff-places");
    if (stored) {
      try {
        setPlaces(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const save = (updated: WatchedPlace[]) => {
    setPlaces(updated);
    localStorage.setItem("ff-places", JSON.stringify(updated));
  };

  const searchAddress = async (query: string) => {
    setFormQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=5&countrycodes=us`
      );
      const data = await resp.json();
      setSearchResults(
        data.map((d: { display_name: string; lat: string; lon: string }) => ({
          display_name: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        }))
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const addPlace = () => {
    if (!formName || !selectedResult) return;
    const newPlace: WatchedPlace = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: formName,
      address: selectedResult.address,
      lat: selectedResult.lat,
      lng: selectedResult.lng,
      alertRadiusM: 500,
      threshold: "any",
    };
    save([...places, newPlace]);
    setFormName("");
    setFormQuery("");
    setSelectedResult(null);
    setShowForm(false);
  };

  const updatePlace = (id: string, patch: Partial<WatchedPlace>) => {
    save(places.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const deletePlace = (id: string) => {
    save(places.filter((p) => p.id !== id));
    setDeleteConfirm(null);
    if (expanded === id) setExpanded(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-4 pt-6 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Watched Places</h1>
          <p className="mt-0.5 text-xs text-[#94a3b8]">Monitor locations for flooding</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="press-scale flex items-center gap-1.5 rounded-xl bg-[#3b82f6] px-3.5 py-2.5 text-xs font-semibold text-white"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="animate-fade-in-up mb-4 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#f1f5f9]">New Place</span>
            <button onClick={() => setShowForm(false)}>
              <X size={16} className="text-[#64748b]" />
            </button>
          </div>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Place name (e.g. Home, Office)"
            className="mb-3 w-full rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-3 py-2.5 text-sm text-[#f1f5f9] outline-none placeholder:text-[#64748b] focus:border-[#3b82f6]"
          />
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-3 py-2.5">
              <MapPin size={14} className="shrink-0 text-[#64748b]" />
              <input
                type="text"
                value={formQuery}
                onChange={(e) => searchAddress(e.target.value)}
                placeholder="Search address..."
                className="w-full bg-transparent text-sm text-[#f1f5f9] outline-none placeholder:text-[#64748b]"
              />
              {searching && (
                <Loader2 size={14} className="shrink-0 animate-spin text-[#3b82f6]" />
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="autocomplete-dropdown absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="autocomplete-item text-xs text-[#94a3b8]"
                    onClick={() => {
                      setSelectedResult({
                        address: r.display_name,
                        lat: r.lat,
                        lng: r.lng,
                      });
                      setFormQuery(r.display_name);
                      setSearchResults([]);
                    }}
                  >
                    {r.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedResult && (
            <p className="mt-2 text-[10px] text-[#34d399]">Location selected</p>
          )}
          <button
            onClick={addPlace}
            disabled={!formName || !selectedResult}
            className="press-scale mt-3 w-full rounded-xl bg-[#3b82f6] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add Place
          </button>
        </div>
      )}

      {/* Empty state */}
      {places.length === 0 && !showForm && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6]/15">
            <MapPin size={28} className="text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#f1f5f9]">No watched places</p>
            <p className="mt-1 text-sm text-[#94a3b8]">
              Tap + Add to monitor a location for flooding
            </p>
          </div>
        </div>
      )}

      {/* Place cards */}
      {places.map((place, i) => {
        const isExpanded = expanded === place.id;
        const flood = getFloodStatus(place);

        return (
          <div
            key={place.id}
            className="animate-fade-in-up mb-3 rounded-2xl border border-[#1e293b] bg-[#111827]"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : place.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  flood.count > 0
                    ? flood.hasSevere
                      ? "bg-[#f87171]/15"
                      : "bg-[#fbbf24]/15"
                    : "bg-[#34d399]/15"
                }`}
              >
                <MapPin
                  size={18}
                  className={
                    flood.count > 0
                      ? flood.hasSevere
                        ? "text-[#f87171]"
                        : "text-[#fbbf24]"
                      : "text-[#34d399]"
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f1f5f9]">{place.name}</p>
                <p className="text-[10px] text-[#64748b] truncate">{place.address.split(",")[0]}</p>
              </div>
              {flood.count > 0 ? (
                <div className="flex items-center gap-1">
                  <AlertTriangle
                    size={14}
                    className={flood.hasSevere ? "text-[#f87171]" : "text-[#fbbf24]"}
                  />
                  <span
                    className={`text-[10px] font-semibold ${
                      flood.hasSevere ? "text-[#f87171]" : "text-[#fbbf24]"
                    }`}
                  >
                    {flood.count}
                  </span>
                </div>
              ) : (
                <CheckCircle2 size={14} className="text-[#34d399]" />
              )}
              {isExpanded ? (
                <ChevronDown size={16} className="text-[#64748b]" />
              ) : (
                <ChevronRight size={16} className="text-[#64748b]" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-[#1e293b] px-4 pb-4 pt-3">
                {/* Alert radius */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                      Alert Radius
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#3b82f6]">
                      {place.alertRadiusM >= 1000
                        ? `${(place.alertRadiusM / 1000).toFixed(1)}km`
                        : `${place.alertRadiusM}m`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={2000}
                    step={10}
                    value={place.alertRadiusM}
                    onChange={(e) =>
                      updatePlace(place.id, { alertRadiusM: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#3b82f6]"
                  />
                  <div className="flex justify-between text-[9px] text-[#64748b]">
                    <span>10m</span>
                    <span>2km</span>
                  </div>
                </div>

                {/* Threshold */}
                <div className="mb-4">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                    Alert Threshold
                  </span>
                  <div className="flex gap-2">
                    {(["any", "warning", "severe"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => updatePlace(place.id, { threshold: t })}
                        className={`press-scale flex-1 rounded-lg py-2 text-[10px] font-medium ${
                          place.threshold === t
                            ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                            : "bg-[#0a0e1a] text-[#64748b]"
                        }`}
                      >
                        {THRESHOLD_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flood warning */}
                {flood.count > 0 && (
                  <div
                    className={`mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 ${
                      flood.hasSevere
                        ? "bg-[#f87171]/10 border border-[#f87171]/20"
                        : "bg-[#fbbf24]/10 border border-[#fbbf24]/20"
                    }`}
                  >
                    <AlertTriangle
                      size={14}
                      className={flood.hasSevere ? "text-[#f87171]" : "text-[#fbbf24]"}
                    />
                    <span
                      className={`text-xs font-medium ${
                        flood.hasSevere ? "text-[#f87171]" : "text-[#fbbf24]"
                      }`}
                    >
                      {flood.count} sensor{flood.count > 1 ? "s" : ""} detecting flooding nearby
                    </span>
                  </div>
                )}

                {/* Delete */}
                {deleteConfirm === place.id ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[#f87171]/10 p-3">
                    <span className="flex-1 text-xs text-[#f87171]">Delete this place?</span>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="press-scale rounded-lg px-3 py-1.5 text-xs text-[#94a3b8]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deletePlace(place.id)}
                      className="press-scale rounded-lg bg-[#f87171] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(place.id)}
                    className="press-scale flex items-center gap-2 text-xs text-[#f87171]"
                  >
                    <Trash2 size={13} />
                    Delete Place
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
