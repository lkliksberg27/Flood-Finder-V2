"use client";

import { useSettings } from "@/lib/settings-context";
import { Droplets, Gauge, Bell, Ruler, MapPin } from "lucide-react";

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        value ? "bg-[#3b82f6]" : "bg-[#1e293b]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
          value ? "left-[calc(100%-26px)]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-4 pt-6 pb-4">
      <h1 className="mb-1 text-xl font-bold text-[#f1f5f9]">Settings</h1>
      <p className="mb-5 text-xs text-[#94a3b8]">Configure Flood Finder</p>

      {/* DETECTION */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#64748b]">
        Detection
      </p>
      <div className="animate-fade-in-up animate-delay-1 mb-4 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={16} className="text-[#3b82f6]" />
          <span className="text-sm font-semibold text-[#f1f5f9]">Detection Radius</span>
        </div>
        <p className="text-[10px] text-[#64748b] mb-3">
          How close a sensor must be to trigger a warning
        </p>
        <input
          type="range"
          min={10}
          max={1000}
          step={10}
          value={settings.alertRadiusM}
          onChange={(e) => updateSettings({ alertRadiusM: parseInt(e.target.value) })}
          className="w-full accent-[#3b82f6]"
        />
        <div className="mt-1.5 flex justify-between text-[9px] text-[#64748b]">
          <span>10m</span>
          <span className="font-mono font-bold text-[#3b82f6] text-xs">
            {settings.alertRadiusM}m
          </span>
          <span>1km</span>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#64748b]">
        Notifications
      </p>
      <div className="animate-fade-in-up animate-delay-2 mb-4 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#3b82f6]" />
            <div>
              <span className="text-sm font-semibold text-[#f1f5f9]">Flood Alerts</span>
              <p className="text-[10px] text-[#64748b]">Get notified about flooding near routes</p>
            </div>
          </div>
          <Toggle
            value={settings.pushNotifications}
            onChange={(v) => updateSettings({ pushNotifications: v })}
          />
        </div>
      </div>

      {/* PREFERENCES */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#64748b]">
        Preferences
      </p>
      <div className="animate-fade-in-up animate-delay-3 mb-3 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler size={16} className="text-[#3b82f6]" />
            <div>
              <span className="text-sm font-semibold text-[#f1f5f9]">Metric Units</span>
              <p className="text-[10px] text-[#64748b]">Use centimeters instead of inches</p>
            </div>
          </div>
          <Toggle
            value={settings.unitSystem === "metric"}
            onChange={(v) => updateSettings({ unitSystem: v ? "metric" : "imperial" })}
          />
        </div>
      </div>

      <div className="animate-fade-in-up animate-delay-4 mb-4 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#3b82f6]" />
            <div>
              <span className="text-sm font-semibold text-[#f1f5f9]">My Location</span>
              <p className="text-[10px] text-[#64748b]">Show your position on the map</p>
            </div>
          </div>
          <Toggle
            value={settings.darkMode}
            onChange={(v) => updateSettings({ darkMode: v })}
          />
        </div>
      </div>

      {/* About */}
      <div className="animate-fade-in-up animate-delay-5 mt-6 rounded-2xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3b82f6]/15">
            <Droplets size={22} className="text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#f1f5f9]">Flood Finder</p>
            <p className="text-[10px] text-[#64748b]">Version 1.0</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#94a3b8]">
          Real-time flood monitoring and safe route planning for South Florida.
          Monitor water levels from IoT sensors and plan driving routes that avoid
          flooded streets.
        </p>
      </div>

      <p className="mt-6 text-center text-[10px] text-[#64748b]">
        Flood Finder is a project by Lior Kliksberg
      </p>
    </div>
  );
}
