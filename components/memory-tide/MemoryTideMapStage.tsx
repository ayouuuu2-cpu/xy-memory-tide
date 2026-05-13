"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { MemoryTideGlobe } from "@/components/globe/MemoryTideGlobe";
import { YUNNAN_LANDMARK } from "@/data/memories";

type Props = {
  mapSubdued: boolean;
  controlsEnabled: boolean;
  interactionLocked: boolean;
  selectedId: string | null;
  onSelectYunnan: () => void;
};

/**
 * LAYER 1 — spatial: fullscreen 3D Earth, single Yunnan marker, OrbitControls on the globe.
 */
export function MemoryTideMapStage({
  mapSubdued,
  controlsEnabled,
  interactionLocked,
  selectedId,
  onSelectYunnan,
}: Props) {
  const markers = useMemo(
    () => [
      {
        id: YUNNAN_LANDMARK.id,
        lat: YUNNAN_LANDMARK.position.lat,
        lng: YUNNAN_LANDMARK.position.lng,
        label: YUNNAN_LANDMARK.name,
        kind: "trace" as const,
        resonance: false,
      },
    ],
    [],
  );

  return (
    <motion.div
      className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
      animate={{ opacity: mapSubdued ? 0.38 : 1 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-[min(3vw,1.75rem)] py-4">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.32em] text-violet-400/50">
          Yunnan · only anchor
        </p>
        <Link
          href="/"
          className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-400/45 underline-offset-4 transition hover:text-violet-200/70"
        >
          相册首页
        </Link>
      </header>

      <div
        className={`relative z-0 isolate min-h-0 w-full flex-1 ${interactionLocked ? "pointer-events-none" : "pointer-events-auto"}`}
      >
        <MemoryTideGlobe
          markers={markers}
          selectedId={selectedId}
          controlsEnabled={controlsEnabled}
          onSelectMarker={(id) => {
            if (id === "yunnan") onSelectYunnan();
          }}
        />
      </div>

      <p className="pointer-events-none absolute bottom-[max(1rem,2dvh)] left-0 right-0 z-10 text-center text-[10px] tracking-[0.2em] text-violet-400/40">
        Drag to orbit the sphere · hover the light · click to open memory
      </p>
    </motion.div>
  );
}
