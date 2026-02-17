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
  const fullbleed = path === "/map" || path === "/routes";

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#0c1021]">
      <main className={cn("flex-1 overflow-auto overscroll-contain", !fullbleed && "pb-[calc(56px+env(safe-area-inset-bottom,0px))]")}>
        {children}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-[9999] bg-[#0c1021]/92 backdrop-blur-2xl border-t border-white/[0.05]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex justify-around items-center h-[56px] max-w-lg mx-auto">
          {TABS.map(({ href, label, Icon }) => {
            const active = path === href || path?.startsWith(href + "/");
            return (
              <Link key={href} href={href} onClick={() => haptic.light()}
                className={cn("flex flex-col items-center gap-[1px] py-1.5 px-5 rounded-2xl select-none transition-all active:scale-[0.82]",
                  active ? "text-[#5b9aff]" : "text-[#3a4060]")}>
                <Icon className={cn("w-[21px] h-[21px]", active && "stroke-[2.4]")} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
