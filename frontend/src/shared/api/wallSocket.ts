import type { WallMessage } from './types';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

/** Subconjunto do WebSocket usado aqui; facilita testar com um falso. */
export interface SocketLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

const MESSAGE_TYPES: ReadonlySet<string> = new Set(['snapshot', 'monitor', 'incident', 'event']);
const MAX_BACKOFF_MS = 30_000;

export function parseWallMessage(data: unknown): WallMessage | null {
  if (typeof data !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!('type' in parsed) || !('payload' in parsed)) return null;
  if (typeof parsed.type !== 'string' || !MESSAGE_TYPES.has(parsed.type)) return null;
  if (!parsed.payload || typeof parsed.payload !== 'object') return null;
  return parsed as WallMessage;
}

export function wallSocketUrl(location: { protocol: string; host: string }, token?: string): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${protocol}//${location.host}/ws/wall${query}`;
}

export interface ConnectWallOptions {
  url: string;
  onMessage: (message: WallMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
  createSocket?: (url: string) => SocketLike;
  reconnectMs?: number;
}

export interface WallConnection {
  close(): void;
}

/** Conecta em `/ws/wall` e reconecta sozinho com espera exponencial (até 30 s). */
export function connectWall(options: ConnectWallOptions): WallConnection {
  const createSocket = options.createSocket ?? ((url: string) => new WebSocket(url) as SocketLike);
  const baseDelay = options.reconnectMs ?? 1000;
  let attempts = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let socket: SocketLike | undefined;

  function open(): void {
    options.onStatus?.('connecting');
    const current = createSocket(options.url);
    socket = current;
    current.onopen = () => {
      attempts = 0;
      options.onStatus?.('open');
    };
    current.onmessage = (event) => {
      const message = parseWallMessage(event.data);
      if (message) options.onMessage(message);
    };
    current.onerror = () => current.close();
    current.onclose = () => {
      options.onStatus?.('closed');
      if (stopped || socket !== current) return;
      const delay = Math.min(baseDelay * 2 ** attempts, MAX_BACKOFF_MS);
      attempts += 1;
      timer = setTimeout(open, delay);
    };
  }

  open();

  return {
    close() {
      stopped = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  };
}
