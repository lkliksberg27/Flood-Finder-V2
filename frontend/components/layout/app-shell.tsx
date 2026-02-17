"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Map, Bell, Navigation, Settings } from "lucide-react";

const TABS = [
  { href: "/map", label: "Map", Icon: Map },
  { href: "/alerts", label: "Alerts", Icon: Bell },
  { href: "/routes", label: "Routes", Icon: Navigation },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <main className="flex-1 overflow-auto overscroll-contain" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        {children}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-[#0c1021]/90 backdrop-blur-2xl border-t border-white/[0.05]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex justify-around items-center h-[60px] max-w-md mx-auto">
          {TABS.map(({ href, label, Icon }) => {
            const active = path === href || path?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => haptic.light()}
                className={cn(
                  "flex flex-col items-center gap-[2px] py-1 px-5 rounded-2xl select-none transition-all duration-150 active:scale-[0.85]",
                  active ? "text-[#5b9aff]" : "text-[#4a5070]"
                )}
              >
                <Icon className={cn("w-[22px] h-[22px]", active && "stroke-[2.4]")} />
                <span className={cn("text-[10px] font-semibold", active && "text-[#5b9aff]")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
