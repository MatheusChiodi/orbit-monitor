import { describe, expect, it } from 'vitest';
import { fromOccurrences, newMaintenanceItem, startOfWeek, toCalendarWindows } from './maintenanceItems';

describe('FE-41 maintenance items', () => {
  it('maps orbit.maintenance.json items to calendar windows (one-off windows only)', () => {
    expect(
      toCalendarWindows([
        { id: 'a', name: 'Deploy', targets: ['payments'], start: '2026-10-22T10:00:00Z', end: '2026-10-22T11:00:00Z' },
        { id: 'b', name: 'Nightly', targets: ['core'], cron: '0 2 * * *', durationMinutes: 60 },
        { id: 'c', name: null, targets: null, start: '2026-10-22T12:00:00Z', end: '2026-10-22T13:00:00Z' },
      ]),
    ).toEqual([
      { id: 'a', title: 'Deploy', groupId: 'payments', start: '2026-10-22T10:00:00Z', end: '2026-10-22T11:00:00Z' },
      { id: 'c', title: 'c', groupId: '', start: '2026-10-22T12:00:00Z', end: '2026-10-22T13:00:00Z' },
    ]);
  });

  it('recurring windows come from /api/maintenance/occurrences, one calendar block per occurrence', () => {
    expect(
      fromOccurrences([
        { windowId: 'n', name: 'Nightly', targets: ['core'], reason: null, start: '2026-10-20T02:00:00Z', end: '2026-10-20T03:00:00Z' },
        { windowId: 'n', name: 'Nightly', targets: ['core'], reason: null, start: '2026-10-21T02:00:00Z', end: '2026-10-21T03:00:00Z' },
      ]),
    ).toEqual([
      { id: 'n@2026-10-20T02:00:00Z', title: 'Nightly', groupId: 'core', start: '2026-10-20T02:00:00Z', end: '2026-10-20T03:00:00Z' },
      { id: 'n@2026-10-21T02:00:00Z', title: 'Nightly', groupId: 'core', start: '2026-10-21T02:00:00Z', end: '2026-10-21T03:00:00Z' },
    ]);
  });

  it('a new window becomes an item with a generated id and the group as target', () => {
    const item = newMaintenanceItem({ title: 'Deploy', groupId: 'payments', start: 's', end: 'e' }, () => 'abc');
    expect(item).toEqual({ id: 'mw-abc', name: 'Deploy', targets: ['payments'], start: 's', end: 'e' });
  });

  it('weeks start on Monday at midnight', () => {
    const monday = startOfWeek(new Date(2026, 9, 22, 15, 30));
    expect([monday.getDay(), monday.getDate(), monday.getHours()]).toEqual([1, 19, 0]);
    expect(startOfWeek(new Date(2026, 9, 25)).getDate()).toBe(19);
  });
});
