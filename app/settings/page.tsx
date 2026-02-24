"use client";

import { useSettings } from "@/lib/settings-context";
import { Droplets, Info, Ruler, Moon, Bell, Gauge } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="min-h-[100dvh] bg-bg-primary px-4 pt-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold text-text-primary">Settings</h1>
      <p className="mb-6 text-sm text-text-secondary">Configure your Flood Finder experience</p>

      {/* Alert Radius */}
      <div className="animate-fade-in-up animate-delay-1 mb-4 rounded-2xl border border-border-card bg-bg-card p-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Gauge size={18} className="text-accent" />
          <span className="text-sm font-semibold">Alert Radius</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          How close a sensor must be to a route to trigger a warning
        </p>
        <div className="mt-3">
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={settings.alertRadiusM}
            onChange={(e) => updateSettings({ alertRadiusM: parseInt(e.target.value) })}
            className="w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>100m</span>
            <span className="font-mono font-semibold text-accent">{settings.alertRadiusM}m</span>
            <span>1000m</span>
          </div>
        </div>
      </div>

      {/* Units */}
      <div className="animate-fade-in-up animate-delay-2 mb-4 rounded-2xl border border-border-card bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler size={18} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Units</span>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-border-card">
            <button
              onClick={() => updateSettings({ unitSystem: "metric" })}
              className={`press-scale px-4 py-2 text-xs font-medium transition-colors ${
                settings.unitSystem === "metric"
                  ? "bg-accent text-white"
                  : "bg-bg-primary text-text-muted"
              }`}
            >
              Metric (cm)
            </button>
            <button
              onClick={() => updateSettings({ unitSystem: "imperial" })}
              className={`press-scale px-4 py-2 text-xs font-medium transition-colors ${
                settings.unitSystem === "imperial"
                  ? "bg-accent text-white"
                  : "bg-bg-primary text-text-muted"
              }`}
            >
              Imperial (in)
            </button>
          </div>
        </div>
      </div>

      {/* Dark Mode */}
      <div className="animate-fade-in-up animate-delay-3 mb-4 rounded-2xl border border-border-card bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Dark Mode</span>
          </div>
          <button
            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.darkMode ? "bg-accent" : "bg-border-card"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                settings.darkMode ? "left-[calc(100%-26px)]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="animate-fade-in-up animate-delay-4 mb-4 rounded-2xl border border-border-card bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Push Notifications</span>
          </div>
          <button
            onClick={() => updateSettings({ pushNotifications: !settings.pushNotifications })}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.pushNotifications ? "bg-accent" : "bg-border-card"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                settings.pushNotifications ? "left-[calc(100%-26px)]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Get notified when flooding is detected near your routes
        </p>
      </div>

      {/* About */}
      <div className="animate-fade-in-up animate-delay-5 mb-4 rounded-2xl border border-border-card bg-bg-card p-4">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-accent" />
          <span className="text-sm font-semibold text-text-primary">About</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15">
            <Droplets size={24} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Flood Finder</p>
            <p className="text-xs text-text-muted">Version 1.0</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-secondary">
          Real-time flood monitoring and safe route planning for South Florida. Monitor water
          levels from IoT sensors and plan driving routes that avoid flooded streets.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-text-muted">
          Flood Finder is a project by Lior Kliksberg
        </p>
      </div>
    </div>
  );
}
