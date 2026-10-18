import type { ComparisonOperator } from '@/shared/api/types';

export interface ChartBox {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ChartLimit {
  limit: number;
  operator: ComparisonOperator;
}

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
  violated: boolean;
}

export interface ChartGap {
  from: number;
  to: number;
}

export interface ChartTick {
  x: number;
  /** Minutes relative to now (-60 … 0); the component turns 0 into "now". */
  minutes: number;
}

export interface ThresholdGeometry {
  points: (ChartPoint | null)[];
  gaps: ChartGap[];
  limitY: number | null;
  min: number;
  max: number;
  current: ChartPoint | null;
  ticks: ChartTick[];
  step: number;
}

function violates(value: number, { limit, operator }: ChartLimit): boolean {
  switch (operator) {
    case '<':
      return value >= limit;
    case '<=':
      return value > limit;
    case '>':
      return value <= limit;
    case '>=':
      return value < limit;
    case '==':
      return value !== limit;
    case '!=':
      return value === limit;
  }
}

const TICK_MINUTES = [-60, -45, -30, -15, 0];

/** Pure geometry of the 60-min threshold chart, separate from the canvas drawing. */
export function thresholdGeometry(
  series: readonly (number | null)[],
  limit: ChartLimit | null,
  box: ChartBox,
): ThresholdGeometry {
  const { padding } = box;
  const innerW = Math.max(box.width - padding.left - padding.right, 0);
  const innerH = Math.max(box.height - padding.top - padding.bottom, 0);
  const numbers = series.filter((v): v is number => v !== null);
  const domain = limit ? [...numbers, limit.limit] : numbers;
  const rawMin = domain.length ? Math.min(...domain) : 0;
  const rawMax = domain.length ? Math.max(...domain) : 1;
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.12;

  const yOf = (value: number) => padding.top + innerH - ((value - min) / (max - min)) * innerH;
  const step = series.length > 1 ? innerW / (series.length - 1) : 0;
  const xOf = (i: number) => (series.length > 1 ? padding.left + i * step : padding.left + innerW);

  const points = series.map((value, i): ChartPoint | null =>
    value === null
      ? null
      : { x: xOf(i), y: yOf(value), value, violated: limit ? violates(value, limit) : false },
  );

  const gaps: ChartGap[] = [];
  series.forEach((value, i) => {
    if (value !== null) return;
    const last = gaps.at(-1);
    if (last && last.to === i - 1) last.to = i;
    else gaps.push({ from: i, to: i });
  });

  let current: ChartPoint | null = null;
  for (let i = points.length - 1; i >= 0 && !current; i -= 1) current = points[i] ?? null;

  const ticks = TICK_MINUTES.map((minutes, i) => ({ minutes, x: padding.left + (innerW * i) / (TICK_MINUTES.length - 1) }));

  return { points, gaps, limitY: limit ? yOf(limit.limit) : null, min, max, current, ticks, step };
}
