import { motion } from "framer-motion";
import { Environment, Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, type RootState, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Component,
  forwardRef,
  memo,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import type { Intersection, Raycaster } from "three";
import { latLngToUnitVector } from "@/lib/geo-sphere";
import { RORY_SEAL } from "@/lib/rory-assets";
import { probeWebGL } from "@/lib/webgl-support";
import { createStylizedEarthTexture } from "@/lib/stylized-earth-texture";
import type { CelestialBirthdayMode } from "@/lib/celestial";
import type { GlobeMarker } from "./types";

const R = 1;

function buildFivePointStarExtrude(): THREE.ExtrudeGeometry {
  const outer = 0.052;
  const inner = 0.021;
  const points = 5;
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.005,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.001,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

const MEMORY_STAR_EXTRUDE = buildFivePointStarExtrude();

/** 默认相机位姿：选中记忆星时不拉近镜头；略远 + 略广 FOV，减少球体边缘裁切 */
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0.04, 3.12];
const DEFAULT_CAMERA_FOV = 44;

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
  /** 9·14 / 11·12：记忆星额外闪烁与配色（仅当日，由 CelestialContext 驱动）。 */
  celestialBirthday?: CelestialBirthdayMode | null;
  /** When false, orbit controls are disabled (e.g. memory activation overlay). */
  controlsEnabled?: boolean;
};

function englishStarLabel(raw: string) {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned || "Memory";
}

/** 命中体稍鼓出球面，避免被透明地球挡射线或与 OrbitControls 抢事件 */
const STAR_HIT_RADIUS = 0.095;
const STAR_HIT_BUMP_LOCAL_Z = 0.0078;

