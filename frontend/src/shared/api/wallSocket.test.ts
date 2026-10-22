import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectWall, parseWallMessage, wallLayoutSlug, wallSocketUrl, type SocketLike } from './wallSocket';

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
  it('accepts known messages', () => {
    const msg = parseWallMessage(JSON.stringify({ type: 'event', payload: { id: 'e1' } }));
    expect(msg?.type).toBe('event');
  });
  it('rejects invalid JSON or unknown types', () => {
    expect(parseWallMessage('{x')).toBeNull();
    expect(parseWallMessage(JSON.stringify({ type: 'hack', payload: {} }))).toBeNull();
    expect(parseWallMessage(JSON.stringify({ type: 'event' }))).toBeNull();
    expect(parseWallMessage(42)).toBeNull();
  });
});

describe('wallSocketUrl', () => {
  it('maps http to ws and https to wss', () => {
    expect(wallSocketUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/ws/wall');
    expect(wallSocketUrl({ protocol: 'https:', host: 'orbit' }, 'noc')).toBe('wss://orbit/ws/wall?layout=noc');
  });
});

describe('wallLayoutSlug', () => {
  it('reads the layout from /wall/<slug> (no token)', () => {
    expect(wallLayoutSlug('/wall/noc')).toBe('noc');
    expect(wallLayoutSlug('/wall/Payments-Team/')).toBe('payments-team');
  });
  it('wall.html and anything else fall back to the default layout', () => {
    expect(wallLayoutSlug('/wall.html')).toBe('noc');
    expect(wallLayoutSlug('/wall/../etc')).toBe('noc');
  });
});

describe('connectWall', () => {
  it('delivers valid messages and reports the connection state', () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    connectWall({ url: 'ws://x/ws/wall', onMessage, onStatus, createSocket: (u) => new FakeSocket(u) });
    const socket = FakeSocket.instances[0];
    expect(onStatus).toHaveBeenLastCalledWith('connecting');
    socket?.onopen?.();
    expect(onStatus).toHaveBeenLastCalledWith('open');
    socket?.onmessage?.({ data: JSON.stringify({ type: 'monitor', payload: { id: 'm1' } }) });
    socket?.onmessage?.({ data: 'garbage' });
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('reconnects with growing backoff after a drop', () => {
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

  it('BE-38: reconnects with stream and last seq so the server can resume without a snapshot', () => {
    connectWall({ url: 'ws://x/ws/wall?layout=noc', onMessage: vi.fn(), createSocket: (u) => new FakeSocket(u) });
    const first = FakeSocket.instances[0]!;
    first.onmessage?.({ data: JSON.stringify({ type: 'snapshot', seq: 4, stream: 'run-1', payload: {} }) });
    first.onmessage?.({ data: JSON.stringify({ type: 'event', seq: 5, stream: 'run-1', payload: { id: 'e' } }) });
    first.onclose?.();
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances[1]?.url).toBe('ws://x/ws/wall?layout=noc&stream=run-1&since=5');
  });

  it('BE-38: a gap in seq drops the resume point so the next connection gets a snapshot', () => {
    connectWall({ url: 'ws://x/ws/wall', onMessage: vi.fn(), createSocket: (u) => new FakeSocket(u) });
    const first = FakeSocket.instances[0]!;
    first.onmessage?.({ data: JSON.stringify({ type: 'snapshot', seq: 4, stream: 'run-1', payload: {} }) });
    first.onmessage?.({ data: JSON.stringify({ type: 'event', seq: 7, stream: 'run-1', payload: { id: 'e' } }) });
    expect(first.closed).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances[1]?.url).toBe('ws://x/ws/wall');
  });

  it('close() stops and does not reconnect', () => {
    const onStatus = vi.fn();
    const conn = connectWall({ url: 'ws://x', onMessage: vi.fn(), onStatus, createSocket: (u) => new FakeSocket(u) });
    conn.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.instances[0]?.closed).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith('closed');
  });
});
