import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TimelineEvent, WallSnapshot } from '@/shared/api/types';
import { mockSnapshot } from '../mock';
import { DEFAULT_SOUND_SETTINGS } from '../sound';
import { useWallAlerts } from './useWallAlerts';

const now = new Date(2026, 9, 18, 17, 10, 0);
const downEvent: TimelineEvent = { id: 'ev-new', at: now.toISOString(), kind: 'DOWN', title: 't', detail: '' };

function withEvent(snapshot: WallSnapshot, event: TimelineEvent): WallSnapshot {
  return { ...snapshot, timeline: [event, ...snapshot.timeline] };
}

describe('FE-47 / FE-48 wall alerts', () => {
  it('plays a sound for a new DOWN event when unmuted, not for the initial snapshot', () => {
    const play = vi.fn();
    const sound = { ...DEFAULT_SOUND_SETTINGS, muted: false };
    const base = mockSnapshot('ok', now);
    const { rerender } = renderHook(({ snap }) => useWallAlerts(snap, { sound, player: { play }, notify: vi.fn(), locale: 'en' }), {
      initialProps: { snap: base },
    });
    expect(play).not.toHaveBeenCalled();
    rerender({ snap: withEvent(base, downEvent) });
    expect(play).toHaveBeenCalledWith('DOWN', sound.volume);
    rerender({ snap: withEvent(base, downEvent) });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stays silent while muted', () => {
    const play = vi.fn();
    const base = mockSnapshot('ok', now);
    const { rerender } = renderHook(
      ({ snap }) => useWallAlerts(snap, { sound: DEFAULT_SOUND_SETTINGS, player: { play }, notify: vi.fn(), locale: 'en' }),
      { initialProps: { snap: base } },
    );
    rerender({ snap: withEvent(base, downEvent) });
    expect(play).not.toHaveBeenCalled();
  });

  it('notifies each new incident once', () => {
    const notify = vi.fn().mockReturnValue(true);
    const ok = mockSnapshot('ok', now);
    const incident = mockSnapshot('incident', now);
    const { rerender } = renderHook(({ snap }) => useWallAlerts(snap, { sound: DEFAULT_SOUND_SETTINGS, player: { play: vi.fn() }, notify, locale: 'en' }), {
      initialProps: { snap: ok },
    });
    rerender({ snap: incident });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[0]?.[0]).toMatchObject({ id: 'inc-reconciliation' });
    rerender({ snap: { ...incident } });
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a snapshot', () => {
    const play = vi.fn();
    expect(() =>
      renderHook(() => useWallAlerts(null, { sound: DEFAULT_SOUND_SETTINGS, player: { play }, notify: vi.fn(), locale: 'en' })),
    ).not.toThrow();
  });
});
