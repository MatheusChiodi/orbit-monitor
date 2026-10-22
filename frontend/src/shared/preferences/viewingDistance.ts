/** FE-08: wall viewing distance presets (shared with the FE-50 device preferences). */
export const VIEWING_DISTANCES = ['2m', '3m', '5m'] as const;
export type ViewingDistance = (typeof VIEWING_DISTANCES)[number];
export const DEFAULT_VIEWING_DISTANCE: ViewingDistance = '3m';

export function isViewingDistance(value: unknown): value is ViewingDistance {
  return typeof value === 'string' && (VIEWING_DISTANCES as readonly string[]).includes(value);
}
