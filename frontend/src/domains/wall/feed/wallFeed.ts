import type { Incident, WallSnapshot } from '@/shared/api/types';
import { ApiError } from '@/shared/api/client';
import type { ConnectWallOptions, WallConnection } from '@/shared/api/wallSocket';
import type { Locale } from '@/shared/i18n/i18n';
import type { WallStore } from '../store';

export interface WallFeedOptions {
  loadSnapshot: () => Promise<WallSnapshot>;
  connect: (options: ConnectWallOptions) => WallConnection;
  url: string;
  /** Demo snapshot, only when explicitly requested (`wall.html?demo`); never a silent fallback. */
  mock?: () => WallSnapshot | Promise<WallSnapshot>;
  /** Without a backend (and without demo), how long to wait before asking again. */
  retryMs?: number;
}

const DEFAULT_RETRY_MS = 5000;

export interface WallFeed {
  stop(): void;
}

/**
 * Loads the initial snapshot and starts listening to `/ws/wall`. Without a backend the wall shows that it
 * is waiting and asks again every `retryMs`; demo data appears only when `mock` was explicitly given.
 */
export async function startWallFeed(store: WallStore, options: WallFeedOptions): Promise<WallFeed> {
  const { receive, setConnection } = store.getState();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let connection: WallConnection | undefined;

  const listen = () => {
    // CORE-09 / BE-38: `connectWall` resumes by stream and sequence and handles gaps itself.
    connection = options.connect({ url: options.url, onMessage: receive, onStatus: setConnection });
  };
  const load = async (): Promise<boolean> => {
    try {
      receive({ type: 'snapshot', payload: await options.loadSnapshot() });
      return true;
    } catch {
      return false;
    }
  };
  const retry = () => {
    timer = setTimeout(() => {
      void load().then((ok) => {
        if (stopped) return;
        if (ok) listen();
        else retry();
      });
    }, options.retryMs ?? DEFAULT_RETRY_MS);
  };
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    connection?.close();
  };

  if (await load()) {
    listen();
    return { stop };
  }
  if (options.mock) {
    receive({ type: 'snapshot', payload: await options.mock() });
    setConnection('mock');
    return { stop() {} };
  }
  setConnection('closed');
  retry();
  return { stop };
}

/** Acknowledges an incident; in demo mode or when the API fails, marks it locally so the wall never gets stuck. */
export async function acknowledge(
  store: WallStore,
  incidentId: string,
  send: (incidentId: string) => Promise<Incident>,
  locale?: Locale,
): Promise<void> {
  const state = store.getState();
  if (state.connection === 'mock') {
    state.acknowledgeLocal(incidentId, new Date(), locale);
    return;
  }
  try {
    const answer = await send(incidentId);
    // The REST answer is the alerting record (no impact or escalation fields): keep the wall view and
    // take only who acknowledged and when; the `/ws/wall` incident message brings the full view anyway.
    const current = store.getState().snapshot?.incidents.find((i) => i.id === incidentId);
    const payload: Incident = current
      ? { ...current, acknowledgedBy: answer.acknowledgedBy, acknowledgedAt: answer.acknowledgedAt }
      : { ...answer, impact: answer.impact ?? [], escalatesAt: answer.escalatesAt ?? null };
    store.getState().receive({ type: 'incident', payload });
  } catch (error) {
    // The API answered and refused (403 access policy, 409 already resolved): never fake it locally.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return;
    store.getState().acknowledgeLocal(incidentId, new Date(), locale);
  }
}
