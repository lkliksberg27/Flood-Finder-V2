"use client";

import { useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  MapPin,
  Bell,
  Navigation,
  Shield,
  Clock,
  Info,
  ChevronRight,
  LogOut,
  Droplets,
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [locationOn, setLocationOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [alertRadius, setAlertRadius] = useState<string>("0.5");
  const [alertLevel, setAlertLevel] = useState<string>("all");
  const [units, setUnits] = useState<string>("cm");

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">Customize your alert preferences</p>

        {/* ── GENERAL ─────────────────────────────────── */}
        <div className="card mb-4 divide-y divide-surface-3/30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center">
                <MapPin className="w-4.5 h-4.5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-100">Location Access</p>
                <p className="text-xs text-gray-500">Show your position on the map</p>
              </div>
            </div>
            <Toggle checked={locationOn} onChange={setLocationOn} />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-100">Notifications</p>
                <p className="text-xs text-gray-500">Receive flood alerts</p>
              </div>
            </div>
            <Toggle checked={notificationsOn} onChange={setNotificationsOn} />
          </div>
        </div>

        {/* ── ALERT RADIUS ─────────────────────────────── */}
        <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2 px-1">
          Alert Radius
        </p>
        <div className="card mb-4 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center">
              <Navigation className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">Distance from you</p>
              <p className="text-xs text-gray-500">Only alert for sensors within this range</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "0.25", label: "0.25 mi" },
              { value: "0.5", label: "0.5 mi" },
              { value: "1", label: "1 mi" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAlertRadius(opt.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  alertRadius === opt.value
                    ? "bg-purple-500 text-white"
                    : "bg-surface-2 text-gray-400 hover:text-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ALERT SENSITIVITY ────────────────────────── */}
        <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-2 px-1">
          Alert Sensitivity
        </p>
        <div className="card mb-4 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">Alert Level</p>
              <p className="text-xs text-gray-500">Choose which severity levels to receive</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { value: "all", label: "All Alerts", desc: "Mild, moderate, and severe", color: "bg-surface-2" },
              { value: "moderate", label: "Moderate+", desc: "Moderate and severe only", color: "bg-surface-2" },
              { value: "severe", label: "Severe Only", desc: "Critical alerts only", color: "bg-amber-500" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAlertLevel(opt.value)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all ${
                  alertLevel === opt.value
                    ? opt.value === "severe"
                      ? "bg-amber-500 text-white"
                      : "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                    : "bg-surface-2 text-gray-300 hover:bg-surface-3/50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className={`text-xs ${alertLevel === opt.value && opt.value === "severe" ? "text-amber-100" : "text-gray-500"}`}>
                    {opt.desc}
                  </p>
                </div>
                {alertLevel === opt.value && (
                  <div className="w-4 h-4 rounded-full bg-white/20 border-2 border-white/50" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── MEASUREMENT UNITS ────────────────────────── */}
        <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-2 px-1">
          Measurement
        </p>
        <div className="card mb-4 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center">
              <Droplets className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">Water Level Units</p>
              <p className="text-xs text-gray-500">How depth measurements are displayed</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "cm", label: "cm" },
              { value: "in", label: "inches" },
              { value: "ft", label: "feet" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setUnits(opt.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  units === opt.value
                    ? "bg-cyan-500 text-white"
                    : "bg-surface-2 text-gray-400 hover:text-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── DATA ──────────────────────────────────────── */}
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          Data
        </p>
        <div className="card mb-4 divide-y divide-surface-3/30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-100">Last Data Refresh</p>
                <p className="text-xs text-gray-500">Just now</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ABOUT ─────────────────────────────────────── */}
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          About
        </p>
        <div className="card mb-4 divide-y divide-surface-3/30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
                <Info className="w-4.5 h-4.5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-100">Flood Finder</p>
                <p className="text-xs text-gray-500">Version 2.0.0</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
        </div>

        {/* Sign out */}
        {user && (
          <button
            onClick={logout}
            className="w-full card p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/5 transition-colors mb-8"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        )}
      </div>
    </AppShell>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        checked ? "bg-green-500" : "bg-surface-3"
      }`}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
