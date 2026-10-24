import { describe, expect, it } from 'vitest';
import {
  alertOperatorsFor,
  defaultConditions,
  fieldKindOf,
  joinList,
  joinRange,
  normalizeCondition,
  parseExpression,
  splitList,
  splitRange,
  toAlertOperator,
  toStoredOperator,
} from './alertRules';
import { evaluateCondition, validateCondition } from './conditions';

const ctx = { row: { QTY: 347, LAST: '2026-10-24T10:00:00Z' }, rowCount: 1, elapsedMs: 1200, status: 503, now: new Date('2026-10-24T10:30:00Z') };

describe('alert rules', () => {
  it('stores the healthy assertion that is the inverse of the alert operator', () => {
    expect(toStoredOperator('>')).toBe('<=');
    expect(toStoredOperator('outside')).toBe('between');
    expect(toStoredOperator('older')).toBe('newer_than');
    expect(toAlertOperator('<=')).toBe('>');
    expect(toAlertOperator('between')).toBe('outside');
    expect(toAlertOperator('in')).toBe('not_in');
  });

  it('offers operators that fit the field type', () => {
    expect(alertOperatorsFor('duration')).toEqual(['>', '>=', '<', '<=', '==', '!=', 'outside']);
    expect(alertOperatorsFor('text')).toEqual(['!=', '==', 'not_in']);
    expect(alertOperatorsFor('date')).toEqual(['older']);
    expect(alertOperatorsFor('boolean')).toEqual(['!=', '==']);
  });

  it('knows the type of system fields and preview columns', () => {
    expect(fieldKindOf('[RESPONSE_TIME]')).toBe('duration');
    expect(fieldKindOf('[STATUS]')).toBe('number');
    expect(fieldKindOf('QTY', [{ name: 'QTY', type: 'number' }])).toBe('number');
    expect(fieldKindOf('LAST', [{ name: 'LAST', type: 'date' }])).toBe('date');
    expect(fieldKindOf('$.status')).toBe('text');
  });

  it('gives HTTP a down rule on the status and a warning on slow responses', () => {
    expect(defaultConditions('HTTP')).toEqual([
      { field: '[STATUS]', operator: 'between', value: '200 and 299', level: 'DOWN' },
      { field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' },
    ]);
    expect(defaultConditions('TCP')).toEqual([{ field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' }]);
    expect(defaultConditions('SQL')).toEqual([]);
  });

  it('defaults evaluate the way the server does', () => {
    const [status, time] = defaultConditions('HTTP');
    expect(evaluateCondition(status!, ctx)).toBe('fail');
    expect(evaluateCondition(status!, { ...ctx, status: 204 })).toBe('pass');
    expect(evaluateCondition(time!, ctx)).toBe('fail');
    expect(validateCondition(status!, ['[STATUS]'])).toBeNull();
  });

  it('older than alerts when the timestamp is older (server semantics)', () => {
    const rule = { field: 'LAST', operator: 'newer_than' as const, value: '10min', level: 'DOWN' as const };
    expect(evaluateCondition(rule, ctx)).toBe('fail');
    expect(evaluateCondition({ ...rule, value: '1h' }, ctx)).toBe('pass');
  });

  it('reads saved expressions back into editable rules', () => {
    expect(parseExpression('[STATUS] between 200 and 299', 'DOWN')).toEqual({ field: '[STATUS]', operator: 'between', value: '200 and 299', level: 'DOWN' });
    expect(parseExpression('[RESPONSE_TIME] <= 1000', 'WARN')).toEqual({ field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' });
    expect(parseExpression('[BODY].status == UP', 'DOWN')).toEqual({ field: '$.status', operator: '==', value: 'UP', level: 'DOWN' });
    expect(parseExpression('[COL].PENDING_QTY < 200', 'DOWN')).toEqual({ field: 'PENDING_QTY', operator: '<', value: '200', level: 'DOWN' });
    expect(parseExpression('[COL].LAST newer than 10min', 'WARN')?.operator).toBe('newer_than');
    expect(parseExpression('[BODY].name contains x', 'DOWN')).toBeNull();
  });

  it('splits and joins ranges and lists', () => {
    expect(splitRange('200 and 299')).toEqual(['200', '299']);
    expect(splitRange('10..50')).toEqual(['10', '50']);
    expect(joinRange('1', '5')).toBe('1 and 5');
    expect(splitList('(a, b)')).toEqual(['a', 'b']);
    expect(joinList(['a', 'b'])).toBe('(a, b)');
  });

  it('sends values in server syntax', () => {
    const base = { field: 'X', level: 'DOWN' as const };
    expect(normalizeCondition({ ...base, operator: 'between', value: '10..50' }).value).toBe('10 and 50');
    expect(normalizeCondition({ ...base, operator: 'in', value: 'UP, OK' }).value).toBe('(UP, OK)');
    expect(normalizeCondition({ ...base, operator: '<', value: ' 5 ' }).value).toBe('5');
  });
});
