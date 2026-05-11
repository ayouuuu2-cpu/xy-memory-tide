"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ElementRef } from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { LandmarkMemory } from "@/data/memories";
import { latLngToUnitVector } from "@/lib/geo-sphere";

const EARTH_RADIUS = 1;
const CLOUD_SCALE = 1.018;

/** Stable CDN texture (continents + blue ocean); falls back to ocean color if load fails. */
const EARTH_TEXTURE_URL =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r184/examples/textures/planets/earth_atmos_2048.jpg";

type OrbitControlsHandle = ElementRef<typeof OrbitControls>;

type Props = {
  landmarks: LandmarkMemory[];
  focusLandmarkId: string | null;
  onLandmarkSelect: (id: string) => void;
};

function EarthMesh() {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      EARTH_TEXTURE_URL,
      (tex) => {
        if (!alive) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setMap(tex);
      },
      undefined,
      () => {
        if (alive) setMap(null);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      map?.dispose();
    },
    [map],
  );

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={map ?? undefined}
        color={map ? "#ffffff" : "#1a4a7c"}
        roughness={0.58}
        metalness={0.06}
        emissive="#061018"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

function CloudShell() {
  return (
    <mesh scale={CLOUD_SCALE}>
      <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
      <meshStandardMaterial
        color="#c8dcff"
        transparent
        opacity={0.16}
        depthWrite={false}
        side={THREE.DoubleSide}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function LandmarkMarker({
  lm,
  hovered,
  setHovered,
  onSelect,
  registerRef,
}: {
  lm: LandmarkMemory;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  onSelect: (id: string) => void;
  registerRef: (id: string, obj: THREE.Group | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isHover = hovered === lm.id;

  const dir = useMemo(
    () => latLngToUnitVector(lm.position.lat, lm.position.lng),
    [lm.position.lat, lm.position.lng],
  );

  useEffect(() => {
    registerRef(lm.id, groupRef.current);
    return () => registerRef(lm.id, null);
  }, [lm.id, registerRef]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const bob = isHover ? 0.04 : 0.016;
    const r = EARTH_RADIUS * 1.048 + Math.sin(t * 2.2 + lm.id.length * 0.7) * bob;
    g.position.copy(dir.clone().multiplyScalar(r));
    const s = THREE.MathUtils.lerp(g.scale.x, isHover ? 1.32 : 1, 0.14);
    g.scale.setScalar(s);
  });

  return (
    <group ref={groupRef}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(lm.id);
        }}
        onPointerOut={() => {
          setHovered(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(lm.id);
        }}
      >
        <sphereGeometry args={[0.05, 24, 24]} />
        <meshStandardMaterial
          color="#fff5ff"
          emissive="#e8b8ff"
          emissiveIntensity={isHover ? 1.85 : 0.95}
          roughness={0.4}
          metalness={0.12}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function EarthSystem({
  landmarks,
  focusLandmarkId,
  onLandmarkSelect,
}: Props) {
  const earthRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsHandle | null>(null);
  const markerRefs = useRef<Record<string, THREE.Group | null>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const { camera } = useThree();

  const registerRef = useCallback((id: string, obj: THREE.Group | null) => {
    markerRefs.current[id] = obj;
  }, []);

  useFrame((_, dt) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += dt * 0.028;
    }

    const ctrl = controlsRef.current;
    if (!ctrl) return;

    if (focusLandmarkId) {
      const m = markerRefs.current[focusLandmarkId];
      if (m) {
        const wp = new THREE.Vector3();
        m.getWorldPosition(wp);
        ctrl.target.lerp(wp, 1 - Math.pow(0.88, dt * 50));
        const view = wp.clone().normalize().multiplyScalar(2.12).add(new THREE.Vector3(0, 0.5, 0));
        camera.position.lerp(wp.clone().add(view), 1 - Math.pow(0.9, dt * 42));
      }
    } else {
      ctrl.target.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.pow(0.9, dt * 28));
    }
    ctrl.update();
  });

  return (
    <>
      <ambientLight intensity={0.34} color="#c8d8ff" />
      <directionalLight position={[8, 4, 6]} intensity={1.75} color="#fff4e8" castShadow />
      <directionalLight position={[-6, -1, -4]} intensity={0.35} color="#4060c8" />

      <Stars radius={80} depth={36} count={1600} factor={2.6} saturation={0.14} fade speed={0.45} />

      <group ref={earthRef}>
        <Suspense fallback={null}>
          <EarthMesh />
        </Suspense>
        <CloudShell />
        {landmarks.map((lm) => (
          <LandmarkMarker
            key={lm.id}
            lm={lm}
            hovered={hovered}
            setHovered={setHovered}
            onSelect={onLandmarkSelect}
            registerRef={registerRef}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom
        minDistance={1.88}
        maxDistance={6.2}
        enableDamping
        dampingFactor={0.055}
        rotateSpeed={0.62}
        zoomSpeed={0.52}
      />
    </>
  );
}

export function Earth(props: Props) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      shadows
      camera={{ position: [0, 0.22, 3.1], fov: 45, near: 0.05, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0a0e1c"]} />
      <fog attach="fog" args={["#080c18", 8, 26]} />
      <Suspense fallback={null}>
        <EarthSystem {...props} />
      </Suspense>
    </Canvas>
  );
}
