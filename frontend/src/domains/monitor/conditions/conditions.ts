import type { Condition, PreviewRow } from '@/shared/api/types';

/** Dados do preview contra os quais a condição é testada ("essa condição falharia agora"). */
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

/** "10min" → 600000; aceita ms, s, min, h, d. */
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
  const parts = text.includes('..') ? text.split('..') : text.split(',');
  if (parts.length !== 2) return null;
  const [a, b] = parts.map((p) => toNumber(p, false));
  return a === null || a === undefined || b === null || b === undefined ? null : [Math.min(a, b), Math.max(a, b)];
}

function list(text: string): string[] {
  return text
    .split(',')
    .map(unquote)
    .filter((x) => x !== '');
}

function verdict(ok: boolean): EvaluationResult {
  return ok ? 'pass' : 'fail';
}

/** Avalia uma condição de saúde: `pass` = saudável, `fail` = dispara o nível da condição. */
export function evaluateCondition(condition: Condition, ctx: EvaluationContext): EvaluationResult {
  const actual = resolveField(condition.field, ctx);
  if (actual === undefined || actual === null) return 'invalid';
  const timeField = TIME_FIELDS.has(condition.field);

  switch (condition.operator) {
    case 'in':
      return verdict(list(condition.value).includes(String(actual)));
    case 'between': {
      const range = splitRange(condition.value);
      if (!range || typeof actual !== 'number') return 'invalid';
      return verdict(actual >= range[0] && actual <= range[1]);
    }
    case 'older_than': {
      const limit = parseDurationText(condition.value);
      const time = Date.parse(String(actual));
      if (limit === null || Number.isNaN(time)) return 'invalid';
      return verdict(ctx.now.getTime() - time <= limit);
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

/** Validação instantânea da linha do editor; devolve a mensagem de erro ou null. */
export function validateCondition(condition: Condition, fields: readonly string[]): string | null {
  if (!fields.includes(condition.field)) return 'Campo não existe no resultado';
  if (condition.value.trim() === '') return 'Informe um valor';
  if (condition.operator === 'between' && !splitRange(condition.value)) return 'Use "mín..máx"';
  if (condition.operator === 'older_than' && parseDurationText(condition.value) === null) {
    return 'Use uma duração: 10min, 2h, 30s';
  }
  return null;
}

/** Texto no estilo Gatus: `[COL].QTD < 200`, `[ROWS] == 0`. */
export function conditionText(condition: Condition): string {
  const field = condition.field.startsWith('[') ? condition.field : `[COL].${condition.field}`;
  const operator = condition.operator === 'older_than' ? 'older than' : condition.operator;
  return `${field} ${operator} ${condition.value.trim()}`;
}
