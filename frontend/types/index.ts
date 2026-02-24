import { Timestamp } from "firebase/firestore";

export type FloodStatus = "OK" | "WARN" | "ALERT";

export interface Device {
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  distanceCm: number;
  waterLevelCm: number;
  batteryV: number;
  status: FloodStatus;
  prevStatus: FloodStatus;
  lastSeen: Timestamp;
  rssi: number | null;
  snr: number | null;
  mountHeightCm: number;
  thresholds: {
    warnCm: number;
    alertCm: number;
  };
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Reading {
  id: string;
  deviceId: string;
  distanceCm: number;
  waterLevelCm: number;
  batteryV: number;
  status: FloodStatus;
  rssi: number | null;
  snr: number | null;
  receivedAt: Timestamp;
  deviceTimestamp: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  fromStatus: FloodStatus;
  toStatus: FloodStatus;
  waterLevelCm: number;
  triggeredAt: Timestamp;
  acknowledged: boolean;
}

// ─── UI Helpers ─────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<FloodStatus, {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  mapColor: string;
}> = {
  OK: {
    label: "Normal",
    color: "#22c55e",
    bgClass: "bg-green-500/15",
    textClass: "text-green-400",
    badgeClass: "status-ok",
    mapColor: "#22c55e",
  },
  WARN: {
    label: "Warning",
    color: "#f59e0b",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    badgeClass: "status-warn",
    mapColor: "#f59e0b",
  },
  ALERT: {
    label: "Flood Alert",
    color: "#ef4444",
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
    badgeClass: "status-alert",
    mapColor: "#ef4444",
  },
};
