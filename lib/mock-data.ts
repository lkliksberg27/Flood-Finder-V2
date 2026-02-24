export type SensorStatus = "OK" | "WARN" | "ALERT";

export interface Sensor {
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  waterLevelCm: number;
  status: SensorStatus;
  batteryV: number;
  lastSeen: Date;
  rssi?: number;
}

export function getBatteryPercent(voltage: number): number {
  return Math.round(Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100)));
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function minutesAgo(min: number): Date {
  return new Date(Date.now() - min * 60000);
}

export const sensors: Sensor[] = [
  {
    deviceId: "FF-001",
    name: "Aventura Blvd & Biscayne",
    lat: 25.9565,
    lng: -80.1392,
    waterLevelCm: 2,
    status: "OK",
    batteryV: 4.1,
    lastSeen: minutesAgo(3),
    rssi: -55,
  },
  {
    deviceId: "FF-002",
    name: "NE 199th St & 30th Ave",
    lat: 25.9588,
    lng: -80.1425,
    waterLevelCm: 1,
    status: "OK",
    batteryV: 3.9,
    lastSeen: minutesAgo(7),
    rssi: -62,
  },
  {
    deviceId: "FF-003",
    name: "Yacht Club Dr & Island Blvd",
    lat: 25.9478,
    lng: -80.1348,
    waterLevelCm: 4,
    status: "OK",
    batteryV: 3.7,
    lastSeen: minutesAgo(12),
    rssi: -70,
  },
  {
    deviceId: "FF-004",
    name: "William Lehman Cswy",
    lat: 25.9352,
    lng: -80.1425,
    waterLevelCm: 3,
    status: "OK",
    batteryV: 4.2,
    lastSeen: minutesAgo(2),
    rssi: -48,
  },
  {
    deviceId: "FF-005",
    name: "NE 185th St & 31st Ave",
    lat: 25.9445,
    lng: -80.1468,
    waterLevelCm: 8,
    status: "WARN",
    batteryV: 3.5,
    lastSeen: minutesAgo(5),
    rssi: -65,
  },
  {
    deviceId: "FF-006",
    name: "Dumfoundling Bay Park",
    lat: 25.9512,
    lng: -80.1305,
    waterLevelCm: 12,
    status: "WARN",
    batteryV: 3.3,
    lastSeen: minutesAgo(8),
    rssi: -72,
  },
  {
    deviceId: "FF-007",
    name: "NE 207th St Underpass",
    lat: 25.9632,
    lng: -80.1510,
    waterLevelCm: 22,
    status: "ALERT",
    batteryV: 3.1,
    lastSeen: minutesAgo(1),
    rssi: -58,
  },
  {
    deviceId: "FF-008",
    name: "Oleta River State Park Entrance",
    lat: 25.9385,
    lng: -80.1262,
    waterLevelCm: 28,
    status: "ALERT",
    batteryV: 3.0,
    lastSeen: minutesAgo(4),
    rssi: -80,
  },
];
