"use client";

import { useState, useRef, useEffect } from "react";
import { geocodeSearch } from "@/lib/geo-utils";
import { MapPin } from "lucide-react";

interface AddressResult {
  display_name: string;
  lat: number;
  lng: number;
}

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
}

export default function AddressInput({ label, value, onChange, placeholder }: AddressInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const res = await geocodeSearch(text);
      setResults(res);
      setShowDropdown(res.length > 0);
      setLoading(false);
    }, 400);
  };

  const handleSelect = (result: AddressResult) => {
    setQuery(result.display_name);
    setShowDropdown(false);
    onChange(result.display_name, result.lat, result.lng);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-border-card bg-bg-primary px-3 py-3">
        <MapPin size={16} className="shrink-0 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder || "Search address..."}
          className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
        {loading && (
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </div>
      {showDropdown && (
        <div className="autocomplete-dropdown absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className="autocomplete-item text-sm text-text-secondary"
              onClick={() => handleSelect(r)}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
