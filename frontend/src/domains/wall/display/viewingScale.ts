import {
  DEFAULT_VIEWING_DISTANCE,
  VIEWING_DISTANCES,
  isViewingDistance,
  type ViewingDistance,
} from '@/shared/preferences/viewingDistance';

export { DEFAULT_VIEWING_DISTANCE, VIEWING_DISTANCES, isViewingDistance, type ViewingDistance };

/** FE-08: multiplier applied to the fluid wall base; 3 m is the design reference. */
const SCALE: Record<ViewingDistance, number> = { '2m': 0.85, '3m': 1, '5m': 1.35 };

export function viewingScale(distance: ViewingDistance): number {
  return SCALE[distance];
}

/** Fluid base `clamp(12px, .7vw + .45vh, 36px)` scaled by the preset; the 12 px floor and 36 px cap stay. */
export function fluidFontSize(distance: ViewingDistance): string {
  return `clamp(12px, calc((.7vw + .45vh) * ${SCALE[distance]}), 36px)`;
}

/** Sets `--wall-scale`, read by `html.wall` in `app/theme.css`. */
export function applyViewingScale(distance: ViewingDistance, root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--wall-scale', String(SCALE[distance]));
}

/** `?scale=2m|3m|5m`; anything else falls back to 3 m. */
export function scaleFromSearch(search: string): ViewingDistance {
  const value = new URLSearchParams(search).get('scale');
  return isViewingDistance(value) ? value : DEFAULT_VIEWING_DISTANCE;
}
