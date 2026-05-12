"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CursorSparkles } from "@/components/playful/CursorSparkles";
import { YUNNAN_LANDMARK } from "@/data/memories";
import { MEMORY_TIDE_HOME_EVENT } from "@/contexts/HomeGateContext";
import { useLandmarks } from "@/hooks/useLandmarks";
import { pickActivationPhrase, randomActivationDurationMs } from "@/lib/memory-transition-phrases";
import { MemoryActivationInterstitial } from "./MemoryActivationInterstitial";
import { MemoryTideHomeGate } from "./MemoryTideHomeGate";
import { MemoryTideMapStage } from "./MemoryTideMapStage";
import { YunnanMemoryRevealPanel } from "./YunnanMemoryRevealPanel";

type Phase = "home" | "map" | "activating" | "memory";

type ActivationSession = {
  text: string;
  mode: "fragment" | "system" | "echo";
  durationMs: number;
};

/**
 * Travel Memory Map System — orchestrates HOME → ENTER (3D map) → activation interstitial → MEMORY overlay.
 * No route changes; global Home control resets phase via `MEMORY_TIDE_HOME_EVENT`.
 */
export function MemoryTideShell() {
  const [phase, setPhase] = useState<Phase>("home");
  const [activation, setActivation] = useState<ActivationSession | null>(null);
  const [memoryContentReady, setMemoryContentReady] = useState(false);
  const { landmarks } = useLandmarks();

  const yunnan = useMemo(
    () => landmarks.find((l) => l.id === "yunnan") ?? YUNNAN_LANDMARK,
    [landmarks],
  );

  useEffect(() => {
    const onHome = () => {
      setPhase("home");
      setActivation(null);
      setMemoryContentReady(false);
    };
    window.addEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
    return () => window.removeEventListener(MEMORY_TIDE_HOME_EVENT, onHome);
  }, []);

  const enterMap = useCallback(() => setPhase("map"), []);

  const beginActivation = useCallback(() => {
    const p = pickActivationPhrase();
    setActivation({
      text: p.text,
      mode: p.mode,
      durationMs: randomActivationDurationMs(),
    });
    setPhase("activating");
  }, []);

  const finishActivation = useCallback(() => {
    const ms = 220 + Math.floor(Math.random() * 280);
    window.setTimeout(() => {
      setPhase("memory");
      setActivation(null);
    }, ms);
  }, []);

  useEffect(() => {
    if (phase !== "memory") {
      setMemoryContentReady(false);
      return;
    }
    const t = window.setTimeout(() => setMemoryContentReady(true), 240);
    return () => clearTimeout(t);
  }, [phase]);

  const backToMap = useCallback(() => setPhase("map"), []);

  const spatialOpen = phase === "map" || phase === "activating" || phase === "memory";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#03040a] text-[#f4f0ff] supports-[min-height:100dvh]:min-h-[100dvh] min-h-screen min-w-0">
      <CursorSparkles />
      <div className="pointer-events-none absolute inset-0 min-h-[100dvh] min-h-screen bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(35,28,70,0.5),#03040a_50%)]" />

      <div className="relative isolate z-[2] flex h-full min-h-0 w-full min-w-0 flex-col">
        <AnimatePresence mode="wait">
          {phase === "home" ? (
            <motion.div
              key="home-wrap"
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <MemoryTideHomeGate onEnterMap={enterMap} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {spatialOpen ? (
            <motion.div
              key="spatial"
              className="absolute inset-0 z-0 flex min-h-0 min-w-0 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <MemoryTideMapStage
                mapSubdued={phase === "activating" || phase === "memory"}
                controlsEnabled={phase === "map"}
                interactionLocked={phase === "activating" || phase === "memory"}
                selectedId={phase === "memory" ? "yunnan" : null}
                onSelectYunnan={beginActivation}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "activating" && activation ? (
            <MemoryActivationInterstitial
              key="activation"
              phrase={activation.text}
              mode={activation.mode}
              durationMs={activation.durationMs}
              onComplete={finishActivation}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "memory" ? (
            <motion.div
              key="memory-panel-wrap"
              className="absolute inset-0 z-20 flex items-center justify-center p-[min(2.5vw,1.5rem)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <YunnanMemoryRevealPanel landmark={yunnan} onCloseToMap={backToMap} revealReady={memoryContentReady} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
