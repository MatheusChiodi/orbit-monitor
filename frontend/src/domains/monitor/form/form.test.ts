import { describe, expect, it } from 'vitest';
import { buildDefinition, buildTarget, initialFormState, parseHeaders, previewContext, validateForm } from './form';

describe('parseHeaders', () => {
  it('one header per line, "Name: value"', () => {
    expect(parseHeaders('Accept: application/json\nX-Trace:  abc \n\n')).toEqual({ Accept: 'application/json', 'X-Trace': 'abc' });
  });
  it('ignores lines without a colon', () => {
    expect(parseHeaders('garbage')).toEqual({});
  });
});

describe('buildTarget', () => {
  it('SQL', () => {
    const state = { ...initialFormState(), type: 'SQL' as const, connectionId: 'c1', sql: 'SELECT 1' };
    expect(buildTarget(state)).toEqual({ type: 'SQL', connectionId: 'c1', sql: 'SELECT 1' });
  });
  it('HTTP with headers and no body on GET', () => {
    const state = { ...initialFormState(), type: 'HTTP' as const, url: 'https://x/health', headersText: 'A: 1', body: '{}' };
    expect(buildTarget(state)).toEqual({ type: 'HTTP', method: 'GET', url: 'https://x/health', headers: { A: '1' } });
  });
  it('HTTP POST carries the body', () => {
    const state = { ...initialFormState(), type: 'HTTP' as const, method: 'POST' as const, url: 'https://x', body: '{"a":1}' };
    expect(buildTarget(state)).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });
});

describe('validateForm', () => {
  it('lists what is missing', () => {
    expect(validateForm({ ...initialFormState(), type: 'SQL' })).toEqual([
      { key: 'form.errors.nameRequired' },
      { key: 'form.errors.groupRequired' },
      { key: 'form.errors.connectionRequired' },
      { key: 'sql.errors.empty' },
    ]);
  });
  it('URL must be http(s)', () => {
    const errors = validateForm({ ...initialFormState(), type: 'HTTP', name: 'a', groupId: 'g', url: 'ftp://x' });
    expect(errors).toEqual([{ key: 'form.errors.urlInvalid' }]);
  });
  it('interval between 15 s and 24 h', () => {
    const base = { ...initialFormState(), type: 'HTTP' as const, name: 'a', groupId: 'g', url: 'https://x' };
    expect(validateForm({ ...base, intervalSeconds: 5 })).toEqual([{ key: 'form.errors.intervalRange' }]);
    expect(validateForm({ ...base, intervalSeconds: 60 })).toEqual([]);
  });
  it('an invalid SELECT uses the safe-mode message', () => {
    const errors = validateForm({ ...initialFormState(), type: 'SQL', name: 'a', groupId: 'g', connectionId: 'c', sql: 'DROP TABLE x' });
    expect(errors).toEqual([{ key: 'sql.errors.notSelect' }]);
  });
});

describe('buildDefinition', () => {
  it('combines configuration, conditions and fields', () => {
    const state = {
      ...initialFormState(),
      type: 'SQL' as const,
      name: 'Queue',
      groupId: 'pay',
      connectionId: 'c1',
      sql: 'SELECT 1',
      conditions: [{ field: 'QTY', operator: '<' as const, value: '200', level: 'DOWN' as const }],
    };
    const def = buildDefinition(state);
    expect(def).toMatchObject({ name: 'Queue', groupId: 'pay', type: 'SQL', sql: 'SELECT 1', intervalSeconds: 60, retries: 2 });
    expect(def.conditions).toHaveLength(1);
  });
});

describe('previewContext', () => {
  it('uses the first row, the row count and the elapsed time', () => {
    const now = new Date();
    const ctx = previewContext({ columns: [], rows: [{ A: 1 }, { A: 2 }], elapsedMs: 30, status: 200 }, now);
    expect(ctx).toEqual({ row: { A: 1 }, rowCount: 2, elapsedMs: 30, status: 200, now });
  });
  it('no rows means an empty row', () => {
    expect(previewContext({ columns: [], rows: [], elapsedMs: 1 }, new Date()).row).toEqual({});
  });
});
