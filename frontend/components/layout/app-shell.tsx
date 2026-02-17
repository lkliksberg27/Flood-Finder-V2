"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  Map,
  Bell,
  Navigation,
  Settings,
  LayoutDashboard,
  Droplets,
  LogOut,
} from "lucide-react";

const TABS = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/routes", label: "Routes", icon: Navigation },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-surface-0">
      {/* ── Main content ──────────────────────────────── */}
      <main className="flex-1 overflow-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+68px)]">
        {children}
      </main>

      {/* ── Bottom tab bar ─────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-1/80 backdrop-blur-2xl border-t border-white/[0.04]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around items-end px-2 pt-1.5 pb-1.5 max-w-lg mx-auto">
          {TABS.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => hapticLight()}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-4 rounded-2xl transition-all duration-200 active:scale-90 select-none",
                  isActive ? "text-blue-400" : "text-gray-500 active:text-gray-300"
                )}
              >
                <div className="relative">
                  <tab.icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-200",
                      isActive && "stroke-[2.5]"
                    )}
                  />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-all",
                    isActive ? "text-blue-400" : "text-gray-500"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
