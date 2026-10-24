import { describe, expect, it } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { dedupeFields, humanizeLabel, mergeSuggested, suggestFields, suggestReadMode, systemFieldKey } from './display';

function preview(columns: PreviewResult['columns'], rows: PreviewResult['rows']): PreviewResult {
  return { columns, rows, elapsedMs: 10 };
}

describe('humanizeLabel', () => {
  it('PENDING_QTY → "Pending qty"', () => {
    expect(humanizeLabel('PENDING_QTY')).toBe('Pending qty');
  });
  it('JSONPath becomes its last segment', () => {
    expect(humanizeLabel('$.queue.size')).toBe('Size');
  });
});

describe('suggestReadMode (table in section 2.2)', () => {
  it('0 rows → row count', () => {
    expect(suggestReadMode(preview([{ name: 'ID', type: 'number' }], []))).toBe('rowcount');
  });
  it('1 row, 1 numeric column → single value', () => {
    expect(suggestReadMode(preview([{ name: 'QTY', type: 'number' }], [{ QTY: 3 }]))).toBe('single');
  });
  it('1 row, N columns → indicator card', () => {
    const cols = [
      { name: 'PENDING', type: 'number' as const },
      { name: 'ERROR', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ PENDING: 1, ERROR: 2 }]))).toBe('indicators');
  });
  it('N rows with a date → time series', () => {
    const cols = [
      { name: 'DAY', type: 'date' as const },
      { name: 'QTY', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ DAY: 'a', QTY: 1 }, { DAY: 'b', QTY: 2 }]))).toBe('series');
  });
  it('N rows category + number → ranking', () => {
    const cols = [
      { name: 'ACQUIRER', type: 'text' as const },
      { name: 'ERROR_QTY', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ ACQUIRER: 'a', ERROR_QTY: 1 }, { ACQUIRER: 'b', ERROR_QTY: 2 }]))).toBe(
      'ranking',
    );
  });
  it('generic N rows → table', () => {
    const cols = [
      { name: 'ID', type: 'text' as const },
      { name: 'CUSTOMER', type: 'text' as const },
      { name: 'MIN', type: 'number' as const },
    ];
    expect(suggestReadMode(preview(cols, [{ ID: '1' }, { ID: '2' }]))).toBe('table');
  });
});

describe('suggestFields', () => {
  const sql = preview(
    [
      { name: 'PENDING_QTY', type: 'number' },
      { name: 'ERROR_PCT', type: 'number' },
      { name: 'LAST_BATCH_AT', type: 'date' },
      { name: 'STATUS', type: 'text' },
    ],
    [{ PENDING_QTY: 3, ERROR_PCT: 1.5, LAST_BATCH_AT: '2026-10-18', STATUS: 'UP' }],
  );

  it('SQL: columns with suggested format and display, plus [ROWS] and [EXEC_TIME]', () => {
    const fields = suggestFields(sql, 'SQL');
    expect(fields.map((f) => f.field)).toEqual(['PENDING_QTY', 'ERROR_PCT', 'LAST_BATCH_AT', 'STATUS', '[ROWS]', '[EXEC_TIME]']);
    const byField = Object.fromEntries(fields.map((f) => [f.field, f]));
    expect(byField.PENDING_QTY).toMatchObject({ selected: true, label: 'Pending qty', format: 'integer', display: 'number' });
    expect(byField.ERROR_PCT).toMatchObject({ format: 'percent', decimals: 1 });
    expect(byField.LAST_BATCH_AT).toMatchObject({ format: 'relative', display: 'text' });
    expect(byField.STATUS).toMatchObject({ format: 'text', display: 'text' });
    expect(byField['[ROWS]']).toMatchObject({ selected: false, display: 'hidden', label: 'Rows' });
    expect(byField['[EXEC_TIME]']).toMatchObject({ format: 'duration', selected: false, label: 'Execution time' });
  });

  it('system field labels follow the locale', () => {
    const fields = suggestFields(sql, 'SQL', 'pt-BR');
    expect(fields.find((f) => f.field === '[ROWS]')?.label).toBe('Linhas');
  });

  it('HTTP: includes [STATUS] and [RESPONSE_TIME]', () => {
    const fields = suggestFields(preview([{ name: '$.status', type: 'text' }], [{ '$.status': 'UP' }]), 'HTTP');
    expect(fields.map((f) => f.field)).toEqual(['$.status', '[STATUS]', '[RESPONSE_TIME]']);
  });

  it('a decimal number becomes decimal with 2 places', () => {
    const [f] = suggestFields(preview([{ name: 'AMOUNT', type: 'number' }], [{ AMOUNT: 10.5 }]), 'SQL');
    expect(f).toMatchObject({ format: 'decimal', decimals: 2 });
  });
});

describe('built-in values from the HTTP preview (no duplicates)', () => {
  const http = preview(
    [
      { name: '[STATUS]', type: 'number' },
      { name: '[RESPONSE_TIME]', type: 'number' },
      { name: '$.mode', type: 'text' },
    ],
    [{ '[STATUS]': 200, '[RESPONSE_TIME]': 111, '$.mode': 'edit' }],
  );

  it('keeps one entry per key with the friendly label', () => {
    const fields = suggestFields(http, 'HTTP');
    expect(fields.map((f) => f.field)).toEqual(['[STATUS]', '[RESPONSE_TIME]', '$.mode']);
    expect(fields[0]).toMatchObject({ label: 'HTTP status', selected: true, storeAsSeries: false });
    expect(fields[1]).toMatchObject({ label: 'Response time', format: 'duration', selected: true });
  });

  it('dedupes by key, first wins', () => {
    const a = { field: 'X', selected: true, label: 'A', format: 'text' as const, storeAsSeries: false, display: 'text' as const };
    expect(dedupeFields([a, { ...a, label: 'B' }])).toEqual([a]);
  });

  it('names system placeholders', () => {
    expect(systemFieldKey('[RESPONSE_TIME]')).toBe('RESPONSE_TIME');
    expect(systemFieldKey('$.status')).toBeNull();
  });
});

describe('mergeSuggested', () => {
  it('keeps the saved choices and order of the new preview', () => {
    const base = { selected: true, format: 'text' as const, storeAsSeries: false, display: 'text' as const };
    const saved = [{ ...base, field: '$.b', label: 'My B' }, { ...base, field: '$.gone', label: 'Gone' }];
    const suggested = [{ ...base, field: '$.a', label: 'A' }, { ...base, field: '$.b', label: 'B' }];
    expect(mergeSuggested(saved, suggested).map((f) => f.label)).toEqual(['A', 'My B', 'Gone']);
  });
});
