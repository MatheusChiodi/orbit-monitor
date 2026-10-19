/** Pure geometry of the time-series modes (line, area, step line). */

export interface NumericPoint {
  at: string;
  value: number | null;
}

export interface Box {
  width: number;
  height: number;
  pad: number;
}

export interface Scales {
  x: (t: number) => number;
  y: (v: number) => number;
  t0: number;
  t1: number;
  v0: number;
  v1: number;
}

const round = (n: number) => Number(n.toFixed(2));

export function makeScales(points: readonly NumericPoint[], box: Box, extra: readonly number[] = [], range?: { from: number; to: number }): Scales {
  const times = points.map((p) => Date.parse(p.at));
  const t0 = range?.from ?? Math.min(...times);
  const t1 = range?.to ?? Math.max(...times);
  const values = [...points.map((p) => p.value).filter((v): v is number => v !== null), ...extra];
  let v0 = values.length ? Math.min(...values) : 0;
  let v1 = values.length ? Math.max(...values) : 1;
  if (v0 === v1) {
    v0 -= 1;
    v1 += 1;
  }
  const span = v1 - v0;
  v0 -= span * 0.08;
  v1 += span * 0.08;
  const innerW = box.width - box.pad * 2;
  const innerH = box.height - box.pad * 2;
  return {
    x: (t) => round(box.pad + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW)),
    y: (v) => round(box.pad + innerH - ((v - v0) / (v1 - v0)) * innerH),
    t0,
    t1,
    v0,
    v1,
  };
}

/** Runs of consecutive non-null points; a `null` (no response) breaks the line. */
function runs(points: readonly NumericPoint[]): NumericPoint[][] {
  const out: NumericPoint[][] = [];
  let current: NumericPoint[] = [];
  for (const p of points) {
    if (p.value === null) {
      if (current.length) out.push(current);
      current = [];
    } else current.push(p);
  }
  if (current.length) out.push(current);
  return out;
}

export function linePath(points: readonly NumericPoint[], s: Scales, step = false): string {
  return runs(points)
    .map((run) =>
      run
        .map((p, i) => {
          const x = s.x(Date.parse(p.at));
          const y = s.y(p.value as number);
          if (i === 0) return `M${x},${y}`;
          return step ? `H${x} V${y}` : `L${x},${y}`;
        })
        .join(' '),
    )
    .join(' ');
}

export function areaPath(points: readonly NumericPoint[], s: Scales, baseline: number): string {
  return runs(points)
    .map((run) => {
      const first = s.x(Date.parse(run[0]!.at));
      const last = s.x(Date.parse(run[run.length - 1]!.at));
      const top = run.map((p, i) => `${i === 0 ? 'M' : 'L'}${s.x(Date.parse(p.at))},${s.y(p.value as number)}`).join(' ');
      return `${top} L${last},${baseline} L${first},${baseline} Z`;
    })
    .join(' ');
}

export interface Gap {
  from: number;
  to: number;
}

/** One gap per run of missing points, spanning from the last answer to the next one. */
export function gaps(points: readonly NumericPoint[], s: Scales): Gap[] {
  const out: Gap[] = [];
  let start: number | null = null;
  points.forEach((p, i) => {
    if (p.value === null && start === null) start = i;
    if (p.value !== null && start !== null) {
      out.push({ from: s.x(Date.parse(points[Math.max(0, start - 1)]!.at)), to: s.x(Date.parse(p.at)) });
      start = null;
    }
  });
  if (start !== null) out.push({ from: s.x(Date.parse(points[Math.max(0, start - 1)]!.at)), to: s.x(Date.parse(points[points.length - 1]!.at)) });
  return out;
}

export function nearestIndex(points: readonly { at: string }[], t: number): number {
  let best = -1;
  let distance = Infinity;
  points.forEach((p, i) => {
    const d = Math.abs(Date.parse(p.at) - t);
    if (d < distance) {
      distance = d;
      best = i;
    }
  });
  return best;
}

export function lastValue<T>(points: readonly { value: T | null }[]): T | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const v = points[i]!.value;
    if (v !== null) return v;
  }
  return null;
}

/** Five evenly spaced tick times across the domain. */
export function ticks(s: Scales, count = 5): number[] {
  if (s.t1 === s.t0) return [s.t0];
  return Array.from({ length: count }, (_, i) => s.t0 + ((s.t1 - s.t0) * i) / (count - 1));
}
