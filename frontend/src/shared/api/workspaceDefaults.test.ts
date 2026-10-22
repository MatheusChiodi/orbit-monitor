import { describe, expect, it, vi } from 'vitest';
import { fetchWorkspaceDefaults } from './workspaceDefaults';

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
});
