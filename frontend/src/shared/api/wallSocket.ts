import type { WallMessage } from './types';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

/** Subset of WebSocket used here; makes it easy to test with a fake. */
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
  const message = parsed as WallMessage;
  if ('seq' in parsed && (typeof parsed.seq !== 'number' || !Number.isFinite(parsed.seq))) delete message.seq;
  return message;
}

export const DEFAULT_WALL_LAYOUT = 'noc';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * The wall has no token: it is addressed by layout slug (`/wall/noc` or `wall.html?layout=noc`);
 * `wall.html` alone means the default layout.
 */
export function wallLayoutSlug(pathname: string, search = ''): string {
  const fromQuery = new URLSearchParams(search).get('layout')?.toLowerCase();
  if (fromQuery && SLUG.test(fromQuery)) return fromQuery;
  const match = /^\/wall\/([a-z0-9][a-z0-9-]{0,63})\/?$/i.exec(pathname);
  return match ? match[1]!.toLowerCase() : DEFAULT_WALL_LAYOUT;
}

/** Adds `since=<seq>` so the server replays only what this client missed (BE-38). */
export function resumeUrl(url: string, since: number | null): string {
  if (since === null) return url;
  return `${url}${url.includes('?') ? '&' : '?'}since=${since}`;
}

export function wallSocketUrl(location: { protocol: string; host: string }, layout?: string): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = layout ? `?layout=${encodeURIComponent(layout)}` : '';
  return `${protocol}//${location.host}/ws/wall${query}`;
}

export interface ConnectWallOptions {
  url: string;
  onMessage: (message: WallMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
  createSocket?: (url: string) => SocketLike;
  reconnectMs?: number;
  /** Last sequence number received, sent as `since` on every (re)connect. */
  since?: () => number | null;
}

export interface WallConnection {
  close(): void;
}

/** Connects to `/ws/wall` and reconnects on its own with exponential backoff (up to 30 s). */
export function connectWall(options: ConnectWallOptions): WallConnection {
  const createSocket = options.createSocket ?? ((url: string) => new WebSocket(url) as SocketLike);
  const baseDelay = options.reconnectMs ?? 1000;
  let attempts = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let socket: SocketLike | undefined;

  function open(): void {
    options.onStatus?.('connecting');
    const current = createSocket(resumeUrl(options.url, options.since?.() ?? null));
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
