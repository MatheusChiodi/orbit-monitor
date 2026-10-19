import type { Status } from '@/shared/api/types';

/**
 * Categorical slots for identity (stacked segments, donut slices, small multiples), in fixed order, never cycled.
 * Themes override `--viz-1..8`; the fallbacks are the dataviz reference palette stepped for a dark surface
 * (validated: worst adjacent CVD ΔE 8.4, normal-vision ΔE 19.3). Status colors stay reserved for state.
 */
export const CATEGORICAL = [
  'var(--viz-1, #3987e5)',
  'var(--viz-2, #d95926)',
  'var(--viz-3, #199e70)',
  'var(--viz-4, #c98500)',
  'var(--viz-5, #d55181)',
  'var(--viz-6, #008300)',
  'var(--viz-7, #9085e9)',
  'var(--viz-8, #e66767)',
] as const;

/** Past this many identities, fold into "Other" or facet. */
export const MAX_CATEGORICAL = CATEGORICAL.length;

export function categorical(index: number): string {
  return CATEGORICAL[Math.min(index, CATEGORICAL.length - 1)]!;
}

export const STATUS_COLOR: Record<Status | 'INFO' | 'neutral', string> = {
  OK: 'var(--ok)',
  WARN: 'var(--warn)',
  DOWN: 'var(--down)',
  INFO: 'var(--info)',
  neutral: 'var(--muted)',
};

/** Sequential magnitude: one hue (info), light wash to strong, as opacity over the surface. */
export function sequentialOpacity(value: number, max: number): number {
  if (max <= 0) return 0.08;
  return Number((0.12 + 0.78 * Math.min(1, Math.max(0, value / max))).toFixed(3));
}
