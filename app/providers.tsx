"use client";

import { CelestialBirthdayOrchestra } from "@/components/celestial/CelestialBirthdayOrchestra";
import { MoonPhaseWidget } from "@/components/celestial/MoonPhaseWidget";
import { HomeCoreButton } from "@/components/home/HomeCoreButton";
import { CelestialProvider } from "@/contexts/CelestialContext";
import { HomeGateProvider } from "@/contexts/HomeGateContext";
import { WorldMemoryProvider } from "@/contexts/WorldMemoryContext";
import { WhisperPlaybackProvider } from "@/contexts/WhisperPlaybackContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WhisperPlaybackProvider>
      <CelestialProvider>
        <WorldMemoryProvider>
          <HomeGateProvider>
            {children}
            <HomeCoreButton />
          </HomeGateProvider>
        </WorldMemoryProvider>
        <MoonPhaseWidget />
        <CelestialBirthdayOrchestra />
      </CelestialProvider>
    </WhisperPlaybackProvider>
  );
}
