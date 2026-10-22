import { describe, expect, it, vi } from 'vitest';
import { CONFIG_RESOURCES, createConfigClient, emptyConfigFile } from './configResources';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('CORE-19 config resource client (one orbit.<feature>.json per resource)', () => {
  it('lists every per-feature resource', () => {
    expect(CONFIG_RESOURCES).toEqual(
      expect.arrayContaining(['requests', 'selects', 'connections', 'layouts', 'themes', 'channels', 'settings', 'groups']),
    );
  });

  it.each(['requests', 'selects', 'connections', 'layouts', 'themes', 'channels', 'groups'] as const)(
    'GET /api/%s returns { version, items }',
    async (resource) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ version: 1, items: [{ id: 'x' }] }));
      const file = await createConfigClient({ fetch: fetchMock }).list(resource);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/${resource}`);
      expect(file).toEqual({ version: 1, items: [{ id: 'x' }] });
    },
  );

  it('controllers that answer a plain array (GET /api/groups) are read as { version, items }', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([{ id: 'grp_pay', name: 'Payments', order: 0 }]));
    expect(await createConfigClient({ fetch: fetchMock }).list('groups')).toEqual({ version: 1, items: [{ id: 'grp_pay', name: 'Payments', order: 0 }] });
  });

  it('a missing file (404) is an empty list, not an error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ title: 'Not found' }, 404));
    expect(await createConfigClient({ fetch: fetchMock }).list('selects')).toEqual(emptyConfigFile());
    expect(emptyConfigFile()).toEqual({ version: 1, items: [] });
  });

  it('creates, updates and deletes items through the resource endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse({ id: 'sel_1', name: 'Queue' }));
    const client = createConfigClient({ fetch: fetchMock, getOperator: () => 'M. Chiodi' });
    await client.create('selects', { name: 'Queue' });
    await client.update('selects', 'sel_1', { name: 'Queue 2' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await client.remove('selects', 'sel_1');
    expect(fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`)).toEqual([
      'POST /api/selects',
      'PUT /api/selects/sel_1',
      'DELETE /api/selects/sel_1',
    ]);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-Orbit-Operator')).toBe('M.%20Chiodi');
  });

  it('secrets never come back in clear text: the API returns only "•••• (vault)" markers', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ version: 1, items: [{ id: 'con_1', password: { enc: 'v1:abc' } }] }));
    const file = await createConfigClient({ fetch: fetchMock }).list('connections');
    expect(JSON.stringify(file)).not.toContain('v1:abc');
    expect(file.items[0]).toMatchObject({ password: { vault: true } });
  });

  it('never stores configuration in the browser', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ version: 1, items: [{ id: 'lay_noc' }] }));
    await createConfigClient({ fetch: fetchMock }).list('layouts');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
