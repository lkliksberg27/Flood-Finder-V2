"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center bg-[#0a0e1a]"
      style={{ height: "calc(100dvh - 72px)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
        <span className="text-sm text-[#94a3b8]">Loading map...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <MapView />;
}
