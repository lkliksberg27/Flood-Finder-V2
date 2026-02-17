"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Droplets,
  LayoutDashboard,
  Map,
  LogOut,
  Menu,
  X,
  Radio,
  Bell,
  Settings,
  Navigation,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/map", label: "Map", icon: Map, public: true },
  { href: "/alerts", label: "Alerts", icon: Bell, public: true },
  { href: "/routes", label: "Routes", icon: Navigation, public: true },
  { href: "/settings", label: "Settings", icon: Settings, public: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, public: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => item.public || isAdmin);
  const bottomNav = visibleNav.slice(0, 4); // Show max 4 in bottom bar

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-1 border-r border-surface-3/50">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-3/50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/15">
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-100 tracking-tight">
              Flood Finder
            </h1>
            <p className="text-[11px] text-gray-500 font-mono">
              IoT Monitoring
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-blue-500/15 text-blue-400 font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-2/50"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="px-3 py-4 border-t border-surface-3/50">
            <div className="flex items-center gap-2 px-3 mb-3">
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-xs text-gray-500">
                {isAdmin ? "Admin" : "Viewer"}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-surface-2/50 transition-all"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content area ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header (minimal) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-1 border-b border-surface-3/50">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold">Flood Finder</span>
          </div>
          {user && (
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-surface-2 text-gray-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>

        {/* ── Mobile bottom tab bar ───────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-lg border-t border-surface-3/50 flex justify-around items-center py-2 px-2 z-50">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px]",
                  isActive
                    ? "text-blue-400"
                    : "text-gray-500"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
