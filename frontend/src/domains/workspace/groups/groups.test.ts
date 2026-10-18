import { describe, expect, it, vi } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { groupStates, loadGroups } from './groups';

function m(id: string, groupId: string, status: MonitorView['status']): MonitorView {
  return { id, name: id, groupId, type: 'SQL', status, value: 1, since: '2026-10-18T17:00:00.000Z' };
}

describe('CORE-07 groups from orbit.groups.json', () => {
  it('loads { version, items } from /api/groups, keeping the configured order', async () => {
    const list = vi.fn().mockResolvedValue({
      version: 1,
      items: [
        { id: 'grp_core', name: 'Core Banking', order: 2, color: '#3b9eff', owner: 'DBA team', tags: ['db'] },
        { id: 'grp_pay', name: 'Payments', order: 1 },
      ],
    });
    const groups = await loadGroups({ list });
    expect(list).toHaveBeenCalledWith('groups');
    expect(groups.map((g) => g.id)).toEqual(['grp_pay', 'grp_core']);
    expect(groups[1]).toMatchObject({ owner: 'DBA team', tags: ['db'] });
  });

  it('a missing file means no groups yet', async () => {
    expect(await loadGroups({ list: vi.fn().mockResolvedValue({ version: 1, items: [] }) })).toEqual([]);
  });

  it('group state is the worst state of its monitors; maintenance groups stay neutral', () => {
    const states = groupStates(
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C', maintenance: true }, { id: 'd', name: 'D' }],
      [m('1', 'a', 'OK'), m('2', 'a', 'WARN'), m('3', 'b', 'DOWN'), m('4', 'b', 'OK'), m('5', 'c', 'DOWN')],
    );
    expect(states).toEqual({ a: 'WARN', b: 'DOWN', c: 'MAINTENANCE', d: 'EMPTY' });
  });
});
