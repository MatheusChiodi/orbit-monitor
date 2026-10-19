import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { BackSide, type Group } from 'three';
import {
  coreMaterial,
  glassMaterial,
  gradientRing,
  haloMaterial,
  readOrbPalette,
  rimMaterial,
  type OrbPalette,
} from './orbMaterials';

export interface OrbSceneProps {
  /** 0..1 from the FX level: scales motion speed, parallax and glow. */
  intensity: number;
}

const RING_RADIUS = 1.62;
const RING_TILT: [number, number, number] = [1.18, 0.18, -0.32];

/** Pointer position over the whole window (-1..1), for a subtle parallax. TVs without a mouse idle-drift. */
function usePointer() {
  const pointer = useRef({ x: 0, y: 0, active: false });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
        active: true,
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return pointer;
}

function Orb({ intensity, palette }: OrbSceneProps & { palette: OrbPalette }) {
  const root = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const satellite = useRef<Group>(null);
  const pointer = usePointer();

  const rim = useMemo(() => rimMaterial(palette, 0.9 + intensity * 0.5), [palette, intensity]);
  const core = useMemo(() => coreMaterial(palette), [palette]);
  const glass = useMemo(() => glassMaterial(palette), [palette]);
  const coreHalo = useMemo(() => haloMaterial(palette.green, 0.5 + intensity * 0.3), [palette, intensity]);
  const innerRim = useMemo(() => {
    const material = rimMaterial(palette, 0.35);
    material.side = BackSide;
    return material;
  }, [palette]);
  const glint = useMemo(() => haloMaterial('#dff0ff', 0.9), []);
  const ringGeometry = useMemo(() => gradientRing(palette, RING_RADIUS, 0.012), [palette]);
  const outerRing = useMemo(() => gradientRing(palette, RING_RADIUS * 1.32, 0.005), [palette]);

  useEffect(
    () => () => {
      rim.dispose();
      core.dispose();
      glass.dispose();
      innerRim.dispose();
      coreHalo.dispose();
      glint.dispose();
      ringGeometry.dispose();
      outerRing.dispose();
    },
    [rim, core, glass, innerRim, coreHalo, glint, ringGeometry, outerRing],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const speed = 0.5 + intensity * 0.5;
    if (ring.current) ring.current.rotation.z += delta * 0.14 * speed;
    if (satellite.current) {
      const a = t * 0.42 * speed;
      satellite.current.position.set(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0);
    }
    if (root.current) {
      const p = pointer.current;
      const reach = 0.1 + intensity * 0.08;
      const targetX = p.active ? p.y * reach : Math.sin(t * 0.21) * 0.05;
      const targetY = p.active ? p.x * reach : Math.cos(t * 0.17) * 0.07;
      root.current.rotation.x += (targetX - root.current.rotation.x) * Math.min(1, delta * 2.5);
      root.current.rotation.y += (targetY - root.current.rotation.y) * Math.min(1, delta * 2.5);
      root.current.position.y = Math.sin(t * 0.6) * 0.03;
    }
  });

  return (
    <group ref={root}>
      <mesh material={innerRim} scale={0.97}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <mesh material={core}>
        <sphereGeometry args={[0.3, 48, 48]} />
      </mesh>
      <mesh material={coreHalo} position={[0, 0, 0.32]}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>
      <mesh material={glass}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>
      <mesh material={rim} scale={1.015}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <group rotation={RING_TILT}>
        <group ref={ring}>
          <mesh geometry={ringGeometry}>
            <meshBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} />
          </mesh>
          <group ref={satellite}>
            <mesh>
              <sphereGeometry args={[0.05, 24, 24]} />
              <meshBasicMaterial color="#f2f7ff" toneMapped={false} />
            </mesh>
            <mesh material={glint} rotation={[-RING_TILT[0], 0, 0]}>
              <planeGeometry args={[0.42, 0.42]} />
            </mesh>
          </group>
        </group>
        <mesh geometry={outerRing} rotation={[0.12, -0.2, 0]}>
          <meshBasicMaterial vertexColors transparent opacity={0.28} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Live 3D orb for the calm hero: glass sphere, glowing core, orbiting satellite ring. */
export function OrbScene({ intensity }: OrbSceneProps) {
  const palette = useMemo(readOrbPalette, []);
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 4.4], fov: 36 }}
      aria-hidden="true"
      data-testid="fx-orb-canvas"
    >
      <Orb intensity={intensity} palette={palette} />
    </Canvas>
  );
}
