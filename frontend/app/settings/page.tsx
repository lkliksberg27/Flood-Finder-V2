"use client";

import { useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth-context";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
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
  Gauge,
  Wifi,
  Battery,
  Smartphone,
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [locationOn, setLocationOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [alertRadius, setAlertRadius] = useState("0.5");
  const [alertLevel, setAlertLevel] = useState("all");
  const [units, setUnits] = useState("cm");

  return (
    <AppShell>
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+8px)] pb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-0.5">Settings</h1>
        <p className="text-[13px] text-gray-500 mb-6">Customize your experience</p>

        {/* ── GENERAL ─────────────────────── */}
        <SettingGroup>
          <ToggleRow
            icon={<MapPin className="w-[18px] h-[18px] text-green-400" />}
            iconBg="bg-green-500/15"
            title="Location Access"
            subtitle="Show your position on the map"
            checked={locationOn}
            onChange={() => { setLocationOn(!locationOn); hapticLight(); }}
          />
          <Divider />
          <ToggleRow
            icon={<Bell className="w-[18px] h-[18px] text-blue-400" />}
            iconBg="bg-blue-500/15"
            title="Notifications"
            subtitle="Receive flood alerts"
            checked={notificationsOn}
            onChange={() => { setNotificationsOn(!notificationsOn); hapticLight(); }}
          />
        </SettingGroup>

        {/* ── ALERT RADIUS ────────────────── */}
        <SectionLabel color="text-purple-400">Alert Radius</SectionLabel>
        <SettingGroup>
          <div className="p-4">
            <Row
              icon={<Navigation className="w-[18px] h-[18px] text-purple-400" />}
              iconBg="bg-purple-500/15"
              title="Distance from you"
              subtitle="Only alert for sensors within range"
            />
            <div className="grid grid-cols-3 gap-2 mt-3.5">
              {["0.25", "0.5", "1"].map((v) => (
                <PillButton
                  key={v}
                  label={`${v} mi`}
                  active={alertRadius === v}
                  activeColor="bg-purple-500"
                  onPress={() => { setAlertRadius(v); hapticLight(); }}
                />
              ))}
            </div>
          </div>
        </SettingGroup>

        {/* ── ALERT LEVEL ─────────────────── */}
        <SectionLabel color="text-red-400">Alert Sensitivity</SectionLabel>
        <SettingGroup>
          <div className="p-4">
            <Row
              icon={<Shield className="w-[18px] h-[18px] text-amber-400" />}
              iconBg="bg-amber-500/15"
              title="Alert Level"
              subtitle="Choose which severity levels to receive"
            />
            <div className="space-y-2 mt-3.5">
              {[
                { value: "all", label: "All Alerts", desc: "Mild, moderate, and severe" },
                { value: "moderate", label: "Moderate+", desc: "Moderate and severe only" },
                { value: "severe", label: "Severe Only", desc: "Critical alerts only" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setAlertLevel(opt.value); hapticLight(); }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all active:scale-[0.98] ${
                    alertLevel === opt.value
                      ? opt.value === "severe"
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                        : "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20"
                      : "bg-surface-2/40 text-gray-300"
                  }`}
                >
                  <div>
                    <p className="text-[13px] font-semibold">{opt.label}</p>
                    <p className={`text-[11px] mt-0.5 ${
                      alertLevel === opt.value && opt.value === "severe" ? "text-white/70" : "text-gray-500"
                    }`}>{opt.desc}</p>
                  </div>
                  {alertLevel === opt.value && (
                    <div className="w-5 h-5 rounded-full border-2 border-white/40 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </SettingGroup>

        {/* ── UNITS ───────────────────────── */}
        <SectionLabel color="text-cyan-400">Measurement</SectionLabel>
        <SettingGroup>
          <div className="p-4">
            <Row
              icon={<Gauge className="w-[18px] h-[18px] text-cyan-400" />}
              iconBg="bg-cyan-500/15"
              title="Water Level Units"
              subtitle="How depth is displayed"
            />
            <div className="grid grid-cols-3 gap-2 mt-3.5">
              {[
                { value: "cm", label: "cm" },
                { value: "in", label: "inches" },
                { value: "ft", label: "feet" },
              ].map((opt) => (
                <PillButton
                  key={opt.value}
                  label={opt.label}
                  active={units === opt.value}
                  activeColor="bg-cyan-500"
                  onPress={() => { setUnits(opt.value); hapticLight(); }}
                />
              ))}
            </div>
          </div>
        </SettingGroup>

        {/* ── SYSTEM ──────────────────────── */}
        <SectionLabel color="text-gray-500">System</SectionLabel>
        <SettingGroup>
          <div className="flex items-center justify-between p-4">
            <Row
              icon={<Clock className="w-[18px] h-[18px] text-gray-400" />}
              iconBg="bg-surface-2"
              title="Last Data Refresh"
              subtitle="Just now"
            />
          </div>
          <Divider />
          <div className="flex items-center justify-between p-4">
            <Row
              icon={<Smartphone className="w-[18px] h-[18px] text-gray-400" />}
              iconBg="bg-surface-2"
              title="Flood Finder"
              subtitle="Version 2.0"
            />
          </div>
        </SettingGroup>

        {/* Sign out */}
        {user && (
          <button
            onClick={() => { hapticMedium(); logout(); }}
            className="w-full mt-6 card p-4 flex items-center justify-center gap-2.5 text-red-400 active:scale-[0.98] active:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[14px] font-semibold">Sign Out</span>
          </button>
        )}

        <p className="text-center text-[11px] text-gray-600 mt-6">
          Flood Finder • Built with LoRa IoT
        </p>
      </div>
    </AppShell>
  );
}

// ─── Reusable components ──────────────────────────────

function SettingGroup({ children }: { children: React.ReactNode }) {
  return <div className="card mb-4 overflow-hidden">{children}</div>;
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-2 mt-6 px-1 ${color}`}>
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-white/[0.04] mx-4" />;
}

function Row({
  icon,
  iconBg,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-medium text-gray-100">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  iconBg,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <Row icon={icon} iconBg={iconBg} title={title} subtitle={subtitle} />
      <button
        onClick={onChange}
        className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 active:scale-95 ${
          checked ? "bg-green-500" : "bg-surface-3"
        }`}
      >
        <div
          className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "left-[22px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

function PillButton({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
        active
          ? `${activeColor} text-white shadow-lg`
          : "bg-surface-2/40 text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}
