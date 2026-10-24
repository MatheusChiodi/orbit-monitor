import type { Condition, PreviewRow } from '@/shared/api/types';
import { msg, type Message } from '@/shared/i18n/message';
import { splitList, splitRange as splitRangeText } from './alertRules';

/** Preview data the condition is tested against ("this condition would fail now"). */
export interface EvaluationContext {
  row: PreviewRow;
  rowCount: number;
  elapsedMs: number;
  status?: number;
  now: Date;
}

export type EvaluationResult = 'pass' | 'fail' | 'invalid';

export const SYSTEM_FIELDS = ['[ROWS]', '[EXEC_TIME]', '[STATUS]', '[RESPONSE_TIME]'] as const;
const TIME_FIELDS = new Set(['[EXEC_TIME]', '[RESPONSE_TIME]']);

const UNIT_MS: Record<string, number> = { ms: 1, s: 1000, min: 60_000, h: 3_600_000, d: 86_400_000 };

/** "10min" → 600000; accepts ms, s, min, h, d. */
export function parseDurationText(text: string): number | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(ms|s|min|h|d)\s*$/i.exec(text);
  if (!match) return null;
  const amount = Number(match[1]!.replace(',', '.'));
  return amount * UNIT_MS[match[2]!.toLowerCase()]!;
}

function unquote(text: string): string {
  return text.trim().replace(/^"(.*)"$/, '$1');
}

function toNumber(text: string, timeField: boolean): number | null {
  const clean = unquote(text);
  if (timeField) {
    const duration = parseDurationText(clean);
    if (duration !== null) return duration;
  }
  if (clean === '' || Number.isNaN(Number(clean.replace(',', '.')))) return null;
  return Number(clean.replace(',', '.'));
}

function resolveField(field: string, ctx: EvaluationContext): PreviewRow[string] | undefined {
  switch (field) {
    case '[ROWS]':
      return ctx.rowCount;
    case '[EXEC_TIME]':
    case '[RESPONSE_TIME]':
      return ctx.elapsedMs;
    case '[STATUS]':
      return ctx.status ?? null;
    default:
      return field in ctx.row ? ctx.row[field] : undefined;
  }
}

function splitRange(text: string): [number, number] | null {
  const parts = splitRangeText(text);
  if (!parts) return null;
  const [a, b] = parts.map((p) => toNumber(p, false));
  return a === null || a === undefined || b === null || b === undefined ? null : [Math.min(a, b), Math.max(a, b)];
}


function verdict(ok: boolean): EvaluationResult {
  return ok ? 'pass' : 'fail';
}

/** Evaluates a health condition: `pass` = healthy, `fail` = triggers the condition level. */
export function evaluateCondition(condition: Condition, ctx: EvaluationContext): EvaluationResult {
  const actual = resolveField(condition.field, ctx);
  if (actual === undefined || actual === null) return 'invalid';
  const timeField = TIME_FIELDS.has(condition.field);

  switch (condition.operator) {
    case 'in':
      return verdict(splitList(condition.value).includes(String(actual)));
    case 'between': {
      const range = splitRange(condition.value);
      if (!range || typeof actual !== 'number') return 'invalid';
      return verdict(actual >= range[0] && actual <= range[1]);
    }
    case 'older_than':
    case 'newer_than': {
      // Server semantics: `older than` passes when the time is older than the limit, `newer than` when newer.
      const limit = parseDurationText(condition.value);
      const time = Date.parse(String(actual));
      if (limit === null || Number.isNaN(time)) return 'invalid';
      const newer = ctx.now.getTime() - time <= limit;
      return verdict(condition.operator === 'newer_than' ? newer : !newer);
    }
    case '==':
    case '!=': {
      const expected = toNumber(condition.value, timeField);
      const equal =
        typeof actual === 'number' && expected !== null ? actual === expected : String(actual) === unquote(condition.value);
      return verdict(condition.operator === '==' ? equal : !equal);
    }
    default: {
      const expected = toNumber(condition.value, timeField);
      if (expected === null || typeof actual !== 'number') return 'invalid';
      switch (condition.operator) {
        case '<':
          return verdict(actual < expected);
        case '<=':
          return verdict(actual <= expected);
        case '>':
          return verdict(actual > expected);
        case '>=':
          return verdict(actual >= expected);
      }
    }
  }
}

/** Instant validation of an editor row; returns the error message or null. */
export function validateCondition(condition: Condition, fields: readonly string[]): Message | null {
  if (!fields.includes(condition.field)) return msg('conditions.errors.unknownField');
  if (condition.value.trim() === '') return msg('conditions.errors.valueRequired');
  if (condition.operator === 'between' && !splitRange(condition.value)) return msg('conditions.errors.range');
  if ((condition.operator === 'older_than' || condition.operator === 'newer_than') && parseDurationText(condition.value) === null) {
    return msg('conditions.errors.duration');
  }
  return null;
}

/** Gatus-style text: `[COL].QTY < 200`, `[ROWS] == 0`. */
export function conditionText(condition: Condition): string {
  const field = condition.field.startsWith('[') ? condition.field : `[COL].${condition.field}`;
  const operator = condition.operator.replace('_', ' ');
  return `${field} ${operator} ${condition.value.trim()}`;
}
