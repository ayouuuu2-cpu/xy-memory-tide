"use client";

import { CelestialBirthdayOrchestra } from "@/components/celestial/CelestialBirthdayOrchestra";
import { CelestialBirthdaySplashModal } from "@/components/celestial/CelestialBirthdaySplashModal";
import { MemoryTideAssetWarmup } from "@/components/celestial/MemoryTideAssetWarmup";
import { MemoryTideSwRegister } from "@/components/celestial/MemoryTideSwRegister";
import { MoonPhaseWidget } from "@/components/celestial/MoonPhaseWidget";
import { RoryNotificationPermissionToast } from "@/components/celestial/RoryNotificationPermissionToast";
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
            <MemoryTideAssetWarmup />
            <HomeCoreButton />
            <MemoryTideSwRegister />
            <RoryNotificationPermissionToast />
            <CelestialBirthdaySplashModal />
          </HomeGateProvider>
        </WorldMemoryProvider>
        <MoonPhaseWidget />
        <CelestialBirthdayOrchestra />
      </CelestialProvider>
    </WhisperPlaybackProvider>
  );
}
