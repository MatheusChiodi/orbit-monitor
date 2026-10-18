import { describe, expect, it } from 'vitest';
import { countByStatus } from '@/domains/monitor/status';
import { mockSeries, mockSnapshot } from './mockSnapshot';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('mockSnapshot', () => {
  it('incident scenario: one monitor down with an open incident and a violated rule', () => {
    const snap = mockSnapshot('incident', now);
    const counts = countByStatus(snap.monitors);
    expect(counts.down).toBe(1);
    expect(counts.warn).toBe(2);
    const down = snap.monitors.find((m) => m.status === 'DOWN');
    expect(snap.incidents.some((i) => i.monitorId === down?.id && i.severity === 'DOWN')).toBe(true);
    expect(down?.value).toBe(349);
    expect(down?.rule).toEqual({ field: 'QTY', operator: '<', limit: 200 });
  });

  it('all-ok scenario: nothing down or warning and no incidents', () => {
    const snap = mockSnapshot('ok', now);
    const counts = countByStatus(snap.monitors);
    expect(counts.down + counts.warn).toBe(0);
    expect(snap.incidents).toHaveLength(0);
    expect(snap.lastRecoveryAt).not.toBeNull();
  });

  it('every monitor belongs to an existing group', () => {
    const snap = mockSnapshot('incident', now);
    const groups = new Set(snap.groups.map((g) => g.id));
    expect(snap.monitors.every((m) => groups.has(m.groupId))).toBe(true);
  });

  it('timeline in descending order', () => {
    const times = mockSnapshot('incident', now).timeline.map((e) => Date.parse(e.at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe('mockSeries', () => {
  it('generates 60 deterministic points ending at the final value', () => {
    const a = mockSeries(100, 349, 7);
    expect(a).toHaveLength(60);
    expect(a.at(-1)).toBe(349);
    expect(mockSeries(100, 349, 7)).toEqual(a);
  });
  it('may contain gaps (no response)', () => {
    expect(mockSeries(100, 120, 3, [10, 11]).slice(10, 12)).toEqual([null, null]);
  });
});
