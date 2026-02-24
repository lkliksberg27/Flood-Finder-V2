import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a Firestore Timestamp as a relative time string.
 * "just now", "2m ago", "1h ago", "3d ago", etc.
 */
export function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts) return "never";
  const now = Date.now();
  const then = ts.toMillis();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Format timestamp for chart axis labels.
 */
export function formatChartTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Battery percentage estimate from voltage (LiPo 3.0V–4.2V range).
 */
export function batteryPercent(voltage: number): number {
  const pct = Math.round(((voltage - 3.0) / 1.2) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Battery color based on percentage.
 */
export function batteryColor(voltage: number): string {
  const pct = batteryPercent(voltage);
  if (pct > 50) return "text-green-400";
  if (pct > 20) return "text-amber-400";
  return "text-red-400";
}
