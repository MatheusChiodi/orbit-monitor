import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BackSide, TorusGeometry, Vector3, type Group, type Mesh, type Sprite } from 'three';
import { coreMaterial, glassMaterial, rimMaterial } from '../HeroOrb/orbMaterials';
import type { FxPalette } from '../palette';
import { heartbeatProgress, satelliteAngle, type OrbModel, type OrbRing, type OrbSatellite } from './orbModel';
import { SCENE_ELEVATION, statusColor } from './orbProjection';
import { glowTexture, orbitLineMaterial } from './orbShaders';

/** Drag / zoom state written by the wrapper's pointer handlers and read every frame. */
export interface OrbView {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface LivingOrbSceneProps {
  model: OrbModel;
  palette: FxPalette;
  /** 0..1 from the animation settings: speed, glow and idle drift. */
  intensity: number;
  view: MutableRefObject<OrbView>;
  focusedId: string | null;
  /** Positioned over the focused satellite every frame (DOM tooltip; data never goes into the canvas). */
  tooltip: MutableRefObject<HTMLDivElement | null>;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

const CAMERA_Z = 7;
const TRAIL = 5;
const world = new Vector3();

/** Same placement as `satellitePosition()` in orbModel, writing into a reusable vector. */
function placeOnRing(angle: number, r: number, tilt: number, target: Vector3): Vector3 {
  return target.set(Math.cos(angle) * r, -Math.sin(angle) * r * Math.sin(tilt), Math.sin(angle) * r * Math.cos(tilt));
}

function Core({ model, palette, intensity }: Pick<LivingOrbSceneProps, 'model' | 'palette' | 'intensity'>) {
  const color = statusColor(model.core.status, palette);
  const materials = useMemo(() => {
    const innerRim = rimMaterial({ blue: palette.from, green: palette.to }, 0.3);
    innerRim.side = BackSide;
    return {
      core: coreMaterial(model.core.status === 'OK' ? { blue: palette.from, green: palette.to } : { blue: color, green: color }),
      glass: glassMaterial({ blue: palette.from, green: palette.to }),
      rim: rimMaterial({ blue: palette.from, green: palette.to }, 0.8 + 0.4 * intensity),
      innerRim,
    };
  }, [model.core.status, model.core.brightness, palette, color, intensity]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const core = useRef<Mesh>(null);
  const halo = useRef<Sprite>(null);
  const cycle = Math.max(4, Math.min(...model.satellites.map((s) => s.intervalSeconds), 30));
  useFrame((state) => {
    // One soft breath per check cycle.
    const breath = Math.pow(0.5 - 0.5 * Math.cos((state.clock.elapsedTime / cycle) * Math.PI * 2), 3);
    core.current?.scale.setScalar(1 + 0.05 * breath * intensity);
    halo.current?.scale.setScalar(2.1 * (1 + 0.18 * breath * intensity));
  });

  return (
    <group>
      <mesh material={materials.innerRim} scale={0.97}>
        <sphereGeometry args={[1, 48, 48]} />
      </mesh>
      <mesh ref={core} material={materials.core}>
        <sphereGeometry args={[0.32, 40, 40]} />
      </mesh>
      {/* Bloom stand-in, on the core only: an additive sprite instead of a post-processing pass. */}
      <sprite ref={halo} scale={2.1}>
        <spriteMaterial
          map={glowTexture()}
          color={color}
          opacity={0.35 + 0.55 * model.core.brightness}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </sprite>
      <mesh material={materials.glass}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <mesh material={materials.rim} scale={1.015}>
        <sphereGeometry args={[1, 48, 48]} />
      </mesh>
    </group>
  );
}

function Ring({ ring, palette }: { ring: OrbRing; palette: FxPalette }) {
  const color = ring.status === 'OK' ? palette.from : statusColor(ring.status, palette);
  const geometry = useMemo(() => new TorusGeometry(ring.radius, 0.009 * ring.thickness, 6, 220), [ring.radius, ring.thickness]);
  const material = useMemo(() => orbitLineMaterial(color, ring.status === 'OK' ? 0.7 : 1, ring.radius), [color, ring.status, ring.radius]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);
  return <mesh geometry={geometry} material={material} rotation={[Math.PI / 2 + ring.tilt, 0, 0]} />;
}

interface SatelliteProps extends Pick<LivingOrbSceneProps, 'palette' | 'intensity' | 'onHover' | 'onSelect' | 'tooltip'> {
  sat: OrbSatellite;
  ring: OrbRing;
  focused: boolean;
}

function Satellite({ sat, ring, palette, intensity, focused, tooltip, onHover, onSelect }: SatelliteProps) {
  const color = statusColor(sat.status, palette);
  const body = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const { camera, size } = useThree();
  const r = ring.radius * sat.radiusFactor;

  useFrame((state) => {
    const seconds = state.clock.elapsedTime * (0.6 + 0.4 * intensity);
    const angle = satelliteAngle(sat, seconds);
    if (body.current) placeOnRing(angle, r, ring.tilt, body.current.position);
    if (pulse.current && body.current) {
      const progress = heartbeatProgress(sat, Date.now());
      pulse.current.visible = progress !== null;
      if (progress !== null) {
        pulse.current.position.copy(body.current.position).multiplyScalar(1 - progress);
        pulse.current.scale.setScalar(0.6 + 0.4 * Math.sin(progress * Math.PI));
      }
    }
    if (focused && tooltip.current && body.current) {
      body.current.getWorldPosition(world).project(camera);
      tooltip.current.style.transform = `translate(${((world.x + 1) / 2) * size.width}px, ${((1 - world.y) / 2) * size.height}px)`;
    }
  });

  const trail = useMemo(() => {
    if (!sat.trail) return [];
    return Array.from({ length: TRAIL }, (_, k) => {
      const p = placeOnRing(sat.baseAngle - (k + 1) * 0.06, r, ring.tilt, new Vector3());
      return { p, scale: 1 - (k + 1) / (TRAIL + 1), opacity: 0.55 - k * 0.1 };
    });
  }, [sat.trail, sat.baseAngle, r, ring.tilt]);

  return (
    <>
      {trail.map(({ p, scale, opacity }, k) => (
        <mesh key={k} position={p} scale={scale}>
          <sphereGeometry args={[sat.size, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      <group ref={body}>
        <mesh>
          {sat.hollow ? <torusGeometry args={[sat.size, sat.size * 0.22, 8, 32]} /> : <sphereGeometry args={[sat.size, 20, 20]} />}
          <meshBasicMaterial color={color} transparent opacity={sat.hollow ? 0.55 : 1} toneMapped={false} />
        </mesh>
        {(sat.amberHalo || focused || !sat.hollow) && (
          <sprite scale={sat.size * (sat.amberHalo ? 9 : 6) * (focused ? 1.6 : 1)}>
            <spriteMaterial
              map={glowTexture()}
              color={sat.amberHalo ? palette.warn : color}
              opacity={sat.amberHalo ? 0.85 : 0.5}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </sprite>
        )}
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover?.(sat.id);
          }}
          onPointerOut={() => onHover?.(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(sat.id);
          }}
        >
          <sphereGeometry args={[Math.max(0.12, sat.size * 3), 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={pulse} visible={false}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color={palette.glow} toneMapped={false} />
      </mesh>
    </>
  );
}

function Rig({ view, intensity, children }: Pick<LivingOrbSceneProps, 'view' | 'intensity'> & { children: ReactNode }) {
  const root = useRef<Group>(null);
  useFrame((state, delta) => {
    const { yaw, pitch, zoom } = view.current;
    const t = state.clock.elapsedTime;
    const drift = 0.04 + 0.04 * intensity;
    const targetY = yaw + Math.sin(t * 0.11) * drift;
    const targetX = SCENE_ELEVATION + pitch + Math.cos(t * 0.09) * drift * 0.5;
    if (root.current) {
      const k = Math.min(1, delta * 4);
      root.current.rotation.y += (targetY - root.current.rotation.y) * k;
      root.current.rotation.x += (targetX - root.current.rotation.x) * k;
    }
    state.camera.position.z += (CAMERA_Z / zoom - state.camera.position.z) * Math.min(1, delta * 5);
  });
  return (
    <group ref={root} position={[0, 0.22, 0]} rotation={[SCENE_ELEVATION, 0, 0]}>
      {children}
    </group>
  );
}

/** FE-59 live 3D map: core = health, a ring per group, a satellite per monitor. Lazy chunk. */
export function LivingOrbScene({ model, palette, intensity, view, focusedId, tooltip, onHover, onSelect }: LivingOrbSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, CAMERA_Z], fov: 34 }}
      data-testid="living-orb-canvas"
      onPointerMissed={() => onHover?.(null)}
    >
      <Rig view={view} intensity={intensity}>
        <Core model={model} palette={palette} intensity={intensity} />
        {model.rings.map((ring) => (
          <Ring key={ring.groupId} ring={ring} palette={palette} />
        ))}
        {model.satellites.map((sat) => {
          const ring = model.rings[sat.ring];
          return ring ? (
            <Satellite
              key={sat.id}
              sat={sat}
              ring={ring}
              palette={palette}
              intensity={intensity}
              focused={focusedId === sat.id}
              tooltip={tooltip}
              onHover={onHover}
              onSelect={onSelect}
            />
          ) : null;
        })}
      </Rig>
    </Canvas>
  );
}
