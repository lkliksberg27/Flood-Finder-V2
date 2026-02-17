"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "red" | "gray";
  subtitle?: string;
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-400", ring: "ring-green-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/20" },
  gray: { bg: "bg-gray-500/10", text: "text-gray-400", ring: "ring-gray-500/20" },
};

export function StatCard({ label, value, icon: Icon, color = "blue", subtitle }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="card p-4 flex items-start gap-4">
      <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg ring-1", c.bg, c.ring)}>
        <Icon className={cn("w-5 h-5", c.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {label}
        </p>
        <p className={cn("text-2xl font-bold mt-0.5 tabular-nums", c.text)}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
