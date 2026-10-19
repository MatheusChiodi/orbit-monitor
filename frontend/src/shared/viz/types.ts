import type { Status } from '@/shared/api/types';
import type { AnimationLevel } from '@/shared/motion';
import type { DataClass } from '@/shared/privacy';

export type { Status };

/** Probe values reach the visualizations already redacted, but are re-masked before rendering. */
export type VizValue = number | string | null;

export interface VizRule {
  field: string;
  operator: string;
  limit: number;
}

export interface VizPoint {
  at: string;
  value: VizValue;
}

export interface VizBand {
  from?: number;
  to?: number;
  /** Bands without a state are drawn as neutral ranges (bullet chart). */
  status?: string;
}

export interface VizCategory {
  name: string;
  value?: number;
  values?: Record<string, number>;
  series?: number[];
}

export interface VizItem {
  label: string;
  value: VizValue;
}

export interface VizCell {
  weekday: number;
  hour: number;
  value: number | null;
}

export interface VizDay {
  date: string;
  value: number | null;
}

export interface VizSegment {
  from: string;
  to: string;
  status: string;
}

export interface VizMonitor {
  id: string;
  name: string;
  status: string;
}

/**
 * Everything a display mode can draw. Each mode reads only the fields it needs, so the picker (FE-21)
 * can hand the same field data to every compatible mode. `status` and operators are plain strings
 * because they come from JSON; they are normalized before use.
 */
export interface VizData {
  label: string;
  status: string;
  unit?: string;
  value?: VizValue;
  previous?: number | null;
  series?: (number | null)[];
  min?: number;
  max?: number;
  target?: number;
  bands?: VizBand[];
  rule?: VizRule;
  items?: VizItem[];
  points?: VizPoint[];
  previousWeek?: VizPoint[];
  historyHours?: number;
  keys?: string[];
  categories?: VizCategory[];
  cells?: VizCell[];
  days?: VizDay[];
  segments?: VizSegment[];
  uptime?: number | null;
  mapping?: Record<string, string>;
  columns?: string[];
  rows?: Record<string, VizValue>[];
  samples?: number[];
  monitors?: VizMonitor[];
  dataClass?: DataClass;
}

export interface ModeProps {
  data: VizData;
  /** Requested animation level; `prefers-reduced-motion` still forces `off`. Defaults to the app level. */
  animation?: AnimationLevel;
  className?: string;
}

const STATUSES: readonly Status[] = ['OK', 'WARN', 'DOWN'];

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

/** Unknown states fall back to `OK` for frames; text mapping uses its own neutral tone. */
export function toStatus(value: unknown, fallback: Status = 'OK'): Status {
  return isStatus(value) ? value : fallback;
}
