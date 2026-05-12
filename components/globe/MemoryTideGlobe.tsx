import { motion } from "framer-motion";
import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, type RootState, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { latLngToUnitVector } from "@/lib/geo-sphere";
import { probeWebGL } from "@/lib/webgl-support";
import { createStylizedEarthTexture } from "@/lib/stylized-earth-texture";
import type { GlobeMarker } from "./types";

const R = 1;

export type MemoryTideGlobeHandle = {
  projectMarkerToScreen: (markerId: string) => { x: number; y: number } | null;
};

export type MemoryTideGlobeProps = {
  markers: GlobeMarker[];
  selectedId: string | null;
  onSelectMarker: (id: string | null) => void;
  /** Wish ritual: bright pulse on this marker before it ascends. */
  ritualPulseMarkerId?: string | null;
  /** Full-moon coronation: brighter ambient on the jelly Earth. */
  fullMoon?: boolean;
  /** When false, orbit controls are disabled (e.g. memory activation overlay). */
  controlsEnabled?: boolean;
};

function SurfaceStar({
  marker,
  selected,
  ritualPulse,
  onSelect,
  markerMapRef,
}: {
  marker: GlobeMarker;
  selected: boolean;
  ritualPulse: boolean;
  onSelect: (id: string) => void;
  markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(
    () => latLngToUnitVector(marker.lat, marker.lng).clone().multiplyScalar(R * 1.006),
    [marker.lat, marker.lng],
  );
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const m = meshRef.current;
    if (m) markerMapRef.current.set(marker.id, m);
    return () => {
      markerMapRef.current.delete(marker.id);
    };
  }, [marker.id, markerMapRef]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    if (ritualPulse) {
      const pulse = 1.45 + Math.sin(t * 8) * 0.38;
      mesh.scale.setScalar(pulse);
    } else {
      const breath = 1 + Math.sin(t * 2.15 + marker.id.length * 0.17) * 0.065;
      const hoverLift = hovered ? 0.12 + Math.sin(t * 4.2) * 0.048 : 0;
      mesh.scale.setScalar((selected ? 1.2 : 1) * breath + hoverLift);
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(marker.id);
  };

  const emissive = ritualPulse ? "#ffffff" : selected ? "#ffa8ff" : hovered ? "#ffe8c8" : "#ffd090";
  const emissiveIntensity = ritualPulse ? 5.5 : selected ? 2.8 : hovered ? 4.1 : 1.85;

  return (
    <mesh
      ref={meshRef}
      position={pos}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      <octahedronGeometry args={[0.032, 0]} />
      <meshStandardMaterial
        color="#fffaf0"
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        toneMapped={false}
        roughness={ritualPulse ? 0.22 : 0.35}
        metalness={ritualPulse ? 0.35 : 0.15}
      />
    </mesh>
  );
}

