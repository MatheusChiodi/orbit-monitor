import type { Incident, WallSnapshot } from '@/shared/api/types';
import type { ConnectWallOptions, WallConnection } from '@/shared/api/wallSocket';
import type { WallStore } from '../store';

export interface WallFeedOptions {
  loadSnapshot: () => Promise<WallSnapshot>;
  connect: (options: ConnectWallOptions) => WallConnection;
  url: string;
  /** Snapshot de demonstração usado quando o backend não responde. */
  mock?: () => WallSnapshot;
}

export interface WallFeed {
  stop(): void;
}

/** Carrega o snapshot inicial e passa a ouvir `/ws/wall`; sem backend, usa dados de demonstração. */
export async function startWallFeed(store: WallStore, options: WallFeedOptions): Promise<WallFeed> {
  const { receive, setConnection } = store.getState();
  try {
    receive({ type: 'snapshot', payload: await options.loadSnapshot() });
  } catch {
    if (options.mock) receive({ type: 'snapshot', payload: options.mock() });
    setConnection('mock');
    return { stop() {} };
  }
  const connection = options.connect({
    url: options.url,
    onMessage: receive,
    onStatus: setConnection,
  });
  return { stop: () => connection.close() };
}

/** Reconhece um incidente; em demonstração ou falha da API, marca localmente para não travar a parede. */
export async function acknowledge(
  store: WallStore,
  incidentId: string,
  by: string,
  send: (incidentId: string, by: string) => Promise<Incident>,
): Promise<void> {
  const state = store.getState();
  if (state.connection === 'mock') {
    state.acknowledgeLocal(incidentId, by);
    return;
  }
  try {
    const incident = await send(incidentId, by);
    store.getState().receive({ type: 'incident', payload: incident });
  } catch {
    store.getState().acknowledgeLocal(incidentId, by);
  }
}
