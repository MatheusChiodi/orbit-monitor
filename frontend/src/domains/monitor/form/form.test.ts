import { describe, expect, it } from 'vitest';
import { buildDefinition, buildTarget, initialFormState, parseHeaders, previewContext, validateForm } from './form';

describe('parseHeaders', () => {
  it('uma linha por header "Nome: valor"', () => {
    expect(parseHeaders('Accept: application/json\nX-Trace:  abc \n\n')).toEqual({ Accept: 'application/json', 'X-Trace': 'abc' });
  });
  it('ignora linhas sem dois-pontos', () => {
    expect(parseHeaders('lixo')).toEqual({});
  });
});

describe('buildTarget', () => {
  it('SQL', () => {
    const state = { ...initialFormState(), type: 'SQL' as const, connectionId: 'c1', sql: 'SELECT 1' };
    expect(buildTarget(state)).toEqual({ type: 'SQL', connectionId: 'c1', sql: 'SELECT 1' });
  });
  it('HTTP com headers e sem body no GET', () => {
    const state = { ...initialFormState(), type: 'HTTP' as const, url: 'https://x/health', headersText: 'A: 1', body: '{}' };
    expect(buildTarget(state)).toEqual({ type: 'HTTP', method: 'GET', url: 'https://x/health', headers: { A: '1' } });
  });
  it('HTTP POST leva body', () => {
    const state = { ...initialFormState(), type: 'HTTP' as const, method: 'POST' as const, url: 'https://x', body: '{"a":1}' };
    expect(buildTarget(state)).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });
});

describe('validateForm', () => {
  it('lista o que falta', () => {
    expect(validateForm({ ...initialFormState(), type: 'SQL' })).toEqual([
      'Informe o nome',
      'Escolha o grupo',
      'Escolha a conexão',
      'Cole um SELECT',
    ]);
  });
  it('URL precisa ser http(s)', () => {
    const errors = validateForm({ ...initialFormState(), type: 'HTTP', name: 'a', groupId: 'g', url: 'ftp://x' });
    expect(errors).toEqual(['URL deve começar com http:// ou https://']);
  });
  it('intervalo entre 15 s e 24 h', () => {
    const base = { ...initialFormState(), type: 'HTTP' as const, name: 'a', groupId: 'g', url: 'https://x' };
    expect(validateForm({ ...base, intervalSeconds: 5 })).toEqual(['Intervalo entre 15 s e 24 h']);
    expect(validateForm({ ...base, intervalSeconds: 60 })).toEqual([]);
  });
  it('SELECT inválido usa a mensagem do modo seguro', () => {
    const errors = validateForm({ ...initialFormState(), type: 'SQL', name: 'a', groupId: 'g', connectionId: 'c', sql: 'DROP TABLE x' });
    expect(errors).toEqual(['Somente SELECT ou WITH']);
  });
});

describe('buildDefinition', () => {
  it('junta configuração, condições e campos', () => {
    const state = {
      ...initialFormState(),
      type: 'SQL' as const,
      name: 'Fila',
      groupId: 'pag',
      connectionId: 'c1',
      sql: 'SELECT 1',
      conditions: [{ field: 'QTD', operator: '<' as const, value: '200', level: 'DOWN' as const }],
    };
    const def = buildDefinition(state);
    expect(def).toMatchObject({ name: 'Fila', groupId: 'pag', type: 'SQL', sql: 'SELECT 1', intervalSeconds: 60, retries: 2 });
    expect(def.conditions).toHaveLength(1);
  });
});

describe('previewContext', () => {
  it('usa a primeira linha, a contagem e o tempo', () => {
    const now = new Date();
    const ctx = previewContext({ columns: [], rows: [{ A: 1 }, { A: 2 }], elapsedMs: 30, status: 200 }, now);
    expect(ctx).toEqual({ row: { A: 1 }, rowCount: 2, elapsedMs: 30, status: 200, now });
  });
  it('sem linhas usa linha vazia', () => {
    expect(previewContext({ columns: [], rows: [], elapsedMs: 1 }, new Date()).row).toEqual({});
  });
});
