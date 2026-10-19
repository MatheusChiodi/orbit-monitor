import { useEffect, useMemo } from 'react';
import { BackSide } from 'three';
import {
  coreMaterial,
  glassMaterial,
  gradientRing,
  haloMaterial,
  rimMaterial,
  type OrbPalette,
} from '../../src/shared/fx/HeroOrb/orbMaterials';

const RING_RADIUS = 1.62;
const RING_TILT: [number, number, number] = [1.18, 0.18, -0.32];

export type RemotionOrbProps = {
  /** Seconds since the orb appeared; every motion derives from it (no useFrame in Remotion). */
  time: number;
  palette: OrbPalette;
  /** 0..1: how much of the ring has "powered on". */
  ring: number;
};

/** The hero orb, driven by the Remotion timeline instead of the render loop. */
export function RemotionOrb({ time, palette, ring }: RemotionOrbProps) {
  const materials = useMemo(() => {
    const innerRim = rimMaterial(palette, 0.35);
    innerRim.side = BackSide;
    return {
      rim: rimMaterial(palette, 1.3),
      innerRim,
      core: coreMaterial(palette),
      glass: glassMaterial(palette),
      halo: haloMaterial(palette.green, 0.85),
      glint: haloMaterial('#dff0ff', 0.9),
      ring: gradientRing(palette, RING_RADIUS, 0.012),
      outer: gradientRing(palette, RING_RADIUS * 1.32, 0.005),
    };
  }, [palette]);

  useEffect(
    () => () => {
      for (const item of Object.values(materials)) item.dispose();
    },
    [materials],
  );

  const satellite = time * 0.9;
  return (
    <group rotation={[Math.sin(time * 0.5) * 0.05, Math.cos(time * 0.4) * 0.08, 0]}>
      <mesh material={materials.innerRim} scale={0.97}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <mesh material={materials.core} scale={0.8 + 0.2 * Math.min(1, time)}>
        <sphereGeometry args={[0.3, 48, 48]} />
      </mesh>
      <mesh material={materials.halo} position={[0, 0, 0.32]}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>
      <mesh material={materials.glass}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>
      <mesh material={materials.rim} scale={1.015}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <group rotation={RING_TILT} scale={0.6 + 0.4 * ring}>
        <group rotation={[0, 0, time * 0.3]}>
          <mesh geometry={materials.ring}>
            <meshBasicMaterial vertexColors transparent opacity={0.9 * ring} toneMapped={false} />
          </mesh>
          <group position={[Math.cos(satellite) * RING_RADIUS, Math.sin(satellite) * RING_RADIUS, 0]}>
            <mesh>
              <sphereGeometry args={[0.05, 24, 24]} />
              <meshBasicMaterial color="#f2f7ff" transparent opacity={ring} toneMapped={false} />
            </mesh>
            <mesh material={materials.glint} rotation={[-RING_TILT[0], 0, 0]}>
              <planeGeometry args={[0.42, 0.42]} />
            </mesh>
          </group>
        </group>
        <mesh geometry={materials.outer} rotation={[0.12, -0.2, 0]}>
          <meshBasicMaterial vertexColors transparent opacity={0.28 * ring} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
