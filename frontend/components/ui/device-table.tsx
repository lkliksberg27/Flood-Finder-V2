"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Device, FloodStatus } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo, batteryPercent, batteryColor } from "@/lib/utils";
import {
  Battery,
  Wifi,
  WifiOff,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceTableProps {
  devices: Device[];
}

type SortKey = "name" | "status" | "waterLevelCm" | "batteryV" | "lastSeen";
type FilterStatus = "ALL" | FloodStatus;

const STATUS_ORDER: Record<FloodStatus, number> = { ALERT: 0, WARN: 1, OK: 2 };

export function DeviceTable({ devices }: DeviceTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let result = devices;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.deviceId.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus !== "ALL") {
      result = result.filter((d) => d.status === filterStatus);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "status":
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case "waterLevelCm":
          cmp = a.waterLevelCm - b.waterLevelCm;
          break;
        case "batteryV":
          cmp = a.batteryV - b.batteryV;
          break;
        case "lastSeen":
          cmp =
            (a.lastSeen?.toMillis() ?? 0) - (b.lastSeen?.toMillis() ?? 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [devices, search, filterStatus, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const isStale = (d: Device) => {
    if (!d.lastSeen) return true;
    return Date.now() - d.lastSeen.toMillis() > 2 * 60 * 1000;
  };

  return (
    <div className="card overflow-hidden">
      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="card-header flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-surface-3/50 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
        <div className="flex gap-1.5">
          {(["ALL", "ALERT", "WARN", "OK"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filterStatus === s
                  ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-surface-2"
              )}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-3/50 text-xs text-gray-500 uppercase tracking-wider">
              <Th onClick={() => handleSort("name")} active={sortKey === "name"}>
                Device
              </Th>
              <Th onClick={() => handleSort("status")} active={sortKey === "status"}>
                Status
              </Th>
              <Th onClick={() => handleSort("waterLevelCm")} active={sortKey === "waterLevelCm"}>
                Water Level
              </Th>
              <Th onClick={() => handleSort("batteryV")} active={sortKey === "batteryV"}>
                Battery
              </Th>
              <Th onClick={() => handleSort("lastSeen")} active={sortKey === "lastSeen"}>
                Last Seen
              </Th>
              <th className="px-5 py-3 text-right">Signal</th>
              <th className="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-3/30">
            {filtered.map((device) => (
              <tr
                key={device.deviceId}
                className="hover:bg-surface-2/30 transition-colors group"
                data-status={device.status}
              >
                <td className="px-5 py-3.5">
                  <div>
                    <p className="font-medium text-gray-200">{device.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {device.deviceId}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-mono font-medium tabular-nums text-gray-200">
                    {device.waterLevelCm.toFixed(1)}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">cm</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Battery
                      className={cn("w-4 h-4", batteryColor(device.batteryV))}
                    />
                    <span className="font-mono text-xs tabular-nums text-gray-300">
                      {device.batteryV.toFixed(2)}V
                    </span>
                    <span className="text-xs text-gray-500">
                      ({batteryPercent(device.batteryV)}%)
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {isStale(device) ? (
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5 text-green-400" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        isStale(device) ? "text-red-400" : "text-gray-400"
                      )}
                    >
                      {timeAgo(device.lastSeen)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {device.rssi != null ? (
                    <span className="text-xs text-gray-400 font-mono">
                      {device.rssi} dBm
                      {device.snr != null && (
                        <span className="text-gray-500 ml-1">
                          / {device.snr.toFixed(1)} SNR
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <Link
                    href={`/device/${device.deviceId}`}
                    className="text-gray-500 group-hover:text-blue-400 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-12 text-center text-gray-500 text-sm"
                >
                  {devices.length === 0
                    ? "No devices registered yet. Waiting for first reading..."
                    : "No devices match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sortable table header cell ─────────────────────────────────────────
function Th({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-5 py-3 text-left cursor-pointer select-none hover:text-gray-300 transition-colors",
        active && "text-blue-400"
      )}
    >
      {children}
    </th>
  );
}