function DreamyStarParticles({
  wish,
  resonance,
  burst,
  scorpio,
}: {
  wish: boolean;
  resonance: boolean;
  burst?: boolean;
  scorpio?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = 10;
  const particleGeo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const r = 0.02 + (i % 5) * 0.0048;
      pos[i * 3] = Math.cos(t) * r;
      pos[i * 3 + 1] = Math.sin(t * 1.3) * r * 0.85;
      pos[i * 3 + 2] = Math.sin(t * 0.7) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useEffect(() => {
    return () => {
      particleGeo.dispose();
    };
  }, [particleGeo]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const mat = pts.material as THREE.PointsMaterial;
    const base = burst ? 0.52 : 0.38;
    const amp = burst ? 0.22 : 0.12;
    mat.opacity = (base + Math.sin(t * (burst ? 5.2 : 2.1)) * amp) * (resonance ? 1.25 : 1);
    if (scorpio) {
      mat.color.setHex(Math.sin(t * 6) > 0 ? 0xffc8f8 : 0xd8c0ff);
    } else {
      mat.color.set(wish ? "#d4e8ff" : "#fde4ff");
    }
    mat.size = (burst ? 0.015 : 0.0095) * (resonance ? 1.48 : 1);
    pts.rotation.y = t * (burst ? 0.55 : 0.35);
  });

  return (
    <points
      ref={ref}
      geometry={particleGeo}
      raycast={() => {
        void 0;
      }}
    >
      <pointsMaterial
        color="#ffe8f8"
        size={0.0095}
        transparent
        opacity={0.48}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

function SealInsetDisc() {
  const tex = useTexture(RORY_SEAL);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[0, 0, 0.013]} renderOrder={4}>
      <circleGeometry args={[0.019, 32]} />
      <meshBasicMaterial
        map={tex}
        transparent
        toneMapped={false}
        depthWrite={false}
        depthTest
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

const SurfaceStar = memo(function SurfaceStar({
  marker,
  selected,
  ritualPulse,
  birthday,
  onSelect,
  markerMapRef,
}: {
  marker: GlobeMarker;
  selected: boolean;
  ritualPulse: boolean;
  birthday: CelestialBirthdayMode | null;
  onSelect: (id: string) => void;
  markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
}) {
  const [hovered, setHovered] = useState(false);
  const outward = useMemo(
    () => latLngToUnitVector(marker.lat, marker.lng).clone().normalize(),
    [marker.lat, marker.lng],
  );
  const origin = useMemo(() => outward.clone().multiplyScalar(R * 1.0045), [outward]);

  const surfaceQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward.clone().normalize());
    return q;
  }, [outward]);

  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const id = marker.id;
    const mapRef = markerMapRef;
    const g = groupRef.current;
    if (g) mapRef.current.set(id, g);
    return () => {
      mapRef.current.delete(id);
    };
  }, [marker.id, markerMapRef]);

  useFrame((state) => {
    const mesh = visualRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const t = state.clock.elapsedTime;
    const resBoost = marker.resonance ? 1.92 : 1;
    const traceTone = marker.kind === "trace";

    let s = 1 + Math.sin(t * 2.15 + marker.id.length * 0.17) * 0.055;
    if (ritualPulse) s *= 1.22 + Math.sin(t * 8) * 0.2;
    else if (birthday === "virgo") s *= 1.06 + Math.sin(t * 14 + marker.id.length * 0.2) * 0.1;
    else if (birthday === "scorpio") s *= Math.sin(t * 6) > 0 ? 1.05 : 1;
    if (selected) s *= 1.1;
    if (hovered) s *= 1.05 + Math.sin(t * 4.2) * 0.024;
    if (marker.resonance) s *= 1.06;
    mesh.scale.setScalar(s);

    if (ritualPulse) {
      mat.emissive.set("#ffffff");
      mat.emissiveIntensity = 4.9 * resBoost;
    } else if (birthday === "scorpio") {
      mat.emissive.set(Math.sin(t * 6) > 0 ? "#ffb8f8" : "#c8b0ff");
      mat.emissiveIntensity = ((selected ? 2.85 : hovered ? 3.65 : 2.15) + Math.sin(t * 8) * 0.35) * resBoost;
    } else {
      mat.emissive.set(traceTone ? "#cfa4ff" : "#9ec8ff");
      const ei = (selected ? 2.45 : hovered ? 3.05 : 1.88) * resBoost;
      mat.emissiveIntensity = ei + Math.sin(t * 5 + marker.id.length) * 0.24;
    }
  });

  const pickSurface = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
  };

  const onPick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(marker.id);
  };

  return (
    <group ref={groupRef} position={origin} quaternion={surfaceQuat}>
      <DreamyStarParticles
        wish={marker.kind === "wish"}
        resonance={marker.resonance}
        burst={birthday === "virgo"}
        scorpio={birthday === "scorpio"}
      />
      <mesh
        position={[0, 0, STAR_HIT_BUMP_LOCAL_Z]}
        onPointerDown={pickSurface}
        onClick={onPick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[STAR_HIT_RADIUS, 18, 18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest />
      </mesh>
      <mesh
        ref={visualRef}
        geometry={MEMORY_STAR_EXTRUDE}
        raycast={() => {
          /* 仅由上层透明 hit sphere 接收射线 */
        }}
      >
        <meshStandardMaterial
          color={marker.kind === "wish" ? "#f2fbff" : "#fff7ff"}
          emissive={marker.kind === "wish" ? "#9ec8ff" : "#cfa4ff"}
          emissiveIntensity={1.85}
          toneMapped={false}
          roughness={ritualPulse ? 0.2 : 0.32}
          metalness={ritualPulse ? 0.32 : 0.14}
          depthWrite
        />
      </mesh>
      <Suspense fallback={null}>
        <SealInsetDisc />
      </Suspense>
    </group>
  );
});

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

