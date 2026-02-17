"use client";

import { FloodStatus, STATUS_CONFIG } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: FloodStatus;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function StatusBadge({ status, size = "sm", pulse = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "status-badge",
        config.badgeClass,
        size === "md" && "text-sm px-3 py-1.5",
        status === "ALERT" && pulse && "animate-pulse-slow"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          status === "OK" && "bg-green-400",
          status === "WARN" && "bg-amber-400",
          status === "ALERT" && "bg-red-400"
        )}
      />
      {config.label}
    </span>
  );
}
