import { useId } from 'react';
import type { FxPalette } from '../palette';
import { satellitePosition, type OrbModel } from './orbModel';
import { SCENE_ELEVATION, depthFade, project, statusColor, svgFrame } from './orbProjection';

export interface OrbSvgProps {
  model: OrbModel;
  palette: FxPalette;
  /** Mini orb (header): core and rings only. */
  mini?: boolean;
  /** Keyboard / hover focus ring around one satellite. */
  focusedId?: string | null;
  className?: string;
}

const TRAIL = 4;

/**
 * Static 2D projection of the living orb: the `minimal` level, the fallback without WebGL and
 * while the 3D chunk loads, and the header mini orb. Decorative; the text summary carries the data.
 */
export function OrbSvg({ model, palette, mini = false, focusedId = null, className = '' }: OrbSvgProps) {
  const id = useId();
  const { outer, width, height } = svgFrame(model.rings, mini);
  if (mini) return <MiniOrbSvg model={model} palette={palette} className={className} id={id} />;
  const core = statusColor(model.core.status, palette);
  // A ring tilted about x by `tilt`, seen from the camera elevation, is an ellipse of ry = r·sin(e + tilt).
  const ellipseRy = (r: number, tilt: number) => r * Math.abs(Math.sin(SCENE_ELEVATION + tilt));

  return (
    <svg
      aria-hidden="true"
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      className={className}
      data-testid={mini ? 'mini-orb' : 'orb-svg'}
      data-core={model.core.status}
    >
      <defs>
        <radialGradient id={`${id}-core`} cx="40%" cy="35%" r="65%">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.55 * model.core.brightness} />
          <stop offset="0.35" stopColor={core} stopOpacity={0.55 + 0.45 * model.core.brightness} />
          <stop offset="1" stopColor={core} stopOpacity={0.15} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor={core} stopOpacity={0.35 * model.core.brightness} />
          <stop offset="1" stopColor={core} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={mini ? 0.9 : 0.95} fill={`url(#${id}-halo)`} />
      {model.rings.map((ring) => (
        <ellipse
          key={ring.groupId}
          data-ring={ring.groupId}
          data-status={ring.status}
          rx={ring.radius}
          ry={ellipseRy(ring.radius, ring.tilt)}
          fill="none"
          stroke={ring.status === 'OK' ? palette.from : statusColor(ring.status, palette)}
          strokeOpacity={ring.status === 'OK' ? 0.4 : 0.75}
          strokeWidth={(mini ? 0.09 : 0.018) * ring.thickness}
        />
      ))}
      <circle r={mini ? 0.55 : 0.42} fill={`url(#${id}-core)`} />
      {!mini &&
        model.satellites.map((sat) => {
          const ring = model.rings[sat.ring];
          if (!ring) return null;
          const color = statusColor(sat.status, palette);
          const at = (angleOffset: number) => {
            const p = project(satellitePosition({ ...sat, baseAngle: sat.baseAngle - angleOffset }, ring, 0));
            return { x: p.x, y: -p.up, opacity: depthFade(p.depth, outer) };
          };
          const head = at(0);
          return (
            <g key={sat.id} data-satellite={sat.id} data-status={sat.status} opacity={sat.hollow ? 0.5 : head.opacity}>
              {sat.trail &&
                Array.from({ length: TRAIL }, (_, k) => {
                  const p = at((k + 1) * 0.07);
                  return <circle key={k} cx={p.x} cy={p.y} r={sat.size * (1 - (k + 1) / (TRAIL + 1))} fill={color} opacity={0.5 - k * 0.1} />;
                })}
              {sat.amberHalo && <circle cx={head.x} cy={head.y} r={sat.size * 2.6} fill="none" stroke={palette.warn} strokeOpacity={0.6} strokeWidth={0.02} />}
              <circle
                cx={head.x}
                cy={head.y}
                r={sat.size}
                fill={sat.hollow ? 'none' : color}
                stroke={color}
                strokeWidth={sat.hollow ? 0.018 : 0}
              />
              {focusedId === sat.id && <circle cx={head.x} cy={head.y} r={sat.size * 2.2} fill="none" stroke={palette.text} strokeWidth={0.02} />}
            </g>
          );
        })}
    </svg>
  );
}

/** Header mini orb: seen from above, so the rings read as concentric circles around the core. */
function MiniOrbSvg({ model, palette, className, id }: { model: OrbModel; palette: FxPalette; className: string; id: string }) {
  const core = statusColor(model.core.status, palette);
  const n = model.rings.length;
  return (
    <svg aria-hidden="true" viewBox="-1 -1 2 2" className={className} data-testid="mini-orb" data-core={model.core.status}>
      <defs>
        <radialGradient id={`${id}-mini`} cx="40%" cy="35%" r="65%">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.6} />
          <stop offset="0.4" stopColor={core} />
          <stop offset="1" stopColor={core} stopOpacity={0.55} />
        </radialGradient>
      </defs>
      {model.rings.map((ring, i) => (
        <circle
          key={ring.groupId}
          data-ring={ring.groupId}
          data-status={ring.status}
          r={n > 1 ? 0.6 + (0.34 * i) / (n - 1) : 0.8}
          fill="none"
          stroke={ring.status === 'OK' ? palette.from : statusColor(ring.status, palette)}
          strokeOpacity={ring.status === 'OK' ? 0.55 : 0.95}
          strokeWidth={0.07}
        />
      ))}
      <circle r={0.42} fill={`url(#${id}-mini)`} />
    </svg>
  );
}
