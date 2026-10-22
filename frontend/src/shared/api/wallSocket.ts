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
  return parsed as WallMessage;
}

export const DEFAULT_WALL_LAYOUT = 'noc';

/** The wall has no token: it is addressed by layout slug (`/wall/noc`); `wall.html` means the default layout. */
export function wallLayoutSlug(pathname: string): string {
  const match = /^\/wall\/([a-z0-9][a-z0-9-]{0,63})\/?$/i.exec(pathname);
  return match ? match[1]!.toLowerCase() : DEFAULT_WALL_LAYOUT;
}

export function wallSocketUrl(location: { protocol: string; host: string }, layout?: string): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = layout ? `?layout=${encodeURIComponent(layout)}` : '';
  return `${protocol}//${location.host}/ws/wall${query}`;
}

/** Position in the server stream (BE-38): reconnecting with it resumes without a full snapshot. */
interface ResumePoint {
  stream: string;
  seq: number;
}

function sequenceOf(data: unknown): ResumePoint | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return null;
    const { seq, stream } = parsed as { seq?: unknown; stream?: unknown };
    return typeof seq === 'number' && typeof stream === 'string' ? { stream, seq } : null;
  } catch {
    return null;
  }
}

/** Adds `stream` and `since` so the server replays only the missed deltas. */
export function resumeUrl(url: string, point: ResumePoint | null): string {
  if (!point) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}stream=${encodeURIComponent(point.stream)}&since=${point.seq}`;
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

/** Connects to `/ws/wall` and reconnects on its own with exponential backoff (up to 30 s). */
export function connectWall(options: ConnectWallOptions): WallConnection {
  const createSocket = options.createSocket ?? ((url: string) => new WebSocket(url) as SocketLike);
  const baseDelay = options.reconnectMs ?? 1000;
  let attempts = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let socket: SocketLike | undefined;
  let resume: ResumePoint | null = null;

  function open(): void {
    options.onStatus?.('connecting');
    const current = createSocket(resumeUrl(options.url, resume));
    socket = current;
    current.onopen = () => {
      attempts = 0;
      options.onStatus?.('open');
    };
    current.onmessage = (event) => {
      const message = parseWallMessage(event.data);
      if (!message) return;
      const point = sequenceOf(event.data);
      if (point && message.type !== 'snapshot' && resume && point.stream === resume.stream) {
        if (point.seq <= resume.seq) return; // already applied (replayed after a snapshot)
        if (point.seq !== resume.seq + 1) {
          // A gap: drop the resume point and reconnect for a fresh snapshot.
          resume = null;
          current.close();
          return;
        }
      }
      if (point) resume = point;
      options.onMessage(message);
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
