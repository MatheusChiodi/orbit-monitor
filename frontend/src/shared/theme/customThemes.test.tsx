import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { sanitizeCustomThemes, useCustomThemes, type ThemesClient } from './customThemes';
import { ORBIT_DARK } from './registry';
import type { OrbitTheme } from './types';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom' };

function fakeClient(items: unknown[]): ThemesClient & { store: unknown[] } {
  const store = [...items];
  return {
    store,
    list: vi.fn(async () => ({ version: 1, items: store as never })),
    create: vi.fn(async (_r, item) => {
      store.push(item);
      return item as never;
    }),
    update: vi.fn(async (_r, id, item) => {
      store.splice(store.findIndex((x) => (x as { id: string }).id === id), 1, item);
      return item as never;
    }),
    remove: vi.fn(async (_r, id) => {
      store.splice(store.findIndex((x) => (x as { id: string }).id === id), 1);
    }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('custom themes in orbit.themes.json', () => {
  it('keeps only valid themes, always as custom, never shadowing a built-in id', () => {
    const result = sanitizeCustomThemes([
      { ...custom, category: 'default' },
      { ...ORBIT_DARK, id: 'nord', name: 'Fake Nord' },
      { id: 'broken', name: 'x', colors: {} },
      'nope',
    ]);
    expect(result).toEqual([custom]);
  });

  it('lists, creates, updates and deletes through the config API', async () => {
    const client = fakeClient([custom]);
    const { result } = renderHook(() => useCustomThemes(client), { wrapper });
    await waitFor(() => expect(result.current.themes).toEqual([custom]));

    const second = { ...custom, id: 'noc-day', name: 'NOC day' };
    await act(() => result.current.save(second));
    expect(client.create).toHaveBeenCalledWith('themes', second);
    await waitFor(() => expect(result.current.themes).toHaveLength(2));

    await act(() => result.current.save({ ...custom, name: 'NOC night 2' }));
    expect(client.update).toHaveBeenCalledWith('themes', 'noc-night', expect.objectContaining({ name: 'NOC night 2' }));

    await act(() => result.current.remove('noc-day'));
    expect(client.remove).toHaveBeenCalledWith('themes', 'noc-day');
    await waitFor(() => expect(result.current.themes.map((t) => t.id)).toEqual(['noc-night']));
  });

  it('refuses to save over a built-in theme id', async () => {
    const client = fakeClient([]);
    const { result } = renderHook(() => useCustomThemes(client), { wrapper });
    await expect(result.current.save({ ...custom, id: 'nord' })).rejects.toThrow();
    expect(client.create).not.toHaveBeenCalled();
  });
});
