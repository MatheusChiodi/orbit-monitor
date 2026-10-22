import { describe, expect, it, vi } from 'vitest';
import type { ConnectWallOptions } from '@/shared/api/wallSocket';
import { mockSnapshot } from '../mock';
import { createWallStore } from '../store';
import { acknowledge, startWallFeed } from './wallFeed';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('startWallFeed', () => {
  it('loads the snapshot from the API and connects to the WebSocket', async () => {
    const store = createWallStore();
    const snapshot = mockSnapshot('ok', now);
    const connect = vi.fn((options: ConnectWallOptions) => {
      options.onStatus?.('open');
      return { close: vi.fn() };
    });
    await startWallFeed(store, { loadSnapshot: () => Promise.resolve(snapshot), connect, url: 'ws://x/ws/wall' });
    expect(store.getState().snapshot).toBe(snapshot);
    expect(store.getState().connection).toBe('open');
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ url: 'ws://x/ws/wall' }));
  });

  it('WebSocket messages reach the store', async () => {
    const store = createWallStore();
    let options: ConnectWallOptions | undefined;
    await startWallFeed(store, {
      loadSnapshot: () => Promise.resolve(mockSnapshot('ok', now)),
      connect: (o) => {
        options = o;
        return { close: vi.fn() };
      },
      url: 'ws://x',
    });
    options?.onMessage({ type: 'event', payload: { id: 'novo', at: now.toISOString(), kind: 'INFO', title: 't', detail: '' } });
    expect(store.getState().snapshot?.timeline[0]?.id).toBe('novo');
  });

  it('without a backend and without demo, never invents data and retries until the server answers', async () => {
    vi.useFakeTimers();
    try {
      const store = createWallStore();
      const snapshot = mockSnapshot('ok', now);
      const loadSnapshot = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(snapshot);
      const connect = vi.fn(() => ({ close: vi.fn() }));
      const feed = await startWallFeed(store, { loadSnapshot, connect, url: 'ws://x', retryMs: 5000 });
      expect(store.getState().snapshot).toBeNull();
      expect(store.getState().connection).toBe('closed');
      expect(connect).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5000);
      expect(loadSnapshot).toHaveBeenCalledTimes(2);
      expect(store.getState().snapshot).toBe(snapshot);
      expect(connect).toHaveBeenCalledTimes(1);
      feed.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stopping while waiting for the server cancels the retry', async () => {
    vi.useFakeTimers();
    try {
      const loadSnapshot = vi.fn().mockRejectedValue(new Error('offline'));
      const feed = await startWallFeed(createWallStore(), { loadSnapshot, connect: vi.fn(), url: 'ws://x', retryMs: 5000 });
      feed.stop();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(loadSnapshot).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('demo data only when explicitly provided (?demo)', async () => {
    const store = createWallStore();
    const connect = vi.fn();
    const feed = await startWallFeed(store, {
      loadSnapshot: () => Promise.reject(new Error('offline')),
      connect,
      url: 'ws://x',
      mock: () => mockSnapshot('incident', now),
    });
    expect(store.getState().connection).toBe('mock');
    expect(store.getState().snapshot?.incidents.length).toBeGreaterThan(0);
    expect(connect).not.toHaveBeenCalled();
    feed.stop();
  });
});

describe('acknowledge', () => {
  it('uses the API and applies the returned incident', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('open');
    const ack = vi.fn().mockResolvedValue({
      ...store.getState().snapshot!.incidents[0]!,
      acknowledgedBy: 'loopback',
      acknowledgedAt: now.toISOString(),
    });
    await acknowledge(store, 'inc-reconciliation', ack);
    expect(ack).toHaveBeenCalledWith('inc-reconciliation');
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('loopback');
  });

  it('acknowledges locally in demo mode', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('mock');
    const ack = vi.fn();
    await acknowledge(store, 'inc-reconciliation', ack);
    expect(ack).not.toHaveBeenCalled();
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('unknown');
  });

  it('an API failure also acknowledges locally (optimistic)', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('open');
    await acknowledge(store, 'inc-reconciliation', vi.fn().mockRejectedValue(new Error('500')));
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('unknown');
  });
});

