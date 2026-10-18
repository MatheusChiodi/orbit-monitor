import { describe, expect, it } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { conditionText, evaluateCondition, parseDurationText, validateCondition, type EvaluationContext } from './conditions';

const now = new Date(2026, 9, 18, 17, 10, 0);
const ctx: EvaluationContext = {
  row: { PENDING_QTY: 347, STATUS: 'UP', LAST_BATCH_AT: new Date(2026, 9, 18, 16, 50).toISOString(), ACQ: 'Cielo' },
  rowCount: 3,
  elapsedMs: 120,
  now,
};

function c(field: string, operator: Condition['operator'], value: string): Condition {
  return { field, operator, value, level: 'DOWN' };
}

describe('parseDurationText', () => {
  it.each([
    ['10min', 600_000],
    ['2h', 7_200_000],
    ['30s', 30_000],
    ['1d', 86_400_000],
    ['800ms', 800],
  ])('%s → %d ms', (text, ms) => {
    expect(parseDurationText(text)).toBe(ms);
  });
  it('invalid → null', () => {
    expect(parseDurationText('ten')).toBeNull();
  });
});

describe('evaluateCondition', () => {
  it('compares numbers', () => {
    expect(evaluateCondition(c('PENDING_QTY', '<', '200'), ctx)).toBe('fail');
    expect(evaluateCondition(c('PENDING_QTY', '>=', '347'), ctx)).toBe('pass');
  });
  it('text equality', () => {
    expect(evaluateCondition(c('STATUS', '==', 'UP'), ctx)).toBe('pass');
    expect(evaluateCondition(c('STATUS', '!=', '"UP"'), ctx)).toBe('fail');
  });
  it('between and in', () => {
    expect(evaluateCondition(c('PENDING_QTY', 'between', '100..400'), ctx)).toBe('pass');
    expect(evaluateCondition(c('PENDING_QTY', 'between', '0, 50'), ctx)).toBe('fail');
    expect(evaluateCondition(c('ACQ', 'in', 'Cielo, Rede'), ctx)).toBe('pass');
    expect(evaluateCondition(c('ACQ', 'in', 'Stone'), ctx)).toBe('fail');
  });
  it('older_than on dates: passes when the date is newer than the limit', () => {
    expect(evaluateCondition(c('LAST_BATCH_AT', 'older_than', '60min'), ctx)).toBe('pass');
    expect(evaluateCondition(c('LAST_BATCH_AT', 'older_than', '10min'), ctx)).toBe('fail');
  });
  it('system fields [ROWS], [EXEC_TIME], [STATUS], [RESPONSE_TIME]', () => {
    expect(evaluateCondition(c('[ROWS]', '==', '0'), ctx)).toBe('fail');
    expect(evaluateCondition(c('[EXEC_TIME]', '<', '2s'), ctx)).toBe('pass');
    const http: EvaluationContext = { row: {}, rowCount: 1, elapsedMs: 950, status: 200, now };
    expect(evaluateCondition(c('[STATUS]', '==', '200'), http)).toBe('pass');
    expect(evaluateCondition(c('[RESPONSE_TIME]', '<', '800ms'), http)).toBe('fail');
  });
  it('missing field or invalid value → invalid', () => {
    expect(evaluateCondition(c('MISSING', '<', '1'), ctx)).toBe('invalid');
    expect(evaluateCondition(c('PENDING_QTY', '<', 'abc'), ctx)).toBe('invalid');
  });
});

describe('validateCondition', () => {
  const fields = ['PENDING_QTY', 'LAST_BATCH_AT', '[ROWS]'];
  it('ok', () => {
    expect(validateCondition(c('PENDING_QTY', '<', '200'), fields)).toBeNull();
  });
  it('unknown field', () => {
    expect(validateCondition(c('X', '<', '1'), fields)).toEqual({ key: 'conditions.errors.unknownField' });
  });
  it('empty value', () => {
    expect(validateCondition(c('PENDING_QTY', '<', ' '), fields)).toEqual({ key: 'conditions.errors.valueRequired' });
  });
  it('between needs two numbers', () => {
    expect(validateCondition(c('PENDING_QTY', 'between', '10'), fields)).toEqual({ key: 'conditions.errors.range' });
  });
  it('older_than needs a duration', () => {
    expect(validateCondition(c('LAST_BATCH_AT', 'older_than', 'yesterday'), fields)).toEqual({
      key: 'conditions.errors.duration',
    });
  });
});

describe('conditionText', () => {
  it('writes Gatus style', () => {
    expect(conditionText(c('PENDING_QTY', '<', '200'))).toBe('[COL].PENDING_QTY < 200');
    expect(conditionText(c('[ROWS]', '==', '0'))).toBe('[ROWS] == 0');
    expect(conditionText(c('DT', 'older_than', '10min'))).toBe('[COL].DT older than 10min');
  });
});
