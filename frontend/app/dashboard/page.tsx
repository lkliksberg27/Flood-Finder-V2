"use client";

import { useAuth } from "@/lib/auth-context";
import { useDevices, useAlerts, useFloodStats } from "@/hooks/use-firestore";
import AppShell from "@/components/layout/app-shell";
import { DeviceTable } from "@/components/ui/device-table";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo } from "@/lib/utils";
import {
  Droplets,
  Radio,
  AlertTriangle,
  BatteryLow,
  WifiOff,
  Shield,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { devices, loading: devicesLoading } = useDevices();
  const { alerts, loading: alertsLoading } = useAlerts(20);
  const stats = useFloodStats(devices);
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || devicesLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
          <Shield className="w-12 h-12" />
          <p className="text-sm">Admin access required.</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500"
          >
            Sign in as admin
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* ── Page Header ──────────────────────────────────────── */}
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Realtime flood monitoring • {stats.total} devices
          </p>
        </div>

        {/* ── Stat Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Nodes"
            value={stats.total}
            icon={Radio}
            color="blue"
          />
          <StatCard
            label="Normal"
            value={stats.ok}
            icon={Droplets}
            color="green"
          />
          <StatCard
            label="Warning"
            value={stats.warn}
            icon={AlertTriangle}
            color="amber"
          />
          <StatCard
            label="Alert"
            value={stats.alert}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            label="Offline"
            value={stats.offline}
            icon={WifiOff}
            color="gray"
            subtitle={stats.lowBattery > 0 ? `${stats.lowBattery} low battery` : undefined}
          />
        </div>

        {/* ── Main Content: Table + Alerts sidebar ──────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <DeviceTable devices={devices} />
          </div>

          {/* ── Recent Alerts ──────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-gray-200">
                Recent Alerts
              </h2>
            </div>
            <div className="divide-y divide-surface-3/30 max-h-[500px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No alerts yet
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="px-5 py-3.5 hover:bg-surface-2/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-200">
                        {alert.deviceName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {timeAgo(alert.triggeredAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={alert.fromStatus} />
                      <span className="text-gray-500 text-xs">→</span>
                      <StatusBadge status={alert.toStatus} />
                      <span className="text-xs text-gray-400 ml-auto font-mono">
                        {alert.waterLevelCm.toFixed(1)} cm
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
