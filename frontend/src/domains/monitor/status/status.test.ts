import { describe, expect, it } from 'vitest';
import type { MonitorView, Status } from '@/shared/api/types';
import { createI18n } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import {
  countByStatus,
  globalPhrase,
  groupSummary,
  nearLimit,
  sortExceptionsFirst,
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

const en = createI18n('en');
const pt = createI18n('pt-BR');

describe('countByStatus', () => {
  it('counts down, warning and ok', () => {
    expect(countByStatus([m('a', 'DOWN'), m('b', 'WARN'), m('c', 'WARN'), m('d', 'OK')])).toEqual({
      down: 1,
      warn: 2,
      ok: 1,
      total: 4,
    });
  });
});

describe('worstStatus', () => {
  it('worst state wins', () => {
    expect(worstStatus(['OK', 'WARN', 'DOWN'])).toBe('DOWN');
    expect(worstStatus(['OK', 'WARN'])).toBe('WARN');
    expect(worstStatus([])).toBe('OK');
  });
});

describe('globalPhrase', () => {
  it('"1 monitor down" / "1 monitor fora"', () => {
    const phrase = globalPhrase({ down: 1, warn: 2, ok: 17, total: 20 });
    expect(translate(en.t, phrase)).toBe('1 monitor down');
    expect(translate(pt.t, phrase)).toBe('1 monitor fora');
  });
  it('plural "3 monitors down"', () => {
    expect(translate(en.t, globalPhrase({ down: 3, warn: 0, ok: 1, total: 4 }))).toBe('3 monitors down');
  });
  it('"2 warning" / "2 em atenção" when nothing is down', () => {
    const phrase = globalPhrase({ down: 0, warn: 2, ok: 5, total: 7 });
    expect(translate(en.t, phrase)).toBe('2 warning');
    expect(translate(pt.t, phrase)).toBe('2 em atenção');
  });
  it('"All systems operational" / "Tudo operacional"', () => {
    const phrase = globalPhrase({ down: 0, warn: 0, ok: 5, total: 5 });
    expect(translate(en.t, phrase)).toBe('All systems operational');
    expect(translate(pt.t, phrase)).toBe('Tudo operacional');
  });
});

describe('tabTitle', () => {
  it('"(3) Orbit" with problems', () => {
    expect(tabTitle({ down: 1, warn: 2, ok: 17, total: 20 })).toBe('(3) Orbit');
  });
  it('"Orbit" when everything is ok', () => {
    expect(tabTitle({ down: 0, warn: 0, ok: 3, total: 3 })).toBe('Orbit');
  });
});

describe('sortExceptionsFirst', () => {
  it('down, warning, then ok', () => {
    const sorted = sortExceptionsFirst([m('ok', 'OK'), m('warn', 'WARN'), m('down', 'DOWN')]);
    expect(sorted.map((x) => x.id)).toEqual(['down', 'warn', 'ok']);
  });
  it('unowned before acknowledged within the same state', () => {
    const sorted = sortExceptionsFirst([m('ack', 'DOWN'), m('noack', 'DOWN')], new Set(['ack']));
    expect(sorted.map((x) => x.id)).toEqual(['noack', 'ack']);
  });
  it('oldest first within the same state', () => {
    const sorted = sortExceptionsFirst([
      m('new', 'WARN', { since: '2026-10-18T17:05:00.000Z' }),
      m('old', 'WARN', { since: '2026-10-18T16:00:00.000Z' }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['old', 'new']);
  });
  it('ok monitors alphabetically, without mutating the input', () => {
    const input = [m('b', 'OK'), m('a', 'OK')];
    expect(sortExceptionsFirst(input).map((x) => x.id)).toEqual(['a', 'b']);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('groupSummary', () => {
  it('3 of 4 ok, worst state WARN', () => {
    expect(groupSummary([m('a', 'OK'), m('b', 'OK'), m('c', 'OK'), m('d', 'WARN')])).toEqual({
      ok: 3,
      total: 4,
      status: 'WARN',
    });
  });
  it('all ok', () => {
    expect(groupSummary([m('a', 'OK'), m('b', 'OK')])).toEqual({ ok: 2, total: 2, status: 'OK' });
  });
});

describe('nearLimit', () => {
  const rule = { field: 'QTY', operator: '<' as const, limit: 100 };
  it('sorts from least to most headroom and keeps 5', () => {
    const list = [10, 95, 50, 80, 30, 70, 99].map((v, i) => m(`m${i}`, 'OK', { value: v, rule }));
    const result = nearLimit(list);
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.monitor.value)).toEqual([99, 95, 80, 70, 50]);
    expect(result[0]?.headroom).toBeCloseTo(0.01);
  });
  it('ignores down monitors and those without rule or value', () => {
    const list = [
      m('down', 'DOWN', { value: 150, rule }),
      m('norule', 'OK', { value: 1 }),
      m('novalue', 'OK', { value: null, rule }),
      m('ok', 'WARN', { value: 90, rule }),
    ];
    expect(nearLimit(list).map((r) => r.monitor.id)).toEqual(['ok']);
  });
});
