import { describe, expect, it, vi } from 'vitest';
import { fetchWorkspaceDefaults, saveWorkspaceDefaults } from './workspaceDefaults';

const json = (status: number, body: unknown) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('BE-40 workspace defaults client', () => {
  it('reads GET /api/settings/defaults and keeps only valid preference fields', async () => {
    const fetch = vi.fn(async () =>
      json(200, { theme: 'nord', animationLevel: 'minimal', density: 'compact', locale: 'pt-BR', scale: '5m', secret: 'x', operatorName: 'Ana' }),
    );
    const defaults = await fetchWorkspaceDefaults({ fetch });
    expect(fetch).toHaveBeenCalledWith('/api/settings/defaults', expect.anything());
    expect(defaults).toEqual({ theme: 'nord', animation: 'minimal', density: 'compact', locale: 'pt-BR', scale: '5m' });
  });

  it('falls back to orbit.settings.json (GET /api/settings) when the defaults endpoint is missing', async () => {
    const fetch = vi.fn(async (url: string) =>
      url === '/api/settings/defaults' ? json(404, {}) : json(200, { id: 'default', theme: 'dracula', animationLevel: 'off', locale: 'en' }),
    );
    expect(await fetchWorkspaceDefaults({ fetch: fetch as unknown as typeof globalThis.fetch })).toEqual({
      theme: 'dracula',
      animation: 'off',
      locale: 'en',
    });
  });

  it('returns no defaults when the backend is unreachable', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('offline');
    });
    expect(await fetchWorkspaceDefaults({ fetch })).toEqual({});
  });

  it('saves the defaults with PUT /api/settings/defaults (editors only) and returns what was stored', async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => json(200, JSON.parse(String(init?.body))));
    const saved = await saveWorkspaceDefaults({ theme: 'nord', animation: 'minimal' }, { fetch: fetch as unknown as typeof globalThis.fetch });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('/api/settings/defaults');
    expect(init?.method).toBe('PUT');
    expect(new Headers(init?.headers).has('X-Orbit-Operator')).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual({ theme: 'nord', animation: 'minimal' });
    expect(saved).toEqual({ theme: 'nord', animation: 'minimal' });
  });
});
