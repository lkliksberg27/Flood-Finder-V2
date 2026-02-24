"use client";

import { useState } from "react";
import { sensors, Sensor, getBatteryPercent, getRelativeTime } from "@/lib/mock-data";
import { Activity, Droplets, Battery, Clock, Signal } from "lucide-react";

type FilterType = "all" | "OK" | "WARN" | "ALERT";

const FILTER_TABS: { key: FilterType; label: string; color: string; activeColor: string }[] = [
  { key: "all", label: "All", color: "text-[#94a3b8]", activeColor: "bg-[#3b82f6]/20 text-[#3b82f6]" },
  { key: "OK", label: "Clear", color: "text-[#94a3b8]", activeColor: "bg-[#34d399]/20 text-[#34d399]" },
  { key: "WARN", label: "Warning", color: "text-[#94a3b8]", activeColor: "bg-[#fbbf24]/20 text-[#fbbf24]" },
  { key: "ALERT", label: "Flooding", color: "text-[#94a3b8]", activeColor: "bg-[#f87171]/20 text-[#f87171]" },
];

const STATUS_CONFIG = {
  OK: { label: "CLEAR", color: "#34d399", bg: "bg-[#34d399]/15 text-[#34d399]" },
  WARN: { label: "WARNING", color: "#fbbf24", bg: "bg-[#fbbf24]/15 text-[#fbbf24]" },
  ALERT: { label: "FLOODING", color: "#f87171", bg: "bg-[#f87171]/15 text-[#f87171]" },
};

function SensorCard({ sensor }: { sensor: Sensor }) {
  const config = STATUS_CONFIG[sensor.status];
  const battPct = getBatteryPercent(sensor.batteryV);
  const battColor = battPct > 60 ? "#34d399" : battPct > 30 ? "#fbbf24" : "#f87171";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#f1f5f9]">{sensor.name}</h3>
          <p className="text-[10px] text-[#64748b] mt-0.5">{sensor.deviceId}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${config.bg}`}
        >
          {config.label}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Water level */}
        <div className="rounded-xl bg-[#0a0e1a] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets size={12} className="text-[#3b82f6]" />
            <span className="text-[9px] font-semibold uppercase text-[#64748b]">Water Level</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="font-mono text-xl font-bold"
              style={{ color: config.color }}
            >
              {sensor.waterLevelCm}
            </span>
            <span className="text-[10px] text-[#64748b]">cm</span>
          </div>
        </div>

        {/* Battery */}
        <div className="rounded-xl bg-[#0a0e1a] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Battery size={12} style={{ color: battColor }} />
            <span className="text-[9px] font-semibold uppercase text-[#64748b]">Battery</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-bold" style={{ color: battColor }}>
              {battPct}
            </span>
            <span className="text-[10px] text-[#64748b]">%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${battPct}%`, background: battColor }}
            />
          </div>
          <p className="text-[9px] text-[#64748b] mt-1">{sensor.batteryV.toFixed(1)}V</p>
        </div>

        {/* Last seen */}
        <div className="rounded-xl bg-[#0a0e1a] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-[#94a3b8]" />
            <span className="text-[9px] font-semibold uppercase text-[#64748b]">Last Seen</span>
          </div>
          <span className="text-xs font-medium text-[#f1f5f9]">
            {getRelativeTime(sensor.lastSeen)}
          </span>
        </div>

        {/* Signal */}
        {sensor.rssi && (
          <div className="rounded-xl bg-[#0a0e1a] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Signal size={12} className="text-[#94a3b8]" />
              <span className="text-[9px] font-semibold uppercase text-[#64748b]">Signal</span>
            </div>
            <span className="text-xs font-medium text-[#f1f5f9]">{sensor.rssi} dBm</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SensorsPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all" ? sensors : sensors.filter((s) => s.status === filter);

  const counts = {
    all: sensors.length,
    OK: sensors.filter((s) => s.status === "OK").length,
    WARN: sensors.filter((s) => s.status === "WARN").length,
    ALERT: sensors.filter((s) => s.status === "ALERT").length,
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-4 pt-6 pb-4">
      <div className="mb-1 flex items-center gap-2">
        <Activity size={20} className="text-[#3b82f6]" />
        <h1 className="text-xl font-bold text-[#f1f5f9]">Sensors</h1>
      </div>
      <p className="mb-4 text-xs text-[#94a3b8]">{sensors.length} sensors active</p>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`press-scale rounded-xl px-3 py-2 text-[10px] font-semibold transition-colors ${
              filter === tab.key ? tab.activeColor : "bg-[#111827] " + tab.color
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Sensor list */}
      <div className="flex flex-col gap-3">
        {filtered.map((sensor, i) => (
          <div
            key={sensor.deviceId}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <SensorCard sensor={sensor} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-sm text-[#94a3b8]">No sensors matching this filter</p>
        </div>
      )}
    </div>
  );
}
