import { describe, expect, it } from 'vitest';
import { clampZoom, createChartSyncStore } from './chartSync';

describe('FE-27 synced crosshair and zoom (store)', () => {
  it('charts of the same group share the crosshair time', () => {
    const store = createChartSyncStore();
    store.getState().setCrosshair('page-1', '2026-10-18T17:05:00Z');
    expect(store.getState().crosshair('page-1')).toBe('2026-10-18T17:05:00Z');
    expect(store.getState().crosshair('page-2')).toBeNull();
  });

  it('clearing the crosshair hides it everywhere in the group', () => {
    const store = createChartSyncStore();
    store.getState().setCrosshair('page-1', '2026-10-18T17:05:00Z');
    store.getState().clearCrosshair('page-1');
    expect(store.getState().crosshair('page-1')).toBeNull();
  });

  it('zoom is shared by the group and can be reset', () => {
    const store = createChartSyncStore();
    store.getState().setZoom('page-1', { from: '2026-10-18T16:00:00Z', to: '2026-10-18T17:00:00Z' });
    expect(store.getState().zoom('page-1')).toEqual({ from: '2026-10-18T16:00:00Z', to: '2026-10-18T17:00:00Z' });
    store.getState().resetZoom('page-1');
    expect(store.getState().zoom('page-1')).toBeNull();
  });
});

describe('FE-27 clampZoom', () => {
  const available = { from: '2026-10-17T17:00:00Z', to: '2026-10-18T17:00:00Z' };

  it('cannot zoom outside the in-memory history window (24 h)', () => {
    expect(clampZoom({ from: '2026-10-10T00:00:00Z', to: '2026-10-18T18:00:00Z' }, available)).toEqual(available);
  });

  it('keeps a minimum span of 5 minutes', () => {
    const zoomed = clampZoom({ from: '2026-10-18T17:00:00Z', to: '2026-10-18T17:01:00Z' }, available);
    expect(Date.parse(zoomed.to) - Date.parse(zoomed.from)).toBe(5 * 60_000);
  });

  it('swaps an inverted range', () => {
    expect(clampZoom({ from: '2026-10-18T16:00:00Z', to: '2026-10-18T15:00:00Z' }, available)).toEqual({
      from: '2026-10-18T15:00:00Z',
      to: '2026-10-18T16:00:00Z',
    });
  });
});
