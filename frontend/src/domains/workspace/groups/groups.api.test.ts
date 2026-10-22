import { describe, expect, it, vi } from 'vitest';
import { createConfigClient } from '@/shared/api/configResources';
import { loadGroups } from './groups';

describe('CORE-07 groups from the real GET /api/groups (a JSON array of GroupResponse)', () => {
  it('reads the array the GroupController returns, keeping the configured order', async () => {
    const body = [
      { id: 'grp_core', name: 'Core Banking', order: 2, status: 'OK', monitorOrder: ['m2'] },
      { id: 'grp_pay', name: 'Payments', order: 1, status: 'DOWN', monitorOrder: [] },
    ];
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }));
    const groups = await loadGroups(createConfigClient({ fetch: fetchMock }));
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/groups');
    expect(groups.map((g) => g.id)).toEqual(['grp_pay', 'grp_core']);
  });
});
