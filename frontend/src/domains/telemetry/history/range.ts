/** FE-58: history periods, chart resolution and how much of a period the 30-day store covers. */

export type RangePreset = '24h' | '7d' | '30d' | 'custom';
export type FixedPreset = Exclude<RangePreset, 'custom'>;
export type Resolution = 'raw' | '1m' | '1h';
export type RangeError = 'order' | 'tooLong' | 'future';

export interface HistoryRange {
  preset: RangePreset;
  from: Date;
  to: Date;
}

/** `GET /api/history/coverage`. */
export interface StoreCoverage {
  oldest: string | null;
  newest: string;
  retentionDays: number;
  rawWritesEnabled: boolean;
}

export interface RangeCoverage {
  /** Start of the covered part of the period; null when nothing is stored. */
  coveredFrom: Date | null;
  /** Covered share of the period, 0..1. */
  fraction: number;
  complete: boolean;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** The API rejects longer periods (BE-52). */
export const MAX_RANGE_MS = 31 * DAY;
export const FIXED_PRESETS: readonly FixedPreset[] = ['24h', '7d', '30d'];
const PRESET_MS: Record<FixedPreset, number> = { '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY };

export function presetRange(preset: FixedPreset, now: Date = new Date()): HistoryRange {
  return { preset, from: new Date(now.getTime() - PRESET_MS[preset]), to: now };
}

/** Validates a custom period; an end in the future is clamped to now. */
export function customRange(
  from: Date,
  to: Date,
  now: Date = new Date(),
): { range: HistoryRange; error?: never } | { range?: never; error: RangeError } {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return { error: 'order' };
  if (from >= now) return { error: 'future' };
  const end = to > now ? now : to;
  if (end.getTime() - from.getTime() > MAX_RANGE_MS) return { error: 'tooLong' };
  return { range: { preset: 'custom', from, to: end } };
}

/** Same rule as the backend: ≤ 6 h raw, ≤ 7 d 1-minute, otherwise 1-hour. */
export function resolutionFor({ from, to }: Pick<HistoryRange, 'from' | 'to'>): Resolution {
  const span = to.getTime() - from.getTime();
  if (span <= 6 * HOUR) return 'raw';
  return span <= 7 * DAY ? '1m' : '1h';
}

export function rangeCoverage(coverage: StoreCoverage, { from, to }: Pick<HistoryRange, 'from' | 'to'>): RangeCoverage {
  const span = to.getTime() - from.getTime();
  if (!coverage.oldest || span <= 0) return { coveredFrom: null, fraction: 0, complete: false };
  const oldest = new Date(coverage.oldest);
  if (oldest >= to) return { coveredFrom: null, fraction: 0, complete: false };
  const coveredFrom = oldest > from ? oldest : from;
  const fraction = Math.min(1, Math.max(0, (to.getTime() - coveredFrom.getTime()) / span));
  return { coveredFrom, fraction, complete: fraction >= 0.999 };
}

/** `Date` → value of an `<input type="datetime-local">` in the browser's time zone. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Value of an `<input type="datetime-local">` → `Date` (invalid date when empty). */
export function fromLocalInput(value: string): Date {
  return value ? new Date(value) : new Date(Number.NaN);
}
