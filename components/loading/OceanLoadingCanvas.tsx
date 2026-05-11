"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { oceanFragmentShader, oceanVertexShader } from "@/components/world/ocean-shaders";

/** Deterministic pseudo-random for stable SSR/client particle layouts. */
function detRand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 43.758) * 43758.5453123;
  return x - Math.floor(x);
}

function OceanPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { clock } = useThree();

  const shader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: oceanVertexShader,
        fragmentShader: oceanFragmentShader,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(() => {
    const mat = meshRef.current?.material;
    if (mat instanceof THREE.ShaderMaterial) {
      mat.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} material={shader}>
      <planeGeometry args={[48, 48, 128, 128]} />
    </mesh>
  );
}

function FloatingStars({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (detRand(i, 1) - 0.5) * 28;
      arr[i * 3 + 1] = detRand(i, 2) * 10 + 2;
      arr[i * 3 + 2] = (detRand(i, 3) - 0.5) * 28;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#dde8ff" size={0.06} transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

function SoftParticles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (detRand(i, 4) - 0.5) * 22;
      arr[i * 3 + 1] = detRand(i, 5) * 8;
      arr[i * 3 + 2] = (detRand(i, 6) - 0.5) * 22;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c8b8ff" size={0.04} transparent opacity={0.35} />
    </points>
  );
}

export function OceanLoadingCanvas() {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      camera={{ position: [0, 5.2, 9], fov: 52, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#050a18"]} />
      <fog attach="fog" args={["#070f22", 12, 55]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} color="#b8c8ff" />
      <directionalLight position={[-6, 8, -4]} intensity={0.45} color="#4060a0" />
      <OceanPlane />
      <FloatingStars count={420} />
      <SoftParticles count={180} />
    </Canvas>
  );
}
