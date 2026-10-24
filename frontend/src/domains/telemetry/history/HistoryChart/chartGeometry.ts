export interface ChartPoint {
  at: Date;
  value: number | null;
}

export interface ChartBox {
  width: number;
  height: number;
  /** Room for the y labels (left) and the time labels (bottom). */
  left: number;
  bottom: number;
  top: number;
  right: number;
}

export interface ChartGeometry {
  /** Polyline segments; a missing value breaks the line. */
  segments: { x: number; y: number }[][];
  xs: number[];
  ys: (number | null)[];
  yTicks: { value: number; y: number }[];
  xTicks: { at: Date; x: number }[];
  limitY: number | null;
}

/** 1, 2 or 5 times a power of ten: round steps for the value axis. */
export function niceStep(span: number, count: number): number {
  const raw = span / Math.max(count, 1);
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/** Value domain covering the readings and the limit, extended to round ticks. */
export function valueTicks(values: readonly number[], limit: number | null, count = 4): number[] {
  const all = limit === null ? [...values] : [...values, limit];
  if (all.length === 0) return [0, 1];
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= Math.abs(min) * 0.1 || 1;
    max += Math.abs(max) * 0.1 || 1;
  }
  if (min > 0 && min < (max - min) * 0.5) min = 0;
  const step = niceStep(max - min, count);
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) ticks.push(Number(v.toPrecision(12)));
  if (ticks.at(-1)! < max) ticks.push(Number((ticks.at(-1)! + step).toPrecision(12)));
  return ticks;
}

/** Scales and paths of the history chart for a box in pixels. */
export function chartGeometry(points: readonly ChartPoint[], limit: number | null, box: ChartBox): ChartGeometry {
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  const ticks = valueTicks(values, limit);
  const lo = ticks[0]!;
  const hi = ticks.at(-1)!;
  const plotW = Math.max(box.width - box.left - box.right, 1);
  const plotH = Math.max(box.height - box.top - box.bottom, 1);
  const t0 = points[0]?.at.getTime() ?? 0;
  const t1 = points.at(-1)?.at.getTime() ?? t0;
  const x = (t: number) => box.left + (t1 === t0 ? plotW / 2 : ((t - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => box.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

  const xs = points.map((p) => x(p.at.getTime()));
  const ys = points.map((p) => (p.value === null ? null : y(p.value)));
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  ys.forEach((py, i) => {
    if (py === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push({ x: xs[i]!, y: py });
  });
  if (current.length) segments.push(current);

  const timeTickCount = Math.max(2, Math.min(6, Math.floor(plotW / 110)));
  const xTicks =
    points.length < 2
      ? points.map((p) => ({ at: p.at, x: x(p.at.getTime()) }))
      : Array.from({ length: timeTickCount }, (_, i) => {
          const t = t0 + ((t1 - t0) * i) / (timeTickCount - 1);
          return { at: new Date(t), x: x(t) };
        });

  return {
    segments,
    xs,
    ys,
    yTicks: ticks.map((value) => ({ value, y: y(value) })),
    xTicks,
    limitY: limit === null ? null : y(limit),
  };
}

/** Index of the point closest to an x position. */
export function nearestIndex(xs: readonly number[], at: number): number {
  let best = 0;
  xs.forEach((x, i) => {
    if (Math.abs(x - at) < Math.abs(xs[best]! - at)) best = i;
  });
  return best;
}
