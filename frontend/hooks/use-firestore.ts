"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Device, Reading, Alert, FloodStatus } from "@/types";

// ─── Subscribe to all devices (realtime) ────────────────────────────────
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "devices"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => doc.data() as Device);
        setDevices(docs);
        setLoading(false);
      },
      (err) => {
        console.error("useDevices error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { devices, loading, error };
}

// ─── Subscribe to readings for a single device ─────────────────────────
export function useDeviceReadings(
  deviceId: string | null,
  hours: number = 1,
  maxCount: number = 600
) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) {
      setReadings([]);
      setLoading(false);
      return;
    }

    const cutoff = Timestamp.fromDate(
      new Date(Date.now() - hours * 60 * 60 * 1000)
    );

    const q = query(
      collection(db, "readings"),
      where("deviceId", "==", deviceId),
      where("receivedAt", ">=", cutoff),
      orderBy("receivedAt", "desc"),
      limit(maxCount)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Reading[];
        // Reverse so chronological order for charts
        setReadings(docs.reverse());
        setLoading(false);
      },
      (err) => {
        console.error("useDeviceReadings error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [deviceId, hours, maxCount]);

  return { readings, loading };
}

// ─── Subscribe to recent alerts ─────────────────────────────────────────
export function useAlerts(maxCount: number = 50) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      orderBy("triggeredAt", "desc"),
      limit(maxCount)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Alert[];
        setAlerts(docs);
        setLoading(false);
      },
      (err) => {
        console.error("useAlerts error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [maxCount]);

  return { alerts, loading };
}

// ─── Computed stats from devices ────────────────────────────────────────
export function useFloodStats(devices: Device[]) {
  const total = devices.length;
  const ok = devices.filter((d) => d.status === "OK").length;
  const warn = devices.filter((d) => d.status === "WARN").length;
  const alert = devices.filter((d) => d.status === "ALERT").length;
  const lowBattery = devices.filter((d) => d.batteryV < 3.3).length;
  const staleMinutes = 2;
  const offline = devices.filter((d) => {
    if (!d.lastSeen) return true;
    const age = Date.now() - d.lastSeen.toMillis();
    return age > staleMinutes * 60 * 1000;
  }).length;

  return { total, ok, warn, alert, lowBattery, offline };
}
