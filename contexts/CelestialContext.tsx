"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCelestialBirthdayToday, getMoonSnapshot, isFullMoonCoronationWindow, type CelestialBirthdayMode } from "@/lib/celestial";

export type MoonSnapshot = { fraction: number; phase: number; angle: number };

type CelestialValue = {
  moon: MoonSnapshot;
  isFullMoon: boolean;
  celestialBirthday: CelestialBirthdayMode | null;
};

const CelestialContext = createContext<CelestialValue | null>(null);

function compute(): CelestialValue {
  const now = new Date();
  return {
    moon: getMoonSnapshot(now),
    isFullMoon: isFullMoonCoronationWindow(now),
    celestialBirthday: getCelestialBirthdayToday(),
  };
}

export function CelestialProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo(() => {
    void tick;
    return compute();
  }, [tick]);

  useEffect(() => {
    const root = document.documentElement;
    if (value.isFullMoon) root.setAttribute("data-full-moon", "on");
    else root.removeAttribute("data-full-moon");
    if (value.celestialBirthday) root.setAttribute("data-celestial-birthday", value.celestialBirthday);
    else root.removeAttribute("data-celestial-birthday");
    return () => {
      root.removeAttribute("data-full-moon");
      root.removeAttribute("data-celestial-birthday");
    };
  }, [value.isFullMoon, value.celestialBirthday]);

  return <CelestialContext.Provider value={value}>{children}</CelestialContext.Provider>;
}

export function useCelestial(): CelestialValue {
  const ctx = useContext(CelestialContext);
  if (!ctx) {
    return {
      moon: { fraction: 0, phase: 0, angle: 0 },
      isFullMoon: false,
      celestialBirthday: null,
    };
  }
  return ctx;
}
