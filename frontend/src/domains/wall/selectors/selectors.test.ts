import { describe, expect, it } from 'vitest';
import type { Incident } from '@/shared/api/types';
import { mockSnapshot } from '../mock';
import { alsoActive, groupRows, pickHero, nearLimitEmpty } from './selectors';

const now = new Date(2026, 9, 18, 17, 10, 0);

function incident(id: string, extra: Partial<Incident>): Incident {
  return {
    id,
    monitorId: 'reconciliation',
    severity: 'DOWN',
    openedAt: now.toISOString(),
    acknowledgedBy: null,
    acknowledgedAt: null,
    impact: [],
    escalatesAt: null,
    ...extra,
  };
}

describe('pickHero', () => {
  it('picks the unowned down incident', () => {
    const hero = pickHero(mockSnapshot('incident', now));
    expect(hero?.monitor.id).toBe('reconciliation');
    expect(hero?.incident?.id).toBe('inc-reconciliation');
    expect(hero?.group?.name).toBe('Payments');
  });

  it('null when everything is ok', () => {
    expect(pickHero(mockSnapshot('ok', now))).toBeNull();
  });

  it('down beats warning even when acknowledged', () => {
    const snap = mockSnapshot('incident', now);
    snap.incidents = [
      incident('w', { monitorId: 'acquirer', severity: 'WARN' }),
      incident('d', { monitorId: 'reconciliation', acknowledgedBy: 'Ana', acknowledgedAt: now.toISOString() }),
    ];
    expect(pickHero(snap)?.incident?.id).toBe('d');
  });

  it('a problem monitor without an open incident also becomes the hero', () => {
    const snap = mockSnapshot('incident', now);
    snap.incidents = [];
    expect(pickHero(snap)?.monitor.id).toBe('reconciliation');
    expect(pickHero(snap)?.incident).toBeNull();
  });
});

describe('alsoActive', () => {
  it('lists the other problems, exceptions first, without the hero', () => {
    const snap = mockSnapshot('incident', now);
    const list = alsoActive(snap, 'reconciliation');
    expect(list.map((m) => m.id)).not.toContain('reconciliation');
    expect(list.every((m) => m.status !== 'OK')).toBe(true);
    expect(list).toHaveLength(2);
  });
});

describe('groupRows', () => {
  it('groups with problems move up and problem cells come first', () => {
    const rows = groupRows(mockSnapshot('incident', now));
    expect(rows[0]?.group.name).toBe('Payments');
    expect(rows[0]?.monitors[0]?.id).toBe('reconciliation');
    expect(rows[0]?.status).toBe('DOWN');
    expect(rows[0]?.summary).toEqual({ ok: 2, total: 4, status: 'DOWN' });
  });
  it('groups without monitors are omitted', () => {
    const snap = mockSnapshot('ok', now);
    snap.groups.push({ id: 'empty', name: 'Empty' });
    expect(groupRows(snap).some((r) => r.group.id === 'empty')).toBe(false);
  });

  it('near threshold is empty for lack of a numeric limit, or while limits wait for a reading', () => {
    const monitors = mockSnapshot('ok', now).monitors;
    expect(nearLimitEmpty(monitors.map((m) => ({ ...m, rule: undefined })))).toBe('no-rule');
    expect(nearLimitEmpty(monitors.map((m) => ({ ...m, value: null })))).toBe('waiting');
  });
});
