import type { Rule } from '@/shared/api/types';
import { formatDecimal, formatInteger, formatNumber } from '@/shared/format';
import { DEFAULT_LOCALE, messages, type Locale } from '@/shared/i18n/i18n';
import { msg, type Message } from '@/shared/i18n/message';
import { detectSensitive, safeText } from '@/shared/privacy/redact';

export function passesRule(value: number, rule: Rule): boolean {
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
  }
}

/** `QTY < 200` */
export function ruleText(rule: Rule, locale: Locale = DEFAULT_LOCALE): string {
  return `${rule.field} ${rule.operator} ${formatNumber(rule.limit, locale)}`;
}

/** Deviation relative to the limit: (value - limit) / limit. Null when the limit is zero. */
export function deviationRatio(value: number, rule: Rule): number | null {
  if (rule.limit === 0) return null;
  return (value - rule.limit) / Math.abs(rule.limit);
}

/** Deviation shown when the rule fails ("+75% over limit"). Null when the rule passes. */
export function deviationLabel(value: number, rule: Rule, locale: Locale = DEFAULT_LOCALE): Message | null {
  if (passesRule(value, rule)) return null;
  const ratio = deviationRatio(value, rule);
  if (ratio === null) {
    const diff = value - rule.limit;
    const text = formatInteger(Math.abs(diff), locale);
    return diff >= 0 ? msg('rule.above', { diff: text }) : msg('rule.below', { diff: text });
  }
  const pct = Math.abs(Math.round(ratio * 100));
  return ratio >= 0 ? msg('rule.over', { pct }) : msg('rule.under', { pct });
}

/**
 * Headroom to the rule as a fraction of the limit (0.2 = 20% headroom). Negative when violated.
 * Null for equality rules or a zero limit, where headroom makes no sense.
 */
export function headroom(value: number, rule: Rule): number | null {
  if (rule.limit === 0) return null;
  const limit = Math.abs(rule.limit);
  switch (rule.operator) {
    case '<':
    case '<=':
      return (rule.limit - value) / limit;
    case '>':
    case '>=':
      return (value - rule.limit) / limit;
    case '==':
    case '!=':
      return null;
  }
}

/** Current reading of a monitor: "349 QTY", "1.8%", "no response". */
export function formatReading(value: number | null, unit?: string, locale: Locale = DEFAULT_LOCALE): string {
  if (value === null) return messages(locale).reading.noResponse;
  if (detectSensitive(value)) return safeText(value);
  const text = Number.isInteger(value) ? formatInteger(value, locale) : formatDecimal(value, 1, locale);
  if (!unit) return text;
  return unit === '%' ? `${text}%` : `${text} ${unit}`;
}
