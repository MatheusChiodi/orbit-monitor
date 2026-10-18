import { describe, expect, it } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { humanizeLabel, suggestFields, suggestReadMode } from './display';

function preview(columns: PreviewResult['columns'], rows: PreviewResult['rows']): PreviewResult {
  return { columns, rows, elapsedMs: 10 };
}

describe('humanizeLabel', () => {
  it('QTD_PENDENTES → "Qtd pendentes"', () => {
    expect(humanizeLabel('QTD_PENDENTES')).toBe('Qtd pendentes');
  });
  it('JSONPath vira o último segmento', () => {
    expect(humanizeLabel('$.fila.tamanho')).toBe('Tamanho');
  });
});

describe('suggestReadMode (tabela da seção 2.2)', () => {
  it('0 linhas → contagem de linhas', () => {
    expect(suggestReadMode(preview([{ name: 'ID', type: 'number' }], []))).toBe('rowcount');
  });
  it('1 linha, 1 coluna numérica → valor único', () => {
    expect(suggestReadMode(preview([{ name: 'QTD', type: 'number' }], [{ QTD: 3 }]))).toBe('single');
  });
  it('1 linha, N colunas → cartão de indicadores', () => {
    const cols = [
      { name: 'PENDENTES', type: 'number' as const },
      { name: 'ERRO', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ PENDENTES: 1, ERRO: 2 }]))).toBe('indicators');
  });
  it('N linhas com data → série temporal', () => {
    const cols = [
      { name: 'DIA', type: 'date' as const },
      { name: 'QTD', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ DIA: 'a', QTD: 1 }, { DIA: 'b', QTD: 2 }]))).toBe('series');
  });
  it('N linhas categoria + número → ranking', () => {
    const cols = [
      { name: 'ADQUIRENTE', type: 'text' as const },
      { name: 'QTD_ERRO', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ ADQUIRENTE: 'a', QTD_ERRO: 1 }, { ADQUIRENTE: 'b', QTD_ERRO: 2 }]))).toBe(
      'ranking',
    );
  });
  it('N linhas genéricas → tabela', () => {
    const cols = [
      { name: 'ID', type: 'text' as const },
      { name: 'CLIENTE', type: 'text' as const },
      { name: 'MIN', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ ID: '1' }, { ID: '2' }]))).toBe('table');
  });
});

describe('suggestFields', () => {
  it('SQL: colunas com formato e exibição sugeridos, mais [ROWS] e [EXEC_TIME]', () => {
    const fields = suggestFields(
      preview(
        [
          { name: 'QTD_PENDENTES', type: 'number' },
          { name: 'PCT_ERRO', type: 'number' },
          { name: 'DT_ULT_LOTE', type: 'date' },
          { name: 'STATUS', type: 'text' },
        ],
        [{ QTD_PENDENTES: 3, PCT_ERRO: 1.5, DT_ULT_LOTE: '2026-10-18', STATUS: 'UP' }],
      ),
      'SQL',
    );
    expect(fields.map((f) => f.field)).toEqual(['QTD_PENDENTES', 'PCT_ERRO', 'DT_ULT_LOTE', 'STATUS', '[ROWS]', '[EXEC_TIME]']);
    const byField = Object.fromEntries(fields.map((f) => [f.field, f]));
    expect(byField.QTD_PENDENTES).toMatchObject({ selected: true, label: 'Qtd pendentes', format: 'integer', display: 'number' });
    expect(byField.PCT_ERRO).toMatchObject({ format: 'percent', decimals: 1 });
    expect(byField.DT_ULT_LOTE).toMatchObject({ format: 'relative', display: 'text' });
    expect(byField.STATUS).toMatchObject({ format: 'text', display: 'text' });
    expect(byField['[ROWS]']).toMatchObject({ selected: false, display: 'hidden' });
    expect(byField['[EXEC_TIME]']).toMatchObject({ format: 'duration', selected: false });
  });

  it('HTTP: inclui [STATUS] e [RESPONSE_TIME]', () => {
    const fields = suggestFields(preview([{ name: '$.status', type: 'text' }], [{ '$.status': 'UP' }]), 'HTTP');
    expect(fields.map((f) => f.field)).toEqual(['$.status', '[STATUS]', '[RESPONSE_TIME]']);
  });

  it('número decimal vira decimal com 2 casas', () => {
    const [f] = suggestFields(preview([{ name: 'VALOR', type: 'number' }], [{ VALOR: 10.5 }]), 'SQL');
    expect(f).toMatchObject({ format: 'decimal', decimals: 2 });
  });
});
