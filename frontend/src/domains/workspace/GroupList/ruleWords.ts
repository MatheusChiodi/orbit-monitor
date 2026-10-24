import type { TFunction } from 'i18next';
import type { Rule } from '@/shared/api/types';
import { formatNumber } from '@/shared/format';
import type { Locale } from '@/shared/i18n/i18n';

const FIELDS = ['STATUS', 'RESPONSE_TIME', 'LATENCY', 'CERT_DAYS_LEFT', 'ROWS', 'LAG', 'SILENCE'] as const;

/** `[COL].QTY` / `[RESPONSE_TIME]` → the field name people read ("QTY", "Response time"). */
export function fieldWords(field: string, t: TFunction): string {
  const bare = field.replace(/^\[COL\]\./, '').replace(/^\[(.+)\]$/, '$1');
  return (FIELDS as readonly string[]).includes(bare) ? t(`ops.monitors.fields.${bare as (typeof FIELDS)[number]}`) : bare;
}

/** The main rule in plain words ("Response time below 1,000"); the expression stays for the tooltip. */
export function ruleWords(rule: Rule, t: TFunction, locale: Locale): string {
  return t('ops.monitors.rule', {
    field: fieldWords(rule.field, t),
    operator: t(`ops.monitors.operators.${rule.operator}`),
    limit: formatNumber(rule.limit, locale),
  });
}
