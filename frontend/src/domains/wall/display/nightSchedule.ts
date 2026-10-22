/** FE-09: night schedule parsing (`?night=22:00-06:00`), kept apart from the overlay so the wall loads it lazily. */
export interface NightSchedule {
  enabled: boolean;
  /** `HH:MM`, local time. */
  from: string;
  /** `HH:MM`, local time; earlier than `from` means the window crosses midnight. */
  to: string;
  dimTo: number;
}

export const DEFAULT_DIM_TO = 0.6;
/** Never dim below 30 % brightness: the wall must stay readable. */
const MIN_DIM_TO = 0.3;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutes(time: string): number | null {
  const match = TIME.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function clampDim(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DIM_TO;
  return Math.min(1, Math.max(MIN_DIM_TO, value));
}

/** Validates untrusted input (URL, layout file); `null` when a time is not `HH:MM`. */
export function parseSchedule(input: unknown): NightSchedule | null {
  if (typeof input !== 'object' || input === null) return null;
  const { enabled, from, to, dimTo } = input as Record<string, unknown>;
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  if (minutes(from) === null || minutes(to) === null) return null;
  return { enabled: enabled !== false, from, to, dimTo: clampDim(dimTo) };
}

/** `?night=22:00-06:00` on the wall URL. */
export function scheduleFromSearch(search: string): NightSchedule | null {
  const value = new URLSearchParams(search).get('night');
  const [from, to] = value?.split('-') ?? [];
  return parseSchedule({ from, to });
}

export function isNightTime(schedule: NightSchedule, now: Date): boolean {
  if (!schedule.enabled) return false;
  const from = minutes(schedule.from);
  const to = minutes(schedule.to);
  if (from === null || to === null || from === to) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return from < to ? current >= from && current < to : current >= from || current < to;
}
