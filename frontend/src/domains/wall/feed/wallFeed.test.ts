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

  it('falls back to demo data without a backend', async () => {
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
      acknowledgedBy: 'Ana',
      acknowledgedAt: now.toISOString(),
    });
    await acknowledge(store, 'inc-reconciliation', 'Ana', ack);
    expect(ack).toHaveBeenCalledWith('inc-reconciliation', 'Ana');
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('Ana');
  });

  it('acknowledges locally in demo mode', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('mock');
    const ack = vi.fn();
    await acknowledge(store, 'inc-reconciliation', 'M. Chiodi', ack);
    expect(ack).not.toHaveBeenCalled();
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('M. Chiodi');
  });

  it('an API failure also acknowledges locally (optimistic)', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('open');
    await acknowledge(store, 'inc-reconciliation', 'Ana', vi.fn().mockRejectedValue(new Error('500')));
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('Ana');
  });
});

describe('CORE-09 resume and gaps', () => {
  function setup(loadSnapshot = vi.fn(() => Promise.resolve(mockSnapshot('ok', now)))) {
    const store = createWallStore();
    let options: ConnectWallOptions | undefined;
    const ready = startWallFeed(store, {
      loadSnapshot,
      connect: (o) => {
        options = o;
        return { close: vi.fn() };
      },
      url: 'ws://x',
    });
    const event = (id: string, seq: number) =>
      options?.onMessage({ type: 'event', seq, payload: { id, at: now.toISOString(), kind: 'INFO', title: id, detail: '' } });
    return { store, ready, loadSnapshot, event, since: () => options?.since?.() ?? null };
  }

  it('remembers the last sequence number for the reconnect', async () => {
    const { ready, event, since } = setup();
    await ready;
    expect(since()).toBeNull();
    event('a', 7);
    event('b', 8);
    expect(since()).toBe(8);
  });

  it('drops replayed messages it already has', async () => {
    const { store, ready, event } = setup();
    await ready;
    event('a', 7);
    event('a-again', 7);
    expect(store.getState().snapshot?.timeline.some((e) => e.id === 'a-again')).toBe(false);
  });

  it('a gap in the sequence reloads the snapshot over REST', async () => {
    const { ready, event, loadSnapshot } = setup();
    await ready;
    event('a', 7);
    event('c', 9);
    await vi.waitFor(() => expect(loadSnapshot).toHaveBeenCalledTimes(2));
  });
});
