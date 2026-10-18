import { describe, expect, it } from 'vitest';
import type { Rule } from '@/shared/api/types';
import { deviationLabel, deviationRatio, formatReading, headroom, passesRule, ruleText } from './rules';

const below200: Rule = { field: 'QTY', operator: '<', limit: 200 };
const atLeast99: Rule = { field: 'UPTIME', operator: '>=', limit: 99 };

describe('passesRule', () => {
  it.each([
    [150, below200, true],
    [200, below200, false],
    [349, below200, false],
    [99, atLeast99, true],
    [98.5, atLeast99, false],
  ])('%s against %o → %s', (value, rule, expected) => {
    expect(passesRule(value, rule)).toBe(expected);
  });

  it('== and !=', () => {
    expect(passesRule(0, { field: 'ROWS', operator: '==', limit: 0 })).toBe(true);
    expect(passesRule(2, { field: 'ROWS', operator: '==', limit: 0 })).toBe(false);
    expect(passesRule(2, { field: 'ROWS', operator: '!=', limit: 0 })).toBe(true);
  });
});

describe('ruleText', () => {
  it('writes the rule as on the wall', () => {
    expect(ruleText(below200)).toBe('QTY < 200');
  });
  it('formats the limit per locale', () => {
    const rule: Rule = { field: 'PCT', operator: '<=', limit: 2.5 };
    expect(ruleText(rule)).toBe('PCT <= 2.5');
    expect(ruleText(rule, 'pt-BR')).toBe('PCT <= 2,5');
  });
});

describe('deviationRatio', () => {
  it('349 with rule < 200 deviates +74.5%', () => {
    expect(deviationRatio(349, below200)).toBeCloseTo(0.745);
  });
  it('rule >= 99 with 49.5 deviates -50%', () => {
    expect(deviationRatio(49.5, atLeast99)).toBeCloseTo(-0.5);
  });
  it('a zero limit does not divide by zero', () => {
    expect(deviationRatio(3, { field: 'ROWS', operator: '==', limit: 0 })).toBeNull();
  });
});

describe('deviationLabel', () => {
  it('"+75% over limit" when the rule fails', () => {
    expect(deviationLabel(349, below200)).toEqual({ key: 'rule.over', params: { pct: 75 } });
  });
  it('under the limit for minimum rules', () => {
    expect(deviationLabel(49.5, atLeast99)).toEqual({ key: 'rule.under', params: { pct: 50 } });
  });
  it('null when the rule passes', () => {
    expect(deviationLabel(150, below200)).toBeNull();
  });
  it('a zero limit shows the absolute difference', () => {
    expect(deviationLabel(1500, { field: 'ROWS', operator: '==', limit: 0 }, 'pt-BR')).toEqual({
      key: 'rule.above',
      params: { diff: '1.500' },
    });
  });
});

describe('headroom', () => {
  it('160 of < 200 → 20% headroom', () => {
    expect(headroom(160, below200)).toBeCloseTo(0.2);
  });
  it('minimum rule: 99.5 of >= 99 → ~0.5%', () => {
    expect(headroom(99.5, atLeast99)).toBeCloseTo(0.00505, 4);
  });
  it('negative when violated', () => {
    expect(headroom(250, below200)).toBeCloseTo(-0.25);
  });
  it('null for equality rules', () => {
    expect(headroom(0, { field: 'ROWS', operator: '==', limit: 0 })).toBeNull();
  });
});

describe('formatReading', () => {
  it('integer with unit', () => {
    expect(formatReading(349, 'QTY')).toBe('349 QTY');
  });
  it('one decimal, % attached', () => {
    expect(formatReading(1.75, '%')).toBe('1.8%');
    expect(formatReading(1.75, '%', 'pt-BR')).toBe('1,8%');
  });
  it('without unit', () => {
    expect(formatReading(12)).toBe('12');
  });
  it('null is "no response" / "sem resposta"', () => {
    expect(formatReading(null, 'ms')).toBe('no response');
    expect(formatReading(null, 'ms', 'pt-BR')).toBe('sem resposta');
  });
});
