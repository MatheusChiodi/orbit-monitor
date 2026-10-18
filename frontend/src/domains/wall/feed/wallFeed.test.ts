import { describe, expect, it, vi } from 'vitest';
import type { ConnectWallOptions } from '@/shared/api/wallSocket';
import { mockSnapshot } from '../mock';
import { createWallStore } from '../store';
import { acknowledge, startWallFeed } from './wallFeed';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('startWallFeed', () => {
  it('carrega o snapshot da API e conecta no WebSocket', async () => {
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

  it('mensagens do WebSocket chegam ao store', async () => {
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

  it('sem backend cai para dados de demonstração', async () => {
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
  it('usa a API e aplica o incidente devolvido', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('open');
    const ack = vi.fn().mockResolvedValue({
      ...store.getState().snapshot!.incidents[0]!,
      acknowledgedBy: 'Ana',
      acknowledgedAt: now.toISOString(),
    });
    await acknowledge(store, 'inc-conciliacao', 'Ana', ack);
    expect(ack).toHaveBeenCalledWith('inc-conciliacao', 'Ana');
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('Ana');
  });

  it('em modo demonstração reconhece localmente', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('mock');
    const ack = vi.fn();
    await acknowledge(store, 'inc-conciliacao', 'M. Chiodi', ack);
    expect(ack).not.toHaveBeenCalled();
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('M. Chiodi');
  });

  it('falha da API também reconhece localmente (otimista)', async () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: mockSnapshot('incident', now) });
    store.getState().setConnection('open');
    await acknowledge(store, 'inc-conciliacao', 'Ana', vi.fn().mockRejectedValue(new Error('500')));
    expect(store.getState().snapshot?.incidents[0]?.acknowledgedBy).toBe('Ana');
  });
});
