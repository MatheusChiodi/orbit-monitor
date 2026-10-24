import { describe, expect, it, vi } from 'vitest';
import { createDemoVariablesApi, createVariablesApi, workspaceReset } from './variablesApi';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const view = { id: 'var_region', name: 'region', kind: 'var', value: 'sa-east-1', description: 'AWS region', updatedAt: '2026-10-24T10:00:00Z', updatedBy: 'local' };

describe('workspace variables API (/api/variables)', () => {
  it('lists the { version, items } payload', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ version: 1, items: [view, { id: 'bad' }] }));
    const list = await createVariablesApi({ fetch: fetchMock }).list();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/variables');
    expect(list).toEqual([view]);
  });

  it('creates with POST, updates with PUT and deletes with DELETE', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => json(view));
    const api = createVariablesApi({ fetch: fetchMock });
    await api.save(null, { name: 'region', kind: 'var', value: 'sa-east-1', description: '' });
    await api.save('var_region', { name: 'region', kind: 'vault', value: null, description: '' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.remove('var_region');
    expect(fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`)).toEqual(['POST /api/variables', 'PUT /api/variables/var_region', 'DELETE /api/variables/var_region']);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ id: 'var_region', name: 'region', kind: 'VAULT', value: null, description: '' });
  });

  it('a 404 means no variables yet', async () => {
    const api = createVariablesApi({ fetch: vi.fn<typeof fetch>().mockResolvedValue(json({ message: 'nope' }, 404)) });
    expect(await api.list()).toEqual([]);
  });

  it('the demo keeps variables in memory and never shows a secret', async () => {
    const api = createDemoVariablesApi();
    await api.save(null, { name: 'token', kind: 'vault', value: 's3cr3t', description: '' });
    const saved = (await api.list()).find((v) => v.name === 'token');
    expect(saved).toMatchObject({ id: 'var_token', kind: 'vault' });
    expect(saved?.value).not.toContain('s3cr3t');
  });

  it('workspace reset posts to /api/workspace/reset', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ reset: ['defaults', 'customization', 'terminology'] }));
    expect(await workspaceReset({ fetch: fetchMock })).toEqual(['defaults', 'customization', 'terminology']);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });
});
