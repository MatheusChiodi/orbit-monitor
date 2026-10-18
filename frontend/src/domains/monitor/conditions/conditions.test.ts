import { describe, expect, it } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { conditionText, evaluateCondition, parseDurationText, validateCondition, type EvaluationContext } from './conditions';

const now = new Date(2026, 9, 18, 17, 10, 0);
const ctx: EvaluationContext = {
  row: { QTD_PENDENTES: 347, STATUS: 'UP', DT_ULT_LOTE: new Date(2026, 9, 18, 16, 50).toISOString(), ADQ: 'Cielo' },
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
  it('inválido → null', () => {
    expect(parseDurationText('dez')).toBeNull();
  });
});

describe('evaluateCondition', () => {
  it('compara números', () => {
    expect(evaluateCondition(c('QTD_PENDENTES', '<', '200'), ctx)).toBe('fail');
    expect(evaluateCondition(c('QTD_PENDENTES', '>=', '347'), ctx)).toBe('pass');
  });
  it('igualdade de texto', () => {
    expect(evaluateCondition(c('STATUS', '==', 'UP'), ctx)).toBe('pass');
    expect(evaluateCondition(c('STATUS', '!=', '"UP"'), ctx)).toBe('fail');
  });
  it('between e in', () => {
    expect(evaluateCondition(c('QTD_PENDENTES', 'between', '100..400'), ctx)).toBe('pass');
    expect(evaluateCondition(c('QTD_PENDENTES', 'between', '0, 50'), ctx)).toBe('fail');
    expect(evaluateCondition(c('ADQ', 'in', 'Cielo, Rede'), ctx)).toBe('pass');
    expect(evaluateCondition(c('ADQ', 'in', 'Stone'), ctx)).toBe('fail');
  });
  it('older_than em datas: passa se a data é mais recente que o limite', () => {
    expect(evaluateCondition(c('DT_ULT_LOTE', 'older_than', '60min'), ctx)).toBe('pass');
    expect(evaluateCondition(c('DT_ULT_LOTE', 'older_than', '10min'), ctx)).toBe('fail');
  });
  it('campos de sistema [ROWS], [EXEC_TIME], [STATUS], [RESPONSE_TIME]', () => {
    expect(evaluateCondition(c('[ROWS]', '==', '0'), ctx)).toBe('fail');
    expect(evaluateCondition(c('[EXEC_TIME]', '<', '2s'), ctx)).toBe('pass');
    const http: EvaluationContext = { row: {}, rowCount: 1, elapsedMs: 950, status: 200, now };
    expect(evaluateCondition(c('[STATUS]', '==', '200'), http)).toBe('pass');
    expect(evaluateCondition(c('[RESPONSE_TIME]', '<', '800ms'), http)).toBe('fail');
  });
  it('campo ausente ou valor inválido → invalid', () => {
    expect(evaluateCondition(c('NAO_EXISTE', '<', '1'), ctx)).toBe('invalid');
    expect(evaluateCondition(c('QTD_PENDENTES', '<', 'abc'), ctx)).toBe('invalid');
  });
});

describe('validateCondition', () => {
  const fields = ['QTD_PENDENTES', 'DT_ULT_LOTE', '[ROWS]'];
  it('ok', () => {
    expect(validateCondition(c('QTD_PENDENTES', '<', '200'), fields)).toBeNull();
  });
  it('campo desconhecido', () => {
    expect(validateCondition(c('X', '<', '1'), fields)).toBe('Campo não existe no resultado');
  });
  it('valor vazio', () => {
    expect(validateCondition(c('QTD_PENDENTES', '<', ' '), fields)).toBe('Informe um valor');
  });
  it('between exige dois números', () => {
    expect(validateCondition(c('QTD_PENDENTES', 'between', '10'), fields)).toBe('Use "mín..máx"');
  });
  it('older_than exige duração', () => {
    expect(validateCondition(c('DT_ULT_LOTE', 'older_than', 'ontem'), fields)).toBe('Use uma duração: 10min, 2h, 30s');
  });
});

describe('conditionText', () => {
  it('escreve no estilo Gatus', () => {
    expect(conditionText(c('QTD_PENDENTES', '<', '200'))).toBe('[COL].QTD_PENDENTES < 200');
    expect(conditionText(c('[ROWS]', '==', '0'))).toBe('[ROWS] == 0');
    expect(conditionText(c('DT', 'older_than', '10min'))).toBe('[COL].DT older than 10min');
  });
});
