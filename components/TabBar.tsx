"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Bell, Navigation, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "Map", icon: Map },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/routes", label: "Routes", icon: Navigation },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-white/5 bg-[#0a0e1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
                isActive ? "text-accent" : "text-text-muted"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] font-medium ${isActive ? "text-accent" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
