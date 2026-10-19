import { formatNumber, formatTime } from '@/shared/format';
import type { Locale } from '@/shared/i18n/i18n';
import type { VizRule } from '../types';

/** "81%" keeps the percent sign attached; any other unit is spaced ("182 ms"). */
export function withUnit(text: string, unit?: string): string {
  if (!unit) return text;
  return unit === '%' ? `${text}%` : `${text} ${unit}`;
}

export function formatAmount(value: number, locale: Locale, unit?: string, maxDecimals = 2): string {
  return withUnit(formatNumber(value, locale, maxDecimals), unit);
}

export function ruleText(rule: VizRule, locale: Locale): string {
  return `${rule.field} ${rule.operator} ${formatNumber(rule.limit, locale)}`;
}

/** `true` when the value satisfies the rule ("QTY < 200" holds for 160). */
export function ruleHolds(value: number, rule: VizRule): boolean {
  switch (rule.operator) {
    case '<':
      return value < rule.limit;
    case '<=':
      return value <= rule.limit;
    case '>':
      return value > rule.limit;
    case '>=':
      return value >= rule.limit;
    case '==':
      return value === rule.limit;
    case '!=':
      return value !== rule.limit;
    default:
      return true;
  }
}

/** Remaining room before the limit, in % of the limit (negative once violated); `null` for equality rules. */
export function headroomPct(value: number, rule: VizRule): number | null {
  if (rule.limit === 0) return null;
  if (rule.operator === '<' || rule.operator === '<=') return ((rule.limit - value) / Math.abs(rule.limit)) * 100;
  if (rule.operator === '>' || rule.operator === '>=') return ((value - rule.limit) / Math.abs(rule.limit)) * 100;
  return null;
}

/** Deviation of a failing value from the limit, in % ("+75% over limit"). */
export function deviationPct(value: number, rule: VizRule): number {
  return rule.limit === 0 ? 0 : Math.round((Math.abs(value - rule.limit) / Math.abs(rule.limit)) * 100);
}

export function timeLabel(iso: string): string {
  return formatTime(iso);
}

/** Nearest-rank percentile of numeric samples. */
export function percentile(samples: readonly number[], p: number): number | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1] ?? null;
}
