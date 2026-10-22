/** FE-07: console density. The scale multiplies spacing tokens; buttons keep ≥ 1.85 rem (2.2 rem × 0.85). */
export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = (typeof DENSITIES)[number];
export const DEFAULT_DENSITY: Density = 'comfortable';

const SCALE: Record<Density, number> = { compact: 0.85, comfortable: 1, spacious: 1.15 };
const FONT_PX: Record<Density, number> = { compact: 14, comfortable: 15, spacious: 16 };

export function isDensity(value: unknown): value is Density {
  return typeof value === 'string' && (DENSITIES as readonly string[]).includes(value);
}

export function densityScale(density: Density): number {
  return SCALE[density];
}

/** Console body font size in px (13–16 px range). */
export function densityFontSize(density: Density): number {
  return FONT_PX[density];
}

/** Marks the console root (`data-density`) and sets `--density-scale` / `--density-font`. */
export function applyDensity(density: Density, root: HTMLElement = document.documentElement): void {
  root.dataset.density = density;
  root.style.setProperty('--density-scale', String(SCALE[density]));
  root.style.setProperty('--density-font', `${FONT_PX[density]}px`);
}
