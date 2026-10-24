import { useMemo } from 'react';
import type { Group } from '@/shared/api/types';
import { useFxPalette } from '../palette';
import { buildOrbModel, type OrbMonitor } from './orbModel';
import { OrbSvg } from './OrbSvg';

export interface MiniOrbProps {
  monitors: readonly OrbMonitor[];
  groups: readonly Group[];
  uptime24h: number;
  className?: string;
}

/**
 * 24–32 px header orb: core (worst state) and one ring per group, no satellites (FE-59).
 * Decorative: the status pill next to it carries the words.
 */
export function MiniOrb({ monitors, groups, uptime24h, className = 'size-6' }: MiniOrbProps) {
  const palette = useFxPalette();
  const model = useMemo(() => buildOrbModel({ monitors, groups, uptime24h }), [monitors, groups, uptime24h]);
  return <OrbSvg model={model} palette={palette} mini className={className} />;
}
