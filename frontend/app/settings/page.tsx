"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth-context";
import { haptic } from "@/lib/haptics";
import { MapPin, Bell, Navigation, Shield, Clock, Info, LogOut, Droplets, Gauge, Smartphone } from "lucide-react";

function load(key: string, def: string) {
  if (typeof window === "undefined") return def;
  return localStorage.getItem(`ff_${key}`) ?? def;
}
function save(key: string, val: string) {
  try { localStorage.setItem(`ff_${key}`, val); } catch {}
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [locationOn, setLocationOn] = useState(true);
  const [notifsOn, setNotifsOn] = useState(true);
  const [radius, setRadius] = useState("0.5");
  const [level, setLevel] = useState("all");
  const [units, setUnits] = useState("cm");

  useEffect(() => {
    setLocationOn(load("loc", "1") === "1");
    setNotifsOn(load("notif", "1") === "1");
    setRadius(load("radius", "0.5"));
    setLevel(load("level", "all"));
    setUnits(load("units", "cm"));
  }, []);

  function toggle(key: string, val: boolean, setter: (v: boolean) => void) {
    setter(!val); save(key, !val ? "1" : "0"); haptic.light();
  }

  function pick(key: string, val: string, setter: (v: string) => void) {
    setter(val); save(key, val); haptic.light();
  }

  return (
    <AppShell>
      <div className="px-4 pt-3 pb-8">
        <h1 className="text-[26px] font-extrabold tracking-tight">Settings</h1>
        <p className="text-[13px] text-slate-500 mt-0.5 mb-6">Customize your experience</p>

        <Group>
          <ToggleRow icon={<MapPin className="w-[18px] h-[18px] text-emerald-400" />} bg="bg-emerald-500/12" title="Location Access" sub="Show your position on the map" on={locationOn} onToggle={() => toggle("loc", locationOn, setLocationOn)} />
          <Sep />
          <ToggleRow icon={<Bell className="w-[18px] h-[18px] text-blue-400" />} bg="bg-blue-500/12" title="Notifications" sub="Receive flood alerts" on={notifsOn} onToggle={() => toggle("notif", notifsOn, setNotifsOn)} />
        </Group>

        <Label c="text-purple-400">Alert Radius</Label>
        <Group>
          <div className="p-4">
            <Row icon={<Navigation className="w-[18px] h-[18px] text-purple-400" />} bg="bg-purple-500/12" title="Distance from you" sub="Sensors within this range" />
            <div className="grid grid-cols-3 gap-2 mt-3.5">
              {["0.25", "0.5", "1"].map((v) => (
                <Pill key={v} label={`${v} mi`} on={radius === v} color="bg-purple-500" onPress={() => pick("radius", v, setRadius)} />
              ))}
            </div>
          </div>
        </Group>

        <Label c="text-red-400">Alert Sensitivity</Label>
        <Group>
          <div className="p-4">
            <Row icon={<Shield className="w-[18px] h-[18px] text-amber-400" />} bg="bg-amber-500/12" title="Alert Level" sub="Choose severity levels" />
            <div className="space-y-2 mt-3.5">
              {[
                { v: "all", l: "All Alerts", d: "Mild, moderate, and severe" },
                { v: "moderate", l: "Moderate+", d: "Moderate and severe only" },
                { v: "severe", l: "Severe Only", d: "Critical alerts only" },
              ].map((o) => (
                <button key={o.v} onClick={() => pick("level", o.v, setLevel)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left tap ${
                    level === o.v
                      ? o.v === "severe" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/15"
                      : "bg-white/[0.03] text-slate-300"
                  }`}>
                  <div>
                    <p className="text-[13px] font-semibold">{o.l}</p>
                    <p className={`text-[11px] mt-0.5 ${level === o.v && o.v === "severe" ? "text-white/65" : "text-slate-500"}`}>{o.d}</p>
                  </div>
                  {level === o.v && <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-white/70" /></div>}
                </button>
              ))}
            </div>
          </div>
        </Group>

        <Label c="text-cyan-400">Measurement</Label>
        <Group>
          <div className="p-4">
            <Row icon={<Gauge className="w-[18px] h-[18px] text-cyan-400" />} bg="bg-cyan-500/12" title="Water Level Units" sub="How depth is displayed" />
            <div className="grid grid-cols-3 gap-2 mt-3.5">
              {[{ v: "cm", l: "cm" }, { v: "in", l: "inches" }, { v: "ft", l: "feet" }].map((o) => (
                <Pill key={o.v} label={o.l} on={units === o.v} color="bg-cyan-500" onPress={() => pick("units", o.v, setUnits)} />
              ))}
            </div>
          </div>
        </Group>

        <Label c="text-slate-500">System</Label>
        <Group>
          <div className="p-4"><Row icon={<Clock className="w-[18px] h-[18px] text-slate-400" />} bg="bg-white/[0.04]" title="Last Data Refresh" sub="Just now" /></div>
          <Sep />
          <div className="p-4"><Row icon={<Smartphone className="w-[18px] h-[18px] text-slate-400" />} bg="bg-white/[0.04]" title="Flood Finder" sub="Version 2.0" /></div>
        </Group>

        {user && (
          <button onClick={() => { haptic.medium(); logout(); }}
            className="w-full mt-6 fcard p-4 flex items-center justify-center gap-2.5 text-red-400 tap">
            <LogOut className="w-4 h-4" /><span className="text-[14px] font-bold">Sign Out</span>
          </button>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-6">Flood Finder • Built with LoRa IoT</p>
      </div>
    </AppShell>
  );
}

function Group({ children }: { children: React.ReactNode }) { return <div className="fcard mb-4 overflow-hidden">{children}</div>; }
function Label({ children, c }: { children: React.ReactNode; c: string }) { return <p className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-2 mt-6 px-1 ${c}`}>{children}</p>; }
function Sep() { return <div className="h-px bg-white/[0.04] mx-4" />; }

function Row({ icon, bg, title, sub }: { icon: React.ReactNode; bg: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
      <div><p className="text-[14px] font-semibold text-slate-100">{title}</p><p className="text-[11px] text-slate-500 mt-0.5">{sub}</p></div>
    </div>
  );
}

function ToggleRow({ icon, bg, title, sub, on, onToggle }: { icon: React.ReactNode; bg: string; title: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4">
      <Row icon={icon} bg={bg} title={title} sub={sub} />
      <button onClick={onToggle}
        className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 active:scale-95 ${on ? "bg-emerald-500" : "bg-slate-700"}`}>
        <div className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-200 ${on ? "left-[22px]" : "left-[2px]"}`} />
      </button>
    </div>
  );
}

function Pill({ label, on, color, onPress }: { label: string; on: boolean; color: string; onPress: () => void }) {
  return (
    <button onClick={onPress}
      className={`py-2.5 rounded-xl text-[13px] font-bold tap ${on ? `${color} text-white shadow-lg` : "bg-white/[0.04] text-slate-500"}`}>
      {label}
    </button>
  );
}
