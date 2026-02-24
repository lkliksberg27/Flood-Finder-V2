"use client";

import { sensors, getRelativeTime } from "@/lib/mock-data";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AlertsPage() {
  const alertSensors = sensors
    .filter((s) => s.status === "WARN" || s.status === "ALERT")
    .sort((a, b) => {
      if (a.status === "ALERT" && b.status !== "ALERT") return -1;
      if (a.status !== "ALERT" && b.status === "ALERT") return 1;
      return b.waterLevelCm - a.waterLevelCm;
    });

  const severeCount = sensors.filter((s) => s.status === "ALERT").length;
  const moderateCount = sensors.filter((s) => s.status === "WARN").length;
  const activeCount = severeCount + moderateCount;

  return (
    <div className="min-h-[100dvh] bg-bg-primary px-4 pt-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold text-text-primary">Alerts</h1>
      <p className="mb-5 text-sm text-text-secondary">Active flood warnings in your area</p>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="animate-fade-in-up animate-delay-1 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-center">
          <div className="font-mono text-2xl font-bold text-danger">{severeCount}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-danger/80">
            Severe
          </div>
        </div>
        <div className="animate-fade-in-up animate-delay-2 rounded-2xl border border-warn/20 bg-warn/10 p-4 text-center">
          <div className="font-mono text-2xl font-bold text-warn">{moderateCount}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-warn/80">
            Moderate
          </div>
        </div>
        <div className="animate-fade-in-up animate-delay-3 rounded-2xl border border-border-card bg-bg-card p-4 text-center">
          <div className="font-mono text-2xl font-bold text-text-primary">{activeCount}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Active
          </div>
        </div>
      </div>

      {/* Alert list */}
      {alertSensors.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-safe/15">
            <CheckCircle2 size={32} className="text-safe" />
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">All Clear</p>
            <p className="mt-1 text-sm text-text-secondary">No flooding detected</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alertSensors.map((sensor, i) => {
            const isSevere = sensor.status === "ALERT";
            const borderColor = isSevere ? "border-l-danger" : "border-l-warn";
            const icon = isSevere ? (
              <AlertTriangle size={20} className="text-danger" />
            ) : (
              <AlertCircle size={20} className="text-warn" />
            );
            const severityLabel = isSevere ? "Severe Flooding" : "Moderate Flooding";
            const severityColor = isSevere ? "text-danger" : "text-warn";

            return (
              <div
                key={sensor.deviceId}
                className={`animate-fade-in-up rounded-2xl border border-border-card bg-bg-card border-l-4 ${borderColor} p-4`}
                style={{ animationDelay: `${(i + 1) * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className={`text-xs font-semibold ${severityColor}`}>
                        {severityLabel}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-text-primary">
                      {sensor.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {sensor.deviceId} &middot; {getRelativeTime(sensor.lastSeen)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-3xl font-bold text-text-primary">
                      {sensor.waterLevelCm}
                    </div>
                    <div className="text-xs text-text-secondary">cm</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
