import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { useWallPresentation } from './useWallLayouts';
import { BUILT_IN_BLOCKS } from './wallLayout';

const block = (kind: WallLayout['blocks'][number]['kind']) => ({ id: kind, kind, x: 0, y: 0, w: 12, h: 2 });
const rotation: WallLayout = {
  id: 'l-rot',
  slug: 'rotation',
  name: 'Rotation',
  blocks: [block('matrix')],
  themeId: 'nord',
  animationLevel: 'minimal',
  playlist: { entries: [{ layout: 'rotation', seconds: 10 }, { layout: 'exec', seconds: 10 }] },
};
const exec: WallLayout = { id: 'l-exec', slug: 'exec', name: 'Executive', blocks: [block('uptime')], themeId: 'github-light' };

function loader(layouts: WallLayout[]) {
  return vi.fn(async (slug: string) => layouts.find((l) => l.slug === slug) ?? null);
}

afterEach(() => vi.useRealTimers());

describe('FE-11 / FE-19 wall presentation', () => {
  it('renders the saved layout of the slug with its theme and animation override', async () => {
    const load = loader([exec]);
    const { result } = renderHook(() => useWallPresentation({ load, slug: 'exec', unacknowledgedIncident: false }));
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current).toMatchObject({ slug: 'exec', blocks: exec.blocks, themeId: 'github-light', animationLevel: null });
  });

  it('a missing layout (404, offline) falls back to the built-in NOC blocks', async () => {
    const load = vi.fn(async () => {
      throw new Error('offline');
    });
    const { result } = renderHook(() => useWallPresentation({ load, slug: 'noc', unacknowledgedIncident: false }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.blocks).toEqual(BUILT_IN_BLOCKS);
    expect(result.current.themeId).toBeNull();
  });

  it('rotates the playlist layouts and follows each layout theme', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const load = loader([rotation, exec]);
    const { result } = renderHook(() => useWallPresentation({ load, slug: 'rotation', unacknowledgedIncident: false }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(load).toHaveBeenCalledWith('exec'));
    expect(result.current).toMatchObject({ slug: 'rotation', themeId: 'nord', animationLevel: 'minimal' });
    expect(result.current.playlist).toMatchObject({ index: 0, total: 2, paused: false });
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toMatchObject({ slug: 'exec', blocks: exec.blocks, themeId: 'github-light' });
  });

  it('holds the current layout while an incident is unacknowledged', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const load = loader([rotation, exec]);
    const { result } = renderHook(() => useWallPresentation({ load, slug: 'rotation', unacknowledgedIncident: true }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.slug).toBe('rotation');
    expect(result.current.playlist?.paused).toBe(true);
  });
});
