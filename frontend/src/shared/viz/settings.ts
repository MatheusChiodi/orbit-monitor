import type { Status } from '@/shared/api/types';
import { formatDecimal, formatNumber } from '@/shared/format';
import type { Locale } from '@/shared/i18n/i18n';
import { msg, type Message } from '@/shared/i18n/message';
import { safeText } from '@/shared/privacy';
import type { VizValue } from './types';

export interface ColorBand {
  from?: number;
  to?: number;
  status: Status;
}

/** What the hero/tile shows when the monitor's rule fails. */
export const ON_FAIL_OPTIONS = ['deviation', 'color', 'both'] as const;
export type OnFail = (typeof ON_FAIL_OPTIONS)[number];

/** FE-23 settings of one visualization; saved with the monitor in `orbit.monitors.json`. */
export interface VisualizationSettingsValue {
  bands?: ColorBand[];
  decimals?: number;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  thresholdLine?: boolean;
  onFail?: OnFail;
}

export const MAX_DECIMALS = 4;

/** `from` is inclusive and `to` exclusive, so "< 50" and "50–200" touch without overlapping. */
export function bandStatus(value: number, bands: readonly ColorBand[]): Status | null {
  const band = bands.find((b) => (b.from === undefined || value >= b.from) && (b.to === undefined || value < b.to));
  return band?.status ?? null;
}

function bandsOverlap(bands: readonly ColorBand[]): boolean {
  const sorted = [...bands].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity));
  for (let i = 1; i < sorted.length; i += 1) {
    const before = sorted[i - 1]!;
    const current = sorted[i]!;
    if ((before.to ?? Infinity) > (current.from ?? -Infinity)) return true;
  }
  return bands.some((b) => b.from !== undefined && b.to !== undefined && b.from >= b.to);
}

export function validateSettings(settings: VisualizationSettingsValue): Message[] {
  const errors: Message[] = [];
  if (settings.bands && bandsOverlap(settings.bands)) errors.push(msg('viz.settings.errors.overlap'));
  const { decimals } = settings;
  if (decimals !== undefined && (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS)) {
    errors.push(msg('viz.settings.errors.decimals'));
  }
  if (settings.min !== undefined && settings.max !== undefined && settings.min >= settings.max) {
    errors.push(msg('viz.settings.errors.minMax'));
  }
  return errors;
}

/** Formats a value with decimals, prefix and suffix; text (and the affixes) are always redacted first. */
export function applySettings(value: VizValue | undefined, settings: VisualizationSettingsValue, locale: Locale): string {
  if (value === null || value === undefined) return '—';
  const prefix = safeText(settings.prefix ?? '');
  const suffix = safeText(settings.suffix ?? '');
  const body =
    typeof value === 'number'
      ? settings.decimals !== undefined
        ? formatDecimal(value, settings.decimals, locale)
        : formatNumber(value, locale)
      : safeText(value);
  return `${prefix}${body}${suffix}`;
}
