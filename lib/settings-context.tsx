"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Settings {
  alertRadiusM: number;
  unitSystem: "metric" | "imperial";
  darkMode: boolean;
  pushNotifications: boolean;
}

const defaultSettings: Settings = {
  alertRadiusM: 300,
  unitSystem: "metric",
  darkMode: true,
  pushNotifications: false,
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ff-settings");
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("ff-settings", JSON.stringify(settings));
    }
  }, [settings, loaded]);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
