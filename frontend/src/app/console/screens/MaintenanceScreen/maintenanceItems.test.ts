import { describe, expect, it } from 'vitest';
import { newMaintenanceItem, startOfWeek, toCalendarWindows } from './maintenanceItems';

describe('FE-41 maintenance items', () => {
  it('maps orbit.maintenance.json items to calendar windows (one-off windows only)', () => {
    expect(
      toCalendarWindows([
        { id: 'a', name: 'Deploy', targets: ['payments'], start: '2026-10-22T10:00:00Z', end: '2026-10-22T11:00:00Z' },
        { id: 'b', name: 'Nightly', targets: ['core'], cron: '0 2 * * *', duration: 'PT1H' },
        { id: 'c', name: null, targets: null, start: '2026-10-22T12:00:00Z', end: '2026-10-22T13:00:00Z' },
      ]),
    ).toEqual([
      { id: 'a', title: 'Deploy', groupId: 'payments', start: '2026-10-22T10:00:00Z', end: '2026-10-22T11:00:00Z' },
      { id: 'c', title: 'c', groupId: '', start: '2026-10-22T12:00:00Z', end: '2026-10-22T13:00:00Z' },
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
