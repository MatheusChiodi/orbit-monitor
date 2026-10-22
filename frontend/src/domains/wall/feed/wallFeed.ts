import type { Incident, WallSnapshot } from '@/shared/api/types';
import { ApiError } from '@/shared/api/client';
import type { ConnectWallOptions, WallConnection } from '@/shared/api/wallSocket';
import type { Locale } from '@/shared/i18n/i18n';
import type { WallStore } from '../store';

export interface WallFeedOptions {
  loadSnapshot: () => Promise<WallSnapshot>;
  connect: (options: ConnectWallOptions) => WallConnection;
  url: string;
  /** Demo snapshot used when the backend does not answer (may be loaded on demand). */
  mock?: () => WallSnapshot | Promise<WallSnapshot>;
}

export interface WallFeed {
  stop(): void;
}

/** Loads the initial snapshot and starts listening to `/ws/wall`; without a backend, uses demo data. */
export async function startWallFeed(store: WallStore, options: WallFeedOptions): Promise<WallFeed> {
  const { receive, setConnection } = store.getState();
  try {
    receive({ type: 'snapshot', payload: await options.loadSnapshot() });
  } catch {
    if (options.mock) receive({ type: 'snapshot', payload: await options.mock() });
    setConnection('mock');
    return { stop() {} };
  }
  // CORE-09 / BE-38: `connectWall` resumes by stream and sequence and handles gaps itself.
  const connection = options.connect({
    url: options.url,
    onMessage: receive,
    onStatus: setConnection,
  });
  return { stop: () => connection.close() };
}

/** Acknowledges an incident; in demo mode or when the API fails, marks it locally so the wall never gets stuck. */
export async function acknowledge(
  store: WallStore,
  incidentId: string,
  by: string,
  send: (incidentId: string, by: string) => Promise<Incident>,
  locale?: Locale,
): Promise<void> {
  const state = store.getState();
  if (state.connection === 'mock') {
    state.acknowledgeLocal(incidentId, by, new Date(), locale);
    return;
  }
  try {
    const answer = await send(incidentId, by);
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
    store.getState().acknowledgeLocal(incidentId, by, new Date(), locale);
  }
}
