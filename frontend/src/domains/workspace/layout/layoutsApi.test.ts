import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLayoutsApi, type WallLayout } from './layoutsApi';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const noc: WallLayout = {
  id: 'lay_noc',
  slug: 'noc',
  name: 'NOC',
  blocks: [{ id: 'hero', kind: 'hero', x: 0, y: 0, w: 7, h: 4 }],
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('FE-11 layouts API (/api/layouts, mirrors orbit.layouts.json)', () => {
  it('lists layouts from the { version, items } payload', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ version: 1, items: [noc] }));
    const layouts = await createLayoutsApi({ fetch: fetchMock }).list();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/layouts');
    expect(layouts).toEqual([noc]);
  });

  it('a missing file (404 or empty items) means "no layouts yet", not an error', async () => {
    const api = createLayoutsApi({ fetch: vi.fn<typeof fetch>().mockResolvedValue(json({ version: 1, items: [] })) });
    expect(await api.list()).toEqual([]);
    const missing = createLayoutsApi({ fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 })) });
    expect(await missing.list()).toEqual([]);
  });

  it('saves with PUT /api/layouts/{id}', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(noc));
    await createLayoutsApi({ fetch: fetchMock }).save(noc);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/layouts/lay_noc');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toMatchObject({ slug: 'noc', blocks: noc.blocks });
  });

  it('a view-only client gets 403 and the error says so', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ detail: 'Edits only from loopback' }, 403));
    await expect(createLayoutsApi({ fetch: fetchMock }).save(noc)).rejects.toMatchObject({ status: 403 });
  });

  it('never stores layouts in browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    // A Response body can be read once, so each call gets a fresh one.
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => json({ version: 1, items: [noc] }));
    const api = createLayoutsApi({ fetch: fetchMock });
    await api.list();
    await api.save(noc);
    expect(setItem).not.toHaveBeenCalled();
  });
});
