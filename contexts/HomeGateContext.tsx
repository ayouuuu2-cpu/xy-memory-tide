"use client";

import { useRouter, usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const MEMORY_TIDE_HOME_EVENT = "memory-tide-home";

type Ctx = {
  /** Monotonic counter — subscribers can reset local UI when this changes. */
  homeVersion: number;
  /** Global Home: go to `/`, bump version, broadcast event (close zoom / overlays). */
  requestHome: () => void;
};

const HomeGateContext = createContext<Ctx | null>(null);

export function HomeGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [homeVersion, setHomeVersion] = useState(0);

  const requestHome = useCallback(() => {
    setHomeVersion((v) => {
      const next = v + 1;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MEMORY_TIDE_HOME_EVENT, { detail: { version: next } }));
      }
      return next;
    });
    if (pathname !== "/") {
      router.push("/");
    }
  }, [pathname, router]);

  const value = useMemo(() => ({ homeVersion, requestHome }), [homeVersion, requestHome]);

  return <HomeGateContext.Provider value={value}>{children}</HomeGateContext.Provider>;
}

export function useHomeGate(): Ctx {
  const ctx = useContext(HomeGateContext);
  if (!ctx) {
    return {
      homeVersion: 0,
      requestHome: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(MEMORY_TIDE_HOME_EVENT));
        }
      },
    };
  }
  return ctx;
}
