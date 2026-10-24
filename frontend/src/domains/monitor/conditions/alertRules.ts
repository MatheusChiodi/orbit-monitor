import type { Condition, ConditionOperator, PreviewColumn, Severity } from '@/shared/api/types';
import type { MonitorKind } from '../form/targets';

/**
 * The editor speaks in alerts ("Down when response time is above 1000 ms") while the server stores the
 * healthy assertion (`[RESPONSE_TIME] <= 1000`, failing = alert). Each alert operator maps to its inverse.
 */
export type AlertOperator = '>' | '>=' | '<' | '<=' | '==' | '!=' | 'outside' | 'not_in' | 'older' | 'newer';

const STORED: Record<AlertOperator, ConditionOperator> = {
  '>': '<=',
  '>=': '<',
  '<': '>=',
  '<=': '>',
  '==': '!=',
  '!=': '==',
  outside: 'between',
  not_in: 'in',
  older: 'newer_than',
  newer: 'older_than',
};

const ALERT = Object.fromEntries(Object.entries(STORED).map(([alert, stored]) => [stored, alert])) as Record<ConditionOperator, AlertOperator>;

export function toStoredOperator(operator: AlertOperator): ConditionOperator {
  return STORED[operator];
}

export function toAlertOperator(operator: ConditionOperator): AlertOperator {
  return ALERT[operator];
}

export type FieldKind = 'number' | 'duration' | 'text' | 'date' | 'boolean';

const SYSTEM_KINDS: Record<string, FieldKind> = {
  '[STATUS]': 'number',
  '[ROWS]': 'number',
  '[RESPONSE_TIME]': 'duration',
  '[EXEC_TIME]': 'duration',
  '[LAG]': 'number',
  '[DNS_RCODE]': 'text',
  '[BODY]': 'text',
  '[CONNECTED]': 'boolean',
  '[CERTIFICATE_EXPIRATION]': 'duration',
  '[DOMAIN_EXPIRATION]': 'duration',
};

/** Type of a condition field: system placeholders are known, columns come from the preview. */
export function fieldKindOf(field: string, columns: readonly PreviewColumn[] = []): FieldKind {
  const system = SYSTEM_KINDS[field];
  if (system) return system;
  const column = columns.find((c) => c.name === field);
  return column ? column.type : 'text';
}

const BY_KIND: Record<FieldKind, AlertOperator[]> = {
  number: ['>', '>=', '<', '<=', '==', '!=', 'outside'],
  duration: ['>', '>=', '<', '<=', '==', '!=', 'outside'],
  text: ['!=', '==', 'not_in'],
  boolean: ['!=', '=='],
  date: ['older'],
};

export function alertOperatorsFor(kind: FieldKind): AlertOperator[] {
  return BY_KIND[kind];
}

/** First operator a new rule on this kind of field gets. */
export function defaultAlertOperator(kind: FieldKind): AlertOperator {
  return BY_KIND[kind][0]!;
}

const SLOW: Condition = { field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' };

/** Rules a new monitor starts with, so the first save already watches something sensible. */
export function defaultConditions(kind: MonitorKind): Condition[] {
  switch (kind) {
    case 'HTTP':
    case 'HTTP_STEPS':
      return [{ field: '[STATUS]', operator: 'between', value: '200 and 299', level: 'DOWN' }, { ...SLOW }];
    case 'TCP':
    case 'PING':
      return [{ ...SLOW }];
    default:
      return [];
  }
}

/** `200 and 299` (server syntax), also `200..299` and `200,299`. */
export function splitRange(value: string): [string, string] | null {
  const parts = value.split(/\s+and\s+|\.\.|,/i).map((p) => p.trim());
  return parts.length === 2 ? [parts[0]!, parts[1]!] : null;
}

export function joinRange(min: string, max: string): string {
  return `${min.trim()} and ${max.trim()}`;
}

/** `(a, b)` (server syntax) or `a, b`. */
export function splitList(value: string): string[] {
  return value
    .trim()
    .replace(/^[([](.*)[)\]]$/, '$1')
    .split(',')
    .map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
    .filter((x) => x !== '');
}

export function joinList(items: readonly string[]): string {
  return `(${items.map((x) => x.trim()).filter(Boolean).join(', ')})`;
}

const EXPRESSION = /^\[([A-Z_]+)\](?:\.(\S+))?\s+(older than|newer than|<=|>=|==|!=|<|>|between|in)\s+(.+)$/i;

/** A saved expression (`[BODY].status == UP`) as an editable rule; null when the editor cannot show it. */
export function parseExpression(expression: string, level: Severity): Condition | null {
  const match = EXPRESSION.exec(expression.trim());
  if (!match) return null;
  const [, placeholder, path, operatorText, value] = match;
  const operator = operatorText!.toLowerCase().replace(' ', '_') as ConditionOperator;
  let field: string;
  if (!path) field = `[${placeholder!.toUpperCase()}]`;
  else if (placeholder!.toUpperCase() === 'BODY') field = `$.${path}`;
  else if (placeholder!.toUpperCase() === 'COL') field = path;
  else return null;
  return { field, operator, value: value!.trim(), level };
}

/** The value in server syntax: ranges as `min and max`, lists in parentheses. */
export function normalizeCondition(condition: Condition): Condition {
  if (condition.operator === 'between') {
    const range = splitRange(condition.value);
    return range ? { ...condition, value: joinRange(...range) } : condition;
  }
  if (condition.operator === 'in') return { ...condition, value: joinList(splitList(condition.value)) };
  return { ...condition, value: condition.value.trim() };
}
