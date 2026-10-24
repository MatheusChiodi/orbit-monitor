const DAY_MS = 86_400_000;

/** Start of `day` (0 = weekStart) at local midnight, safe across DST changes. */
export function dayStart(weekStart: Date, day: number): Date {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Part of a window inside one day column, as percentages of the day's height. */
export interface DaySegment {
  day: number;
  top: number;
  height: number;
  /** The segment where the window starts in this week (carries its label). */
  first: boolean;
}

/** Splits a window into one segment per day it covers in the visible week. */
export function daySegments(weekStart: Date, start: string, end: string): DaySegment[] {
  const s = Date.parse(start);
  const e = Date.parse(end);
  const segments: DaySegment[] = [];
  for (let day = 0; day < 7; day++) {
    const from = dayStart(weekStart, day).getTime();
    const to = dayStart(weekStart, day + 1).getTime();
    const a = Math.max(s, from);
    const b = Math.min(e, to);
    if (b <= a) continue;
    const length = to - from || DAY_MS;
    segments.push({ day, top: ((a - from) / length) * 100, height: ((b - a) / length) * 100, first: segments.length === 0 });
  }
  return segments;
}

/** Column and vertical position (%) of `now` when it falls inside the visible week; null otherwise. */
export function nowMarker(weekStart: Date, now: Date): { day: number; top: number } | null {
  for (let day = 0; day < 7; day++) {
    const from = dayStart(weekStart, day).getTime();
    const to = dayStart(weekStart, day + 1).getTime();
    if (now.getTime() >= from && now.getTime() < to) return { day, top: ((now.getTime() - from) / (to - from)) * 100 };
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Value for `<input type="datetime-local">` in the browser's time zone. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a `datetime-local` value (local time); null when empty or invalid. */
export function fromLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Default range of the "New window" button: the next full hour, one hour long. */
export function nextHourRange(now: Date): { start: string; end: string } {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
