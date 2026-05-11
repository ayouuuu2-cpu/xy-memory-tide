"use client";

import { CelestialBirthdayOrchestra } from "@/components/celestial/CelestialBirthdayOrchestra";
import { MoonPhaseWidget } from "@/components/celestial/MoonPhaseWidget";
import { HomeCoreButton } from "@/components/home/HomeCoreButton";
import { CelestialProvider } from "@/contexts/CelestialContext";
import { HomeGateProvider } from "@/contexts/HomeGateContext";
import { WhisperPlaybackProvider } from "@/contexts/WhisperPlaybackContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WhisperPlaybackProvider>
      <CelestialProvider>
        <HomeGateProvider>
          {children}
          <HomeCoreButton />
        </HomeGateProvider>
        <MoonPhaseWidget />
        <CelestialBirthdayOrchestra />
      </CelestialProvider>
    </WhisperPlaybackProvider>
  );
}
