import type { Group, MonitorView } from '@/shared/api/types';
import { monitorState } from '../MonitorState';

export interface RailSatellite {
  monitor: MonitorView;
  /** Degrees on the track; -90 is 12 o'clock. */
  angle: number;
}

export interface RailCounts {
  down: number;
  warn: number;
  ok: number;
  /** Not checked yet (or a state the console does not know). */
  waiting: number;
  paused: number;
}

/** Largest gap between two neighbours, so a few monitors cluster at the top instead of scattering. */
const MAX_STEP = 22;

/** Orbit's own health check (type `SELF`) is built in and never shown as a monitor the operator added. */
export function railMonitors(monitors: readonly MonitorView[]): MonitorView[] {
  return monitors.filter((m) => (m.type as string) !== 'SELF');
}

/**
 * FE-68: places the monitors on the track. Down monitors come first, centered at 12 o'clock; the
 * others follow clockwise in group order, one empty slot between groups so each group reads as an arc.
 */
export function railLayout(monitors: readonly MonitorView[], groups: readonly Group[]): RailSatellite[] {
  const order = new Map(groups.map((g, i) => [g.id, i]));
  const rank = (m: MonitorView) => order.get(m.groupId) ?? groups.length;
  const down = monitors.filter((m) => monitorState(m) === 'DOWN');
  const rest = monitors
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => monitorState(m) !== 'DOWN')
    .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
    .map(({ m }) => m);

  const slots: (MonitorView | null)[] = [...down];
  let previous: string | null = null;
  for (const m of rest) {
    if (slots.length > 0 && m.groupId !== previous) slots.push(null);
    slots.push(m);
    previous = m.groupId;
  }
  if (slots.length === 0) return [];
  const step = Math.min(360 / slots.length, MAX_STEP);
  const centered = down.length > 0 ? down.length : slots.length;
  const start = -90 - ((centered - 1) / 2) * step;
  return slots.flatMap((m, i) => (m ? [{ monitor: m, angle: start + i * step }] : []));
}

export function railCounts(monitors: readonly Pick<MonitorView, 'status' | 'paused'>[]): RailCounts {
  const count = (state: ReturnType<typeof monitorState>) => monitors.filter((m) => monitorState(m) === state).length;
  return { down: count('DOWN'), warn: count('WARN'), ok: count('OK'), waiting: count('WAITING'), paused: count('PAUSED') };
}

export interface TrackBox {
  width: number;
  height: number;
}

/** Point of an angle on the elliptical track that fills the box (with room for the satellites). */
export function trackPoint(angle: number, box: TrackBox): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  const rx = Math.max(box.width / 2 - 16, 0);
  const ry = Math.max(box.height / 2 - 10, 0);
  return { x: box.width / 2 + rx * Math.cos(rad), y: box.height / 2 + ry * Math.sin(rad) };
}
