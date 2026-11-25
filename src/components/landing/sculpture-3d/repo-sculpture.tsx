"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

interface SculptureSceneProps {
  onInteract?: (element: string) => void;
}

function SculptureMeshGroup({ onInteract }: SculptureSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const monolithRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const terracottaRef = useRef<THREE.Mesh>(null);
  const wineRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<THREE.Group>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // GSAP Entrance Animation
  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (monolithRef.current) {
        gsap.from(monolithRef.current.position, {
          y: -1.2,
          duration: 1.6,
          ease: "power3.out",
        });
        gsap.from(monolithRef.current.scale, {
          x: 0.6,
          y: 0.6,
          z: 0.6,
          duration: 1.6,
          ease: "power3.out",
        });
      }

      if (ringRef.current) {
        gsap.from(ringRef.current.rotation, {
          z: Math.PI * 1.5,
          duration: 2.2,
          ease: "power2.out",
        });
      }

      if (terracottaRef.current) {
        gsap.from(terracottaRef.current.position, {
          x: -2.5,
          y: 1.5,
          duration: 1.8,
          delay: 0.2,
          ease: "back.out(1.4)",
        });
      }

      if (wineRef.current) {
        gsap.from(wineRef.current.position, {
          x: 2.5,
          y: -1.5,
          duration: 1.8,
          delay: 0.35,
          ease: "back.out(1.4)",
        });
      }

      if (pinRef.current) {
        gsap.from(pinRef.current.position, {
          y: 3.0,
          duration: 1.5,
          delay: 0.1,
          ease: "power3.out",
        });
      }
    });

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // Frame Loop: Smooth mouse parallax and calm breathing oscillation
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (prefersReducedMotion) {
      groupRef.current.rotation.set(0.12, 0.45, 0);
      return;
    }

    const t = state.clock.getElapsedTime();

    // Mouse parallax target rotation
    const targetRotY = state.pointer.x * 0.45;
    const targetRotX = -state.pointer.y * 0.28;

    // Gentle breathing oscillation
    const idleY = Math.sin(t * 0.5) * 0.08;
    const idleX = Math.cos(t * 0.4) * 0.04;

    // Smooth dampening
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      0.35 + targetRotY + idleY,
      3.5,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      0.1 + targetRotX + idleX,
      3.5,
      delta
    );

    // Subtle independent rotation for the brass evidence ring
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.15;
    }

    // Micro floating for audit tokens
    if (terracottaRef.current) {
      terracottaRef.current.position.y = 0.35 + Math.sin(t * 1.2) * 0.05;
    }
    if (wineRef.current) {
      wineRef.current.position.y = -0.28 + Math.cos(t * 1.1) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* 1. Stone / Ceramic Base Pedestal */}
      <mesh position={[0, -1.35, 0]} receiveShadow>
        <cylinderGeometry args={[1.65, 1.85, 0.32, 48]} />
        <meshStandardMaterial
          color="#DCD6CA"
          roughness={0.82}
          metalness={0.04}
        />
      </mesh>

      {/* 2. Frosted Glass Monolith (Source Core AST) */}
      <mesh
        ref={monolithRef}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
        onPointerOver={() => {
          setHoveredElement("AST Core");
          onInteract?.("AST Core");
        }}
        onPointerOut={() => setHoveredElement(null)}
      >
        <boxGeometry args={[1.28, 1.85, 0.92]} />
        <meshPhysicalMaterial
          color="#FAF8F3"
          roughness={0.16}
          transmission={0.88}
          thickness={1.35}
          ior={1.48}
          attenuationColor="#ECE4D8"
          attenuationDistance={1.1}
          transparent={true}
          opacity={0.96}
        />
      </mesh>

      {/* Inner Monolith Wireframe / Syntactic Lattice */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.05, 1.55, 0.72]} />
        <meshBasicMaterial
          color="#9E7D46"
          wireframe={true}
          transparent={true}
          opacity={0.35}
        />
      </mesh>

      {/* 3. Interlocking Brushed Brass Ring (Evidence Dependency Graph) */}
      <mesh
        ref={ringRef}
        position={[0, 0.05, 0]}
        rotation={[Math.PI / 3.2, Math.PI / 6, 0]}
        onPointerOver={() => {
          setHoveredElement("Evidence Ring");
          onInteract?.("Evidence Ring");
        }}
        onPointerOut={() => setHoveredElement(null)}
      >
        <torusGeometry args={[1.26, 0.042, 24, 64]} />
        <meshStandardMaterial
          color={hoveredElement === "Evidence Ring" ? "#E0BC75" : "#C5A566"}
          metalness={0.88}
          roughness={0.24}
        />
      </mesh>

      {/* Brass Axis Pin passing through the Monolith */}
      <group ref={pinRef} position={[0, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 2.65, 32]} />
          <meshStandardMaterial
            color="#9E7D46"
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 1.34, 0]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color="#C5A566"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 4. Floating Terracotta Audit Token (Claim Verification) */}
      <mesh
        ref={terracottaRef}
        position={[-1.28, 0.35, 0.45]}
        rotation={[0.2, 0.35, -0.1]}
        castShadow
        onPointerOver={() => {
          setHoveredElement("Verified Claim");
          onInteract?.("Verified Claim");
        }}
        onPointerOut={() => setHoveredElement(null)}
      >
        <boxGeometry args={[0.54, 0.48, 0.38]} />
        <meshStandardMaterial
          color={hoveredElement === "Verified Claim" ? "#D96848" : "#C15C3D"}
          roughness={0.68}
          metalness={0.06}
        />
      </mesh>

      {/* 5. Floating Earthy Wine Rubric Token (Viva Evaluation) */}
      <mesh
        ref={wineRef}
        position={[1.24, -0.28, 0.38]}
        rotation={[-0.15, -0.4, 0.2]}
        castShadow
        onPointerOver={() => {
          setHoveredElement("Rubric Metric");
          onInteract?.("Rubric Metric");
        }}
        onPointerOut={() => setHoveredElement(null)}
      >
        <boxGeometry args={[0.5, 0.62, 0.42]} />
        <meshStandardMaterial
          color={hoveredElement === "Rubric Metric" ? "#8A3B48" : "#6E2E39"}
          roughness={0.52}
          metalness={0.12}
        />
      </mesh>

      {/* 6. Contact Soft Ground Shadow */}
      <ContactShadows
        position={[0, -1.48, 0]}
        opacity={0.42}
        scale={6}
        blur={2.4}
        far={3.5}
      />
    </group>
  );
}

export function RepoSculpture({ onInteract }: SculptureSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 4.8], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      className="h-full w-full"
    >
      {/* Studio Lighting System */}
      <ambientLight intensity={0.82} color="#FFF8F0" />
      <directionalLight
        position={[-3.5, 4.5, 3]}
        intensity={1.9}
        color="#FFF9F2"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[3.5, -2, -2]}
        intensity={0.65}
        color="#EBE2D3"
      />
      <pointLight position={[0, 0.3, 0.5]} intensity={0.5} color="#F2D7A5" />

      {/* Central Interactive Sculpture */}
      <SculptureMeshGroup onInteract={onInteract} />
    </Canvas>
  );
}
