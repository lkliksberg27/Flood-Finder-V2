import { sensors, Sensor } from "./mock-data";

// Haversine distance in meters
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Minimum distance from a point to a polyline
export function pointToPolylineDistance(
  lat: number,
  lng: number,
  polyline: [number, number][]
): number {
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i];
    const [bLat, bLng] = polyline[i + 1];
    // Project point onto segment
    const dx = bLng - aLng;
    const dy = bLat - aLat;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      minDist = Math.min(minDist, haversineDistance(lat, lng, aLat, aLng));
      continue;
    }
    let t = ((lng - aLng) * dx + (lat - aLat) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projLat = aLat + t * dy;
    const projLng = aLng + t * dx;
    minDist = Math.min(minDist, haversineDistance(lat, lng, projLat, projLng));
  }
  return minDist;
}

// Check which sensors are near a route within given radius
export function checkFloodingOnRoute(
  route: [number, number][],
  radiusM: number
): { hasFlooding: boolean; floodLevel: "none" | "moderate" | "severe"; nearbySensors: string[] } {
  const nearbySensors: string[] = [];
  let floodLevel: "none" | "moderate" | "severe" = "none";

  for (const sensor of sensors) {
    if (sensor.status === "OK") continue;
    const dist = pointToPolylineDistance(sensor.lat, sensor.lng, route);
    if (dist <= radiusM) {
      nearbySensors.push(sensor.deviceId);
      if (sensor.status === "ALERT") {
        floodLevel = "severe";
      } else if (sensor.status === "WARN" && floodLevel !== "severe") {
        floodLevel = "moderate";
      }
    }
  }

  return {
    hasFlooding: nearbySensors.length > 0,
    floodLevel,
    nearbySensors,
  };
}

// Fetch OSRM routes
export async function fetchRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<
  { geometry: [number, number][]; distance: number; duration: number }[]
> {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=3&overview=full&geometries=geojson`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Routing failed");
  const data = await resp.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No routes found");
  }

  return data.routes.map(
    (r: { geometry: { coordinates: number[][] }; distance: number; duration: number }) => ({
      geometry: r.geometry.coordinates.map(
        (c: number[]) => [c[1], c[0]] as [number, number]
      ),
      distance: r.distance,
      duration: r.duration,
    })
  );
}

// Geocode search
export async function geocodeSearch(
  query: string
): Promise<{ display_name: string; lat: number; lng: number }[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&limit=5&countrycodes=us`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.map((item: { display_name: string; lat: string; lon: string }) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}
