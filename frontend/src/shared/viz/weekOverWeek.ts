import { msg, type Message } from '@/shared/i18n/message';

export const WEEK_MS = 7 * 24 * 3600_000;
/** Last week's point may be a little off the current grid (check jitter). */
const MATCH_TOLERANCE_MS = 60_000;

export interface SeriesPoint {
  at: string;
  value: number | null;
}

export interface WeekOverWeekInput {
  current: readonly SeriesPoint[];
  history: readonly SeriesPoint[];
  historyHours: number;
  now: Date;
}

export interface WeekOverWeekOverlay {
  available: boolean;
  reason?: Message;
  points: SeriesPoint[];
}

/**
 * FE-25: the same period last week, shifted 7 days onto the current time axis.
 * Needs history older than a week plus the current span; gaps stay `null`, nothing is interpolated.
 */
export function weekOverWeekOverlay({ current, history, historyHours, now }: WeekOverWeekInput): WeekOverWeekOverlay {
  const unavailable: WeekOverWeekOverlay = {
    available: false,
    reason: msg('viz.wow.unavailable', { hours: historyHours }),
    points: [],
  };
  if (current.length === 0) return unavailable;
  const oldest = Math.min(...current.map((p) => Date.parse(p.at)));
  const neededMs = now.getTime() - oldest + WEEK_MS;
  if (historyHours * 3600_000 < neededMs) return unavailable;

  const past = history.map((p) => ({ t: Date.parse(p.at), value: p.value }));
  const points = current.map((p) => {
    const target = Date.parse(p.at) - WEEK_MS;
    let best: { t: number; value: number | null } | undefined;
    for (const candidate of past) {
      const distance = Math.abs(candidate.t - target);
      if (distance <= MATCH_TOLERANCE_MS && (!best || distance < Math.abs(best.t - target))) best = candidate;
    }
    return { at: p.at, value: best ? best.value : null };
  });
  return { available: true, points };
}
