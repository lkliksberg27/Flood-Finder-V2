"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Reading } from "@/types";
import { formatChartTime } from "@/lib/utils";

interface WaterLevelChartProps {
  readings: Reading[];
  warnThreshold?: number;
  alertThreshold?: number;
  height?: number;
}

export function WaterLevelChart({
  readings,
  warnThreshold = 30,
  alertThreshold = 60,
  height = 260,
}: WaterLevelChartProps) {
  const data = readings.map((r) => ({
    time: r.receivedAt?.toMillis?.() ?? r.deviceTimestamp * 1000,
    waterLevel: r.waterLevelCm,
    distance: r.distanceCm,
  }));

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height }}
      >
        No readings in this time range
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="time"
          tickFormatter={formatChartTime}
          stroke="#4b5563"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#4b5563"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          unit=" cm"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          labelFormatter={(v) => {
            const d = new Date(v);
            return d.toLocaleTimeString();
          }}
          formatter={(value: number) => [`${value.toFixed(1)} cm`, "Water Level"]}
        />
        <ReferenceLine
          y={warnThreshold}
          stroke="#f59e0b"
          strokeDasharray="6 3"
          strokeOpacity={0.6}
          label={{
            value: "Warn",
            position: "right",
            fill: "#f59e0b",
            fontSize: 10,
          }}
        />
        <ReferenceLine
          y={alertThreshold}
          stroke="#ef4444"
          strokeDasharray="6 3"
          strokeOpacity={0.6}
          label={{
            value: "Alert",
            position: "right",
            fill: "#ef4444",
            fontSize: 10,
          }}
        />
        <Area
          type="monotone"
          dataKey="waterLevel"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#waterGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Battery Trend Chart ────────────────────────────────────────────────
interface BatteryChartProps {
  readings: Reading[];
  height?: number;
}

export function BatteryChart({ readings, height = 160 }: BatteryChartProps) {
  const data = readings.map((r) => ({
    time: r.receivedAt?.toMillis?.() ?? r.deviceTimestamp * 1000,
    battery: r.batteryV,
  }));

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="time"
          tickFormatter={formatChartTime}
          stroke="#4b5563"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[3.0, 4.2]}
          stroke="#4b5563"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          unit="V"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          labelFormatter={(v) => new Date(v).toLocaleTimeString()}
          formatter={(value: number) => [`${value.toFixed(2)}V`, "Battery"]}
        />
        <ReferenceLine y={3.3} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="battery"
          stroke="#a78bfa"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "#a78bfa", stroke: "#111827", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Mini Sparkline (for inline use) ─────────────────────────────────────
interface SparklineProps {
  readings: Reading[];
  field: "waterLevelCm" | "batteryV";
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  readings,
  field,
  color = "#3b82f6",
  width = 120,
  height = 32,
}: SparklineProps) {
  const data = readings.slice(-30).map((r) => ({
    v: r[field],
  }));

  if (data.length < 2) return <span className="text-gray-600 text-xs">—</span>;

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
