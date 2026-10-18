import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectWall, parseWallMessage, wallSocketUrl, type SocketLike } from './wallSocket';

class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseWallMessage', () => {
  it('aceita mensagens conhecidas', () => {
    const msg = parseWallMessage(JSON.stringify({ type: 'event', payload: { id: 'e1' } }));
    expect(msg?.type).toBe('event');
  });
  it('rejeita JSON inválido ou tipo desconhecido', () => {
    expect(parseWallMessage('{x')).toBeNull();
    expect(parseWallMessage(JSON.stringify({ type: 'hack', payload: {} }))).toBeNull();
    expect(parseWallMessage(JSON.stringify({ type: 'event' }))).toBeNull();
    expect(parseWallMessage(42)).toBeNull();
  });
});

describe('wallSocketUrl', () => {
  it('troca http por ws e https por wss', () => {
    expect(wallSocketUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/ws/wall');
    expect(wallSocketUrl({ protocol: 'https:', host: 'orbit' }, 'tk')).toBe('wss://orbit/ws/wall?token=tk');
  });
});

describe('connectWall', () => {
  it('entrega mensagens válidas e informa o estado da conexão', () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    connectWall({ url: 'ws://x/ws/wall', onMessage, onStatus, createSocket: (u) => new FakeSocket(u) });
    const socket = FakeSocket.instances[0];
    expect(onStatus).toHaveBeenLastCalledWith('connecting');
    socket?.onopen?.();
    expect(onStatus).toHaveBeenLastCalledWith('open');
    socket?.onmessage?.({ data: JSON.stringify({ type: 'monitor', payload: { id: 'm1' } }) });
    socket?.onmessage?.({ data: 'lixo' });
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('reconecta com espera crescente após queda', () => {
    connectWall({ url: 'ws://x', onMessage: vi.fn(), createSocket: (u) => new FakeSocket(u), reconnectMs: 1000 });
    FakeSocket.instances[0]?.onclose?.();
    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1]?.onclose?.();
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it('close() encerra e não reconecta', () => {
    const onStatus = vi.fn();
    const conn = connectWall({ url: 'ws://x', onMessage: vi.fn(), onStatus, createSocket: (u) => new FakeSocket(u) });
    conn.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.instances[0]?.closed).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith('closed');
  });
});
