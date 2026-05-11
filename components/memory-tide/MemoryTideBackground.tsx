"use client";

import { CelestialConstellationLayer } from "@/components/celestial/CelestialConstellationLayer";
import { useCelestial } from "@/contexts/CelestialContext";
import { useWhisperPlayback } from "@/contexts/WhisperPlaybackContext";
import { ShootingStarsLayer } from "./ShootingStarsLayer";
import { StarDustField } from "./StarDustField";
import { TimeRippleLayer } from "./TimeRippleLayer";

type Props = {
  /** Central warm “tide” spotlight */
  showSpotlight?: boolean;
  className?: string;
  /** Optional override for star pulse (defaults from Whisper playback). */
  starAudioLevel?: number;
  /**
   * Opacity multiplier for twilight paint only (gradients, constellation, ripples, spotlight).
   * Stardust + shooting stars stay at full opacity so they read over mist (`opacity-48` on the whole tree used to hide them).
   */
  baseLayerMix?: number;
};

/**
 * Shared Blue Hour field: twilight gradient + drifting stardust + meteors + optional memory tide cone.
 */
export function MemoryTideBackground({
  showSpotlight = true,
  className = "",
  starAudioLevel: starOverride,
  baseLayerMix = 1,
}: Props) {
  const { isPlaying, volume } = useWhisperPlayback();
  const { celestialBirthday } = useCelestial();
  const starLevel = starOverride ?? (isPlaying ? volume : 0);
  const mix = Math.min(1, Math.max(0.12, baseLayerMix));

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute inset-0 z-0" style={{ opacity: mix }}>
        {celestialBirthday === "virgo" && (
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 55% at 70% 20%, rgba(255, 236, 200, 0.14) 0%, transparent 55%)",
            }}
          />
        )}
        {celestialBirthday === "scorpio" && (
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 85% 60% at 25% 25%, rgba(90, 60, 140, 0.22) 0%, transparent 58%)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(40,25,70,0.95) 0%, transparent 55%), radial-gradient(ellipse 90% 60% at 20% 20%, rgba(60,80,140,0.4) 0%, transparent 45%), radial-gradient(ellipse 70% 50% at 85% 30%, rgba(100,60,120,0.35) 0%, transparent 40%), linear-gradient(180deg, #121a3a 0%, #1a1038 35%, #0d0822 100%)",
          }}
        />
        {celestialBirthday && <CelestialConstellationLayer mode={celestialBirthday} />}
        <TimeRippleLayer active={isPlaying} />
        {showSpotlight && (
          <div
            className="absolute left-1/2 top-0 h-[88%] w-[min(140vmin,900px)] -translate-x-1/2"
            style={{
              background:
                "conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(255,245,220,0.1) 40deg, rgba(255,230,200,0.16) 90deg, rgba(200,210,255,0.06) 140deg, transparent 180deg), radial-gradient(ellipse 70% 45% at 50% 55%, rgba(255,236,210,0.28) 0%, rgba(255,200,230,0.08) 38%, transparent 72%)",
            }}
          />
        )}
      </div>

      {/* Stardust + meteors above wash, transparent — must stay pointer-events-none */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-transparent">
        <StarDustField baseCount={210} isPlaying={isPlaying} audioLevel={starLevel} />
        <ShootingStarsLayer />
      </div>
    </div>
  );
}
