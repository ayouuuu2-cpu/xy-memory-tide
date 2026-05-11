"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, type RootState, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLngToUnitVector } from "@/lib/geo-sphere";
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
      const pulse = 1 + Math.sin(t * 3 + marker.id.length * 0.2) * 0.12;
      mesh.scale.setScalar((selected ? 1.25 : 1) * pulse);
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(marker.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={pos}
      onClick={onClick}
    >
      <octahedronGeometry args={[0.032, 0]} />
      <meshStandardMaterial
        color="#fffaf0"
        emissive={ritualPulse ? "#ffffff" : selected ? "#ffa8ff" : "#ffd090"}
        emissiveIntensity={ritualPulse ? 5.5 : selected ? 2.8 : 2}
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
}: MemoryTideGlobeProps & { map: THREE.CanvasTexture | null; markerMapRef: React.MutableRefObject<Map<string, THREE.Object3D>> }) {
  const spinRef = useRef<THREE.Group>(null);
  const isFullMoon = Boolean(fullMoon);
  const amb = isFullMoon ? 0.56 : 0.38;
  const dirKey = isFullMoon ? 1.48 : 1.25;
  const envI = isFullMoon ? 0.42 : 0.28;

  useFrame(() => {
    if (spinRef.current) {
      spinRef.current.rotation.y += 0.00085;
    }
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
        {markers.map((m) => (
          <SurfaceStar
            key={m.id}
            marker={m}
            selected={selectedId === m.id}
            ritualPulse={ritualPulseMarkerId === m.id}
            onSelect={onSelectMarker}
            markerMapRef={markerMapRef}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={6}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.5}
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

export const MemoryTideGlobe = forwardRef<MemoryTideGlobeHandle | null, MemoryTideGlobeProps>(function MemoryTideGlobe(
  { markers, selectedId, onSelectMarker, ritualPulseMarkerId, fullMoon = false },
  ref,
) {
  const [map, setMap] = useState<THREE.CanvasTexture | null>(null);
  const markerMapRef = useRef(new Map<string, THREE.Object3D>());

  useEffect(() => {
    const tex = createStylizedEarthTexture();
    setMap(tex);
    return () => tex.dispose();
  }, []);

  return (
    <Canvas
      className="block h-full w-full touch-none outline-none !bg-transparent"
      style={{ background: "transparent" }}
      shadows={false}
      camera={{ position: [0, 0.2, 3.22], fov: 38, near: 0.05, far: 200 }}
      gl={{
        antialias: true,
        alpha: true,
        depth: true,
        stencil: false,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
      }}
      dpr={[1, 2]}
      onPointerMissed={() => onSelectMarker(null)}
      onCreated={onCanvasCreated}
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
        />
        <MarkerProjectionBridge forwardedRef={ref} markerMapRef={markerMapRef} />
      </Suspense>
    </Canvas>
  );
});
