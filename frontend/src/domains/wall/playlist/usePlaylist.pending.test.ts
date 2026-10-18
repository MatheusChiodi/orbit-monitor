import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaylist } from './usePlaylist';

const playlist = {
  entries: [
    { layout: 'noc', seconds: 10 },
    { layout: 'executive', seconds: 10 },
  ],
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('FE-19 usePlaylist', () => {
  it('rotates layouts on a timer', () => {
    const { result } = renderHook(() => usePlaylist(playlist, { unacknowledgedIncident: false }));
    expect(result.current.layout).toBe('noc');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.layout).toBe('executive');
  });

  it('stays on the current layout while an incident is unacknowledged', () => {
    const { result, rerender } = renderHook(({ unack }) => usePlaylist(playlist, { unacknowledgedIncident: unack }), {
      initialProps: { unack: true },
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toMatchObject({ layout: 'noc', paused: true });
    rerender({ unack: false });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.layout).toBe('executive');
  });

  it('clears its timer on unmount', () => {
    const { unmount } = renderHook(() => usePlaylist(playlist, { unacknowledgedIncident: false }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