function MarkerProjectionBridge({
  forwardedRef,
  markerMapRef,
}: {
  forwardedRef: React.Ref<MemoryTideGlobeHandle | null>;
  markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
}) {
  const { camera, gl } = useThree();
  useImperativeHandle(forwardedRef, () => ({
    projectMarkerToScreen(markerId: string) {
      const obj = markerMapRef.current.get(markerId);
      if (!obj) return null;
      const v = new THREE.Vector3();
      obj.updateWorldMatrix(true, true);
      obj.getWorldPosition(v);
      v.project(camera);
      if (Math.abs(v.x) > 1.08 || Math.abs(v.y) > 1.08) return null;
      const rect = gl.domElement.getBoundingClientRect();
      const x = (v.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
      return { x, y };
    },
  }));
  return null;
}

function GlobeWorld({
  map,
  markers,
  selectedId,
  onSelectMarker,
  ritualPulseMarkerId,
  markerMapRef,
  fullMoon = false,
  controlsEnabled = true,
  markersEnabled,
}: MemoryTideGlobeProps & {
  map: THREE.CanvasTexture | null;
  markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
  markersEnabled: boolean;
}) {
  const spinRef = useRef<THREE.Group>(null);
  const isFullMoon = Boolean(fullMoon);
  const amb = isFullMoon ? 0.56 : 0.38;
  const dirKey = isFullMoon ? 1.48 : 1.25;
  const envI = isFullMoon ? 0.42 : 0.28;

  useFrame((state, delta) => {
    const g = spinRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(delta, 0.05);
    const drift = 0.048 + Math.sin(t * 0.38) * 0.012;
    g.rotation.y += d * drift;
  });

  return (
    <>
      <ambientLight intensity={amb} color={isFullMoon ? "#fff4e8" : "#c8d4ff"} />
      <directionalLight position={[6, 4, 7]} intensity={dirKey} color={isFullMoon ? "#fffaf0" : "#fff6ee"} />
      <directionalLight position={[-5, -2, -5]} intensity={isFullMoon ? 0.55 : 0.45} color="#5070e8" />

      <Suspense fallback={null}>
        <Environment preset="night" environmentIntensity={envI} blur={1} />
      </Suspense>

      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[R, 96, 96]} />
          <meshPhysicalMaterial
            map={map ?? undefined}
            color={map ? "#f2eeff" : "#c4b8e8"}
            transmission={0.9}
            thickness={1.35}
            roughness={0.1}
            metalness={0}
            ior={1.47}
            transparent
            opacity={0.5}
            attenuationColor="#9b85ff"
            attenuationDistance={2.8}
            specularIntensity={0.95}
            specularColor="#ffffff"
            emissive="#5c4ab0"
            emissiveIntensity={isFullMoon ? 0.22 : 0.14}
            envMapIntensity={isFullMoon ? 0.62 : 0.45}
          />
        </mesh>
        {markersEnabled
          ? markers.map((m) => (
              <SurfaceStar
                key={m.id}
                marker={m}
                selected={selectedId === m.id}
                ritualPulse={ritualPulseMarkerId === m.id}
                onSelect={onSelectMarker}
                markerMapRef={markerMapRef}
              />
            ))
          : null}
      </group>

      <OrbitControls
        enabled={controlsEnabled}
        enablePan={false}
        minDistance={2.2}
        maxDistance={6}
        enableDamping
        dampingFactor={0.088}
        rotateSpeed={0.46}
        zoomSpeed={0.48}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI - 0.12}
      />
    </>
  );
}

function onCanvasCreated(state: RootState) {
  const { gl, scene } = state;
  gl.setClearColor(0x000000, 0);
  scene.background = null;
  const canvas = gl.domElement;
  canvas.style.backgroundColor = "transparent";
  canvas.style.boxShadow = "none";
  canvas.style.outline = "none";
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
}

type GlobeUiMode = "probing" | "webgl" | "fallback";

class GlobeCanvasCrashBoundary extends Component<
  { children: ReactNode; onRecovery: () => void },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  componentDidCatch() {
    this.props.onRecovery();
  }

  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

