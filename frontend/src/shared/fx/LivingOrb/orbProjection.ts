import type { FxPalette } from '../palette';
import { satellitePosition, type OrbModel, type OrbStatus } from './orbModel';

/** Camera elevation over the orbit plane; the 3D scene rotates its root by the same angle. */
export const SCENE_ELEVATION = 0.42;

/** Orthographic view of an orb-plane point: `up` on screen (y grows upwards) and `depth` towards the viewer. */
export function project([x, y, z]: readonly [number, number, number], elevation = SCENE_ELEVATION) {
  return {
    x,
    up: y * Math.cos(elevation) - z * Math.sin(elevation),
    depth: y * Math.sin(elevation) + z * Math.cos(elevation),
  };
}

/** Far things fade: depth -r..r maps to 0.4..1 opacity. */
export function depthFade(depth: number, radius: number): number {
  if (radius <= 0) return 1;
  const t = Math.min(1, Math.max(0, (depth + radius) / (2 * radius)));
  return 0.4 + 0.6 * t;
}

export function statusColor(status: OrbStatus, palette: FxPalette): string {
  switch (status) {
    case 'OK':
      return palette.ok;
    case 'WARN':
      return palette.warn;
    case 'DOWN':
      return palette.down;
    case 'UNKNOWN':
      return palette.muted;
  }
}

/** View box of the 2D orb (OrbSvg) for a model. */
export function svgFrame(rings: readonly { radius: number }[], mini = false) {
  const outer = Math.max(1.2, ...rings.map((r) => r.radius));
  const width = outer * 2 + (mini ? 0.3 : 0.6);
  const height = mini ? width : outer * 2 * Math.sin(SCENE_ELEVATION) + 1.6;
  return { outer, width, height };
}

/** Where a satellite sits on the 2D orb, as fractions (0..1) of the view box, for the DOM tooltip. */
export function satelliteSvgPoint(model: OrbModel, id: string): { x: number; y: number } | null {
  const sat = model.satellites.find((s) => s.id === id);
  const ring = sat ? model.rings[sat.ring] : undefined;
  if (!sat || !ring) return null;
  const { width, height } = svgFrame(model.rings);
  const p = project(satellitePosition(sat, ring, 0));
  return { x: (p.x + width / 2) / width, y: (-p.up + height / 2) / height };
}