function StarLabelOverlay({
  markers,
  selectedId,
  ritualPulseMarkerId,
  markerMapRef,
}: {
  markers: GlobeMarker[];
  selectedId: string | null;
  ritualPulseMarkerId: string | null | undefined;
  markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
}) {
  const { camera, gl } = useThree();
  const v = useRef(new THREE.Vector3());
  const world = useRef(new THREE.Vector3());
  const normal = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const lastUpdateRef = useRef(0);
  const setVisibility = (el: HTMLDivElement, show: boolean) => {
    const next = show ? "1" : "0";
    if (el.dataset.v === next) return;
    el.dataset.v = next;
    el.style.visibility = show ? "visible" : "hidden";
    el.style.opacity = show ? "1" : "0";
  };

  useFrame((state) => {
    if (state.clock.elapsedTime - lastUpdateRef.current < 1 / 30) return;
    lastUpdateRef.current = state.clock.elapsedTime;
    const rect = gl.domElement.getBoundingClientRect();
    const offsetPx = 14;
    camDir.current.copy(camera.position).normalize();

    for (const m of markers) {
      const obj = markerMapRef.current.get(m.id);
      const el = labelRefs.current.get(m.id);
      if (!el) continue;
      if (!obj) {
        setVisibility(el, false);
        continue;
      }

      obj.updateWorldMatrix(true, true);
      obj.getWorldPosition(world.current);
      normal.current.copy(world.current).normalize();
      const frontHemisphere = normal.current.dot(camDir.current) > 0;
      if (!frontHemisphere) {
        setVisibility(el, false);
        continue;
      }

      v.current.copy(world.current).project(camera);
      if (Math.abs(v.current.x) > 1.08 || Math.abs(v.current.y) > 1.08 || v.current.z > 1) {
        setVisibility(el, false);
        continue;
      }

      const x = (v.current.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-v.current.y * 0.5 + 0.5) * rect.height + rect.top;
      const above = v.current.y > 0;
      const y2 = y + (above ? -offsetPx : offsetPx);

      el.style.transform = `translate3d(${x}px, ${y2}px, 0) translate(-50%, -50%)`;
      setVisibility(el, true);
    }
  });

  return (
    <Html fullscreen style={{ pointerEvents: "none" }} zIndexRange={[240, 0]}>
      <div className="memory-tide-star-label-overlay-root" aria-hidden>
        {markers.map((m) => {
          const selected = selectedId === m.id;
          const pulse = ritualPulseMarkerId === m.id;
          const trace = m.kind === "trace";
          return (
            <div
              key={m.id}
              ref={(node) => {
                if (node) labelRefs.current.set(m.id, node);
                else labelRefs.current.delete(m.id);
              }}
              className={[
                "memory-tide-star-label-overlay-item",
                trace ? "memory-tide-star-label-overlay-item--trace" : "memory-tide-star-label-overlay-item--wish",
                m.resonance ? "memory-tide-star-label-overlay-item--resonance" : "",
                selected ? "memory-tide-star-label-overlay-item--selected" : "",
                pulse ? "memory-tide-star-label-overlay-item--pulse" : "",
              ].join(" ")}
            >
              {englishStarLabel(m.label)}
            </div>
          );
        })}
      </div>
    </Html>
  );
}

