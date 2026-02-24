"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Navigation, ShieldAlert, MapPin, Activity, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "Map", icon: Map },
  { href: "/routes", label: "Routes", icon: Navigation },
  { href: "/sos", label: "SOS", icon: ShieldAlert },
  { href: "/places", label: "Places", icon: MapPin },
  { href: "/sensors", label: "Sensors", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-white/5 bg-[#0a0e1a]/90 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          const isSOS = tab.label === "SOS";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[56px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 transition-colors ${
                isActive
                  ? isSOS
                    ? "text-[#f87171]"
                    : "text-[#3b82f6]"
                  : "text-[#64748b]"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
