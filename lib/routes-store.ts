export interface RouteData {
  geometry: [number, number][];
  distance: number; // meters
  duration: number; // seconds
  label: string;
  hasFlooding: boolean;
  floodLevel: "none" | "moderate" | "severe";
  nearbySensors: string[];
}

export interface Course {
  id: string;
  name: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  endAddress: string;
  endLat: number;
  endLng: number;
  routesAtoB: RouteData[];
  routesBtoA: RouteData[];
  schedule: {
    mode: "always" | "scheduled";
    days: boolean[];
    startTime: string;
    endTime: string;
  };
}

const STORAGE_KEY = "ff-courses";

export function loadCourses(): Course[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCourses(courses: Course[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
