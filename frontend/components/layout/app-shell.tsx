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
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/map", label: "Live Map", icon: Map, public: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, public: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => item.public || isAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
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
                pathname === item.href
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

      {/* ── Mobile header ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-1 border-b border-surface-3/50">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold">Flood Finder</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-surface-2"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </header>

        {/* ── Mobile nav drawer ────────────────────────────────── */}
        {mobileOpen && (
          <nav className="md:hidden bg-surface-1 border-b border-surface-3/50 px-4 py-3 space-y-1 animate-slide-up">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                  pathname === item.href
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-gray-400"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400"
              >
                <LogOut className="w-[18px] h-[18px]" />
                Sign out
              </button>
            )}
          </nav>
        )}

        {/* ── Page content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