function GlobeRenderScheduler({
  controlsRef,
  animate,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  animate: boolean;
}) {
  const { invalidate } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onChange = () => invalidate();
    controls.addEventListener("change", onChange);
    return () => controls.removeEventListener("change", onChange);
  }, [controlsRef, invalidate]);

  useEffect(() => {
    if (!animate) return;
    let stopped = false;
    let rafId = 0;
    let last = 0;
    const tick = (now: number) => {
      if (stopped) return;
      if (now - last >= 1000 / 30) {
        last = now;
        invalidate();
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [animate, invalidate]);

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
  celestialBirthday = null,
  markersEnabled,
}: MemoryTideGlobeProps & {
  map: THREE.CanvasTexture | null;
  markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>>;
  markersEnabled: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const spinRef = useRef<THREE.Group>(null);
  const isFullMoon = Boolean(fullMoon);
  const amb = isFullMoon ? 0.56 : 0.38;
  const dirKey = isFullMoon ? 1.48 : 1.25;
  const envI = isFullMoon ? 0.42 : 0.28;

  const animateScene =
    controlsEnabled || Boolean(selectedId) || Boolean(ritualPulseMarkerId) || Boolean(celestialBirthday);

  useFrame((state, delta) => {
    if (!animateScene) return;
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
        <mesh
          /** 果冻地球仅作视觉；参与拾取会挡住略鼓起的记忆星，导致「点了没反应」。 */
          raycast={(_raycaster: Raycaster, _intersects: Intersection[]) => {
            void _raycaster;
            void _intersects;
          }}
        >
          <sphereGeometry args={[R, 72, 72]} />
          <meshPhysicalMaterial
            map={map ?? undefined}
            color={map ? "#f5f2ff" : "#e2d8f5"}
            transmission={0.975}
            thickness={0.52}
            roughness={0.035}
            metalness={0}
            ior={1.52}
            transparent
            opacity={0.82}
            attenuationColor="#f0ecff"
            attenuationDistance={12}
            specularIntensity={1.08}
            specularColor="#ffffff"
            emissive="#4538a0"
            emissiveIntensity={isFullMoon ? 0.05 : 0.035}
            envMapIntensity={isFullMoon ? 0.68 : 0.52}
            clearcoat={0.42}
            clearcoatRoughness={0.09}
          />
        </mesh>
        {markersEnabled
          ? markers.map((m) => (
              <SurfaceStar
                key={m.id}
                marker={m}
                selected={selectedId === m.id}
                ritualPulse={ritualPulseMarkerId === m.id}
                birthday={celestialBirthday ?? null}
                onSelect={onSelectMarker}
                markerMapRef={markerMapRef}
              />
            ))
          : null}
      </group>

      {markersEnabled ? (
        <StarLabelOverlay
          markers={markers}
          selectedId={selectedId}
          ritualPulseMarkerId={ritualPulseMarkerId ?? null}
          markerMapRef={markerMapRef}
        />
      ) : null}

      <OrbitControls
        ref={controlsRef}
        enabled={controlsEnabled}
        enablePan={false}
        minDistance={0.55}
        maxDistance={5.2}
        enableDamping
        dampingFactor={0.088}
        rotateSpeed={0.46}
        zoomSpeed={0.48}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI - 0.12}
      />
      <GlobeRenderScheduler controlsRef={controlsRef} animate={animateScene} />
    </>
  );
}

function onCanvasCreated(state: RootState) {
  const { gl, scene, camera } = state;
  gl.setClearColor(0x000000, 0);
  scene.background = null;
  const canvas = gl.domElement;
  canvas.style.backgroundColor = "transparent";
  canvas.style.boxShadow = "none";
  canvas.style.outline = "none";
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
  const { width, height } = canvas;
  if (camera instanceof THREE.PerspectiveCamera && width > 0 && height > 0) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
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
  celestialBirthday = null,
}: MemoryTideGlobeProps) {
  const isFullMoon = Boolean(fullMoon);
  const pulseBirthday = celestialBirthday === "virgo" || celestialBirthday === "scorpio";
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
                      : pulseBirthday
                        ? "animate-pulse border-fuchsia-300/45 bg-gradient-to-r from-fuchsia-500/25 to-violet-500/25 text-violet-50 shadow-[0_0_18px_rgba(255,180,240,0.35)]"
                        : m.kind === "wish"
                          ? "border-l-[3px] border-l-sky-300/80 border-white/10 bg-white/[0.06] text-sky-50/95 hover:border-sky-200/50 hover:bg-white/[0.1]"
                          : "border-l-[3px] border-l-fuchsia-300/80 border-white/10 bg-white/[0.06] text-violet-100/85 hover:border-violet-300/35 hover:bg-white/[0.1]"
                } ${m.resonance ? "shadow-[0_0_22px_rgba(255,210,255,0.45)]" : ""}`}
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
  {
    markers,
    selectedId,
    onSelectMarker,
    ritualPulseMarkerId,
    fullMoon = false,
    celestialBirthday = null,
    controlsEnabled = true,
  },
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
      const id = window.setTimeout(() => {
        setGlReady(false);
        setMarkersAllowed(false);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [mode]);

  useEffect(() => {
    if (!glReady || mode !== "webgl") return;
    const t = window.setTimeout(() => setMarkersAllowed(true), 90);
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
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (!cancelled) setMap(tex);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
      tex.dispose();
    };
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
        celestialBirthday={celestialBirthday ?? null}
      />
    );
  }

  return (
    <div
      id="three-globe-container"
      className="relative z-0 h-full min-h-0 w-full overflow-visible [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:max-h-full"
    >
      <GlobeCanvasCrashBoundary
        onRecovery={() => {
          setMode("fallback");
          setGlReady(false);
          setMarkersAllowed(false);
        }}
      >
        <Canvas
          className="relative z-0 block h-full w-full max-h-full touch-none outline-none !bg-transparent"
          style={{ background: "transparent", width: "100%", height: "100%", display: "block" }}
          shadows={false}
          camera={{ position: DEFAULT_CAMERA_POSITION, fov: DEFAULT_CAMERA_FOV, near: 0.05, far: 200 }}
          gl={{
            antialias: false,
            alpha: true,
            depth: true,
            stencil: false,
            powerPreference: "default",
            premultipliedAlpha: false,
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={[1, 1.5]}
          frameloop="demand"
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
              celestialBirthday={celestialBirthday ?? null}
              controlsEnabled={controlsEnabled}
              markersEnabled={markersAllowed}
            />
            <MarkerProjectionBridge forwardedRef={innerHandleRef} markerMapRef={markerMapRef} />
          </Suspense>
        </Canvas>
      </GlobeCanvasCrashBoundary>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-none"
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
