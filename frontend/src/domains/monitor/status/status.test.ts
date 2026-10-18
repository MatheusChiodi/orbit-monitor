import { describe, expect, it } from 'vitest';
import type { MonitorView, Status } from '@/shared/api/types';
import {
  countByStatus,
  globalPhrase,
  groupSummary,
  nearLimit,
  sortExceptionsFirst,
  statusLabel,
  tabTitle,
  worstStatus,
} from './status';

function m(id: string, status: Status, extra: Partial<MonitorView> = {}): MonitorView {
  return {
    id,
    name: id,
    groupId: 'g1',
    type: 'SQL',
    status,
    value: 0,
    since: '2026-10-18T17:00:00.000Z',
    ...extra,
  };
}

describe('countByStatus', () => {
  it('conta fora, atenção e ok', () => {
    expect(countByStatus([m('a', 'DOWN'), m('b', 'WARN'), m('c', 'WARN'), m('d', 'OK')])).toEqual({
      down: 1,
      warn: 2,
      ok: 1,
      total: 4,
    });
  });
});

describe('worstStatus', () => {
  it('pior estado vence', () => {
    expect(worstStatus(['OK', 'WARN', 'DOWN'])).toBe('DOWN');
    expect(worstStatus(['OK', 'WARN'])).toBe('WARN');
    expect(worstStatus([])).toBe('OK');
  });
});

describe('globalPhrase', () => {
  it('"1 monitor fora"', () => {
    expect(globalPhrase({ down: 1, warn: 2, ok: 17, total: 20 })).toBe('1 monitor fora');
  });
  it('plural "3 monitores fora"', () => {
    expect(globalPhrase({ down: 3, warn: 0, ok: 1, total: 4 })).toBe('3 monitores fora');
  });
  it('"2 em atenção" sem nenhum fora', () => {
    expect(globalPhrase({ down: 0, warn: 2, ok: 5, total: 7 })).toBe('2 em atenção');
  });
  it('"Tudo operacional"', () => {
    expect(globalPhrase({ down: 0, warn: 0, ok: 5, total: 5 })).toBe('Tudo operacional');
  });
});

describe('tabTitle', () => {
  it('"(3) Orbit" com problemas', () => {
    expect(tabTitle({ down: 1, warn: 2, ok: 17, total: 20 })).toBe('(3) Orbit');
  });
  it('"Orbit" quando tudo ok', () => {
    expect(tabTitle({ down: 0, warn: 0, ok: 3, total: 3 })).toBe('Orbit');
  });
});

describe('statusLabel', () => {
  it('rótulos em português', () => {
    expect(statusLabel('DOWN')).toBe('FORA');
    expect(statusLabel('WARN')).toBe('ATENÇÃO');
    expect(statusLabel('OK')).toBe('OK');
  });
});

describe('sortExceptionsFirst', () => {
  it('fora, atenção e depois ok', () => {
    const sorted = sortExceptionsFirst([m('ok', 'OK'), m('warn', 'WARN'), m('down', 'DOWN')]);
    expect(sorted.map((x) => x.id)).toEqual(['down', 'warn', 'ok']);
  });
  it('sem responsável antes de reconhecido no mesmo estado', () => {
    const sorted = sortExceptionsFirst([m('ack', 'DOWN'), m('noack', 'DOWN')], new Set(['ack']));
    expect(sorted.map((x) => x.id)).toEqual(['noack', 'ack']);
  });
  it('mais antigo primeiro no mesmo estado', () => {
    const sorted = sortExceptionsFirst([
      m('novo', 'WARN', { since: '2026-10-18T17:05:00.000Z' }),
      m('velho', 'WARN', { since: '2026-10-18T16:00:00.000Z' }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['velho', 'novo']);
  });
  it('ok em ordem alfabética e não muta a entrada', () => {
    const input = [m('b', 'OK'), m('a', 'OK')];
    expect(sortExceptionsFirst(input).map((x) => x.id)).toEqual(['a', 'b']);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('groupSummary', () => {
  it('"3/4 ok · ATENÇÃO"', () => {
    expect(groupSummary([m('a', 'OK'), m('b', 'OK'), m('c', 'OK'), m('d', 'WARN')])).toBe('3/4 ok · ATENÇÃO');
  });
  it('"2/2 ok" sem sufixo', () => {
    expect(groupSummary([m('a', 'OK'), m('b', 'OK')])).toBe('2/2 ok');
  });
});

describe('nearLimit', () => {
  const rule = { field: 'QTD', operator: '<' as const, limit: 100 };
  it('ordena da menor folga para a maior e limita a 5', () => {
    const list = [10, 95, 50, 80, 30, 70, 99].map((v, i) => m(`m${i}`, 'OK', { value: v, rule }));
    const result = nearLimit(list);
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.monitor.value)).toEqual([99, 95, 80, 70, 50]);
    expect(result[0]?.headroom).toBeCloseTo(0.01);
  });
  it('ignora monitores fora, sem regra ou sem valor', () => {
    const list = [
      m('down', 'DOWN', { value: 150, rule }),
      m('semregra', 'OK', { value: 1 }),
      m('semvalor', 'OK', { value: null, rule }),
      m('ok', 'WARN', { value: 90, rule }),
    ];
    expect(nearLimit(list).map((r) => r.monitor.id)).toEqual(['ok']);
  });
});