function MemoryTideGlobeFlatFallback({
  markers,
  selectedId,
  onSelectMarker,
  ritualPulseMarkerId,
  fullMoon = false,
}: MemoryTideGlobeProps) {
  const isFullMoon = Boolean(fullMoon);
  return (
    <div
      className={`flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-4 rounded-2xl border px-4 py-6 text-center shadow-[inset_0_0_80px_rgba(80,60,140,0.12)] ${
        isFullMoon
          ? "border-amber-200/20 bg-[radial-gradient(ellipse_at_50%_35%,rgba(200,170,120,0.28),rgba(20,12,28,0.94))]"
          : "border-violet-400/15 bg-[radial-gradient(ellipse_at_50%_35%,rgba(120,90,200,0.35),rgba(15,10,30,0.92))]"
      }`}
      role="region"
      aria-label="3D globe unavailable in this environment"
    >
      <p className="max-w-sm font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/75">
        WebGL unavailable
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-violet-200/55">
        This view needs hardware-accelerated 3D. Your marks still work — open them from the list below, or try another
        browser or device.
      </p>
      {markers.length > 0 ? (
        <div className="flex max-h-[40vh] w-full max-w-md flex-wrap justify-center gap-2 overflow-y-auto">
          {markers.map((m) => {
            const selected = selectedId === m.id;
            const ritual = ritualPulseMarkerId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMarker(m.id)}
                className={`rounded-full border px-3 py-1.5 text-left text-[11px] font-medium transition ${
                  ritual
                    ? "animate-pulse border-white/50 bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                    : selected
                      ? "border-violet-300/50 bg-violet-500/25 text-violet-50"
                      : "border-white/10 bg-white/[0.06] text-violet-100/85 hover:border-violet-300/35 hover:bg-white/[0.1]"
                }`}
              >
                <span className="block max-w-[200px] truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function handleCanvasCreated(state: RootState, onGlReady: () => void) {
  onCanvasCreated(state);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      onGlReady();
    });
  });
}

export const MemoryTideGlobe = forwardRef<MemoryTideGlobeHandle | null, MemoryTideGlobeProps>(function MemoryTideGlobe(
  { markers, selectedId, onSelectMarker, ritualPulseMarkerId, fullMoon = false, controlsEnabled = true },
  ref,
) {
  const [domReady, setDomReady] = useState(false);
  const [mode, setMode] = useState<GlobeUiMode>("probing");
  const [map, setMap] = useState<THREE.CanvasTexture | null>(null);
  const [glReady, setGlReady] = useState(false);
  const [markersAllowed, setMarkersAllowed] = useState(false);
  const markerMapRef = useRef(new Map<string, THREE.Object3D>());
  const innerHandleRef = useRef<MemoryTideGlobeHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setDomReady(true);
        setMode(probeWebGL() ? "webgl" : "fallback");
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    if (mode !== "webgl") {
      setGlReady(false);
      setMarkersAllowed(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!glReady || mode !== "webgl") return;
    const t = window.setTimeout(() => setMarkersAllowed(true), 280);
    return () => clearTimeout(t);
  }, [glReady, mode]);

  useImperativeHandle(
    ref,
    () => ({
      projectMarkerToScreen(markerId: string) {
        if (mode !== "webgl" || !markersAllowed) return null;
        return innerHandleRef.current?.projectMarkerToScreen(markerId) ?? null;
      },
    }),
    [mode, markersAllowed],
  );

  useEffect(() => {
    if (mode !== "webgl") return;
    const tex = createStylizedEarthTexture();
    setMap(tex);
    return () => tex.dispose();
  }, [mode]);

  if (!domReady) {
    return (
      <div
        className="relative z-0 block h-full min-h-[180px] w-full bg-transparent"
        aria-hidden
      />
    );
  }

  if (mode === "fallback") {
    return (
      <MemoryTideGlobeFlatFallback
        markers={markers}
        selectedId={selectedId}
        onSelectMarker={onSelectMarker}
        ritualPulseMarkerId={ritualPulseMarkerId ?? null}
        fullMoon={Boolean(fullMoon)}
      />
    );
  }

  return (
    <div className="relative z-0 h-full min-h-[180px] w-full min-h-0 overflow-hidden rounded-2xl">
      <GlobeCanvasCrashBoundary
        onRecovery={() => {
          setMode("fallback");
          setGlReady(false);
          setMarkersAllowed(false);
        }}
      >
        <Canvas
          className="relative z-0 block h-full w-full touch-none outline-none !bg-transparent"
          style={{ background: "transparent" }}
          shadows={false}
          camera={{ position: [0, 0.2, 3.22], fov: 38, near: 0.05, far: 200 }}
          gl={{
            antialias: false,
            alpha: true,
            depth: true,
            stencil: false,
            powerPreference: "default",
            premultipliedAlpha: false,
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={[1, 2]}
          onPointerMissed={() => onSelectMarker(null)}
          onCreated={(s) => handleCanvasCreated(s, () => setGlReady(true))}
        >
          <Suspense fallback={null}>
            <GlobeWorld
              map={map}
              markers={markers}
              selectedId={selectedId}
              onSelectMarker={onSelectMarker}
              ritualPulseMarkerId={ritualPulseMarkerId ?? null}
              markerMapRef={markerMapRef}
              fullMoon={Boolean(fullMoon)}
              controlsEnabled={controlsEnabled}
              markersEnabled={markersAllowed}
            />
            <MarkerProjectionBridge forwardedRef={innerHandleRef} markerMapRef={markerMapRef} />
          </Suspense>
        </Canvas>
      </GlobeCanvasCrashBoundary>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-2xl"
        initial={false}
        animate={{ opacity: glReady ? 0 : 0.24 }}
        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "linear-gradient(155deg, rgba(8,5,18,0.55) 0%, rgba(28,18,48,0.22) 45%, rgba(6,4,14,0.35) 100%)",
        }}
      />
    </div>
  );
});
