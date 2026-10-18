/** Orbit has no database: history lives in backend memory for a bounded window (24 h default). */
export interface HistoryInfo {
  /** First point still in memory; null right after a restart. */
  firstPointAt: string | null;
  windowHours: number;
}

export interface HistoryCoverage {
  hours: number;
  complete: boolean;
}

const HOUR = 3_600_000;

export function historyCoverage({ firstPointAt, windowHours }: HistoryInfo, now: Date = new Date()): HistoryCoverage {
  if (!firstPointAt) return { hours: 0, complete: false };
  const span = Math.floor((now.getTime() - Date.parse(firstPointAt)) / HOUR);
  const hours = Math.max(0, Math.min(span, windowHours));
  return { hours, complete: hours >= windowHours };
}

/** A requested period can never exceed what is kept in memory. */
export function clampPeriod(requestedHours: number, windowHours: number): { hours: number; clamped: boolean } {
  return requestedHours > windowHours ? { hours: windowHours, clamped: true } : { hours: requestedHours, clamped: false };
}
