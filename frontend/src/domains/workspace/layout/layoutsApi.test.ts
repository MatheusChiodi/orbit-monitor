import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLayoutsApi, normalizeLayout, type WallLayout } from './layoutsApi';

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

  it('accepts the BE-41 list shape (plain array) and its blocks ({ type } without id)', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      json([
        {
          id: 'default-noc',
          slug: 'noc',
          name: 'NOC',
          version: 3,
          blocks: [
            { type: 'hero', x: 0, y: 0, w: 8, h: 6, source: null, field: null, display: null },
            { type: 'timeline', x: 8, y: 6, w: 4, h: 4 },
            { type: 'teleporter', x: 0, y: 9, w: 2, h: 2 },
          ],
        },
      ]),
    );
    const [layout] = await createLayoutsApi({ fetch: fetchMock }).list();
    expect(layout?.version).toBe(3);
    expect(layout?.blocks).toEqual([
      { id: 'hero-1', kind: 'hero', x: 0, y: 0, w: 8, h: 6 },
      { id: 'timeline-2', kind: 'timeline', x: 8, y: 6, w: 4, h: 4 },
    ]);
  });

  it('reads one layout by slug (GET /api/layouts/{slug}); 404 means "not configured"', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(noc));
    expect(await createLayoutsApi({ fetch: fetchMock }).bySlug('noc')).toMatchObject({ slug: 'noc', blocks: noc.blocks });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/layouts/noc');
    const missing = createLayoutsApi({ fetch: vi.fn<typeof fetch>().mockResolvedValue(json({ detail: 'Layout not found' }, 404)) });
    expect(await missing.bySlug('tv-2')).toBeNull();
  });

  it('keeps the layout theme (FE-05), animation override (FE-06) and playlist (FE-19), dropping invalid values', () => {
    const layout = normalizeLayout({
      ...noc,
      themeId: 'nord',
      animationLevel: 'minimal',
      playlist: { entries: [{ layout: 'noc', seconds: 60 }, { layout: 'Bad Slug!', seconds: 10 }, { layout: 'exec', seconds: 'x' }] },
    });
    expect(layout).toMatchObject({ themeId: 'nord', animationLevel: 'minimal', playlist: { entries: [{ layout: 'noc', seconds: 60 }] } });
    const invalid = normalizeLayout({ ...noc, themeId: '<script>', animationLevel: 'loud', playlist: 'x' });
    expect(invalid?.themeId).toBeUndefined();
    expect(invalid?.animationLevel).toBeUndefined();
    expect(invalid?.playlist).toBeUndefined();
    expect(normalizeLayout({ id: 'x' })).toBeNull();
  });

  it('saves blocks in the BE-41 shape too (type next to kind) so the backend keeps them', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(noc));
    await createLayoutsApi({ fetch: fetchMock }).save({ ...noc, themeId: 'nord' });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.blocks[0]).toMatchObject({ id: 'hero', kind: 'hero', type: 'hero' });
    expect(body.themeId).toBe('nord');
  });
});
