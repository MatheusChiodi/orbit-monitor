import { describe, expect, it } from 'vitest';
import type { Rule } from '@/shared/api/types';
import { deviationLabel, deviationRatio, headroom, passesRule, ruleText } from './rules';

const below200: Rule = { field: 'QTD', operator: '<', limit: 200 };
const above99: Rule = { field: 'UPTIME', operator: '>=', limit: 99 };

describe('passesRule', () => {
  it.each([
    [150, below200, true],
    [200, below200, false],
    [349, below200, false],
    [99, above99, true],
    [98.5, above99, false],
  ])('%s em %o → %s', (value, rule, expected) => {
    expect(passesRule(value, rule)).toBe(expected);
  });

  it('== e !=', () => {
    expect(passesRule(0, { field: 'ROWS', operator: '==', limit: 0 })).toBe(true);
    expect(passesRule(2, { field: 'ROWS', operator: '==', limit: 0 })).toBe(false);
    expect(passesRule(2, { field: 'ROWS', operator: '!=', limit: 0 })).toBe(true);
  });
});

describe('ruleText', () => {
  it('escreve a regra como na parede', () => {
    expect(ruleText(below200)).toBe('QTD < 200');
  });
  it('formata o limite em pt-BR', () => {
    expect(ruleText({ field: 'PCT', operator: '<=', limit: 2.5 })).toBe('PCT <= 2,5');
  });
});

describe('deviationRatio', () => {
  it('349 com regra < 200 desvia +74,5%', () => {
    expect(deviationRatio(349, below200)).toBeCloseTo(0.745);
  });
  it('regra >= 99 com 49,5 desvia -50%', () => {
    expect(deviationRatio(49.5, above99)).toBeCloseTo(-0.5);
  });
  it('limite zero não divide por zero', () => {
    expect(deviationRatio(3, { field: 'ROWS', operator: '==', limit: 0 })).toBeNull();
  });
});

describe('deviationLabel', () => {
  it('"+75% do limite" quando a regra falha', () => {
    expect(deviationLabel(349, below200)).toBe('+75% do limite');
  });
  it('negativo para regra de mínimo', () => {
    expect(deviationLabel(49.5, above99)).toBe('-50% do limite');
  });
  it('null quando a regra passa', () => {
    expect(deviationLabel(150, below200)).toBeNull();
  });
  it('limite zero mostra diferença absoluta', () => {
    expect(deviationLabel(3, { field: 'ROWS', operator: '==', limit: 0 })).toBe('+3 acima do limite');
  });
});

describe('headroom (folga até a regra)', () => {
  it('160 de < 200 → 20% de folga', () => {
    expect(headroom(160, below200)).toBeCloseTo(0.2);
  });
  it('regra de mínimo: 99,5 de >= 99 → ~0,5%', () => {
    expect(headroom(99.5, above99)).toBeCloseTo(0.00505, 4);
  });
  it('negativa quando violada', () => {
    expect(headroom(250, below200)).toBeCloseTo(-0.25);
  });
  it('null em regra de igualdade', () => {
    expect(headroom(0, { field: 'ROWS', operator: '==', limit: 0 })).toBeNull();
  });
});
