import { createStore } from 'zustand/vanilla';
import type { ConnectionStatus } from '@/shared/api/wallSocket';
import type { TimelineEvent, WallMessage, WallSnapshot } from '@/shared/api/types';
import { formatTime } from '@/shared/format';

export const TIMELINE_LIMIT = 40;

function upsert<T extends { id: string }>(list: readonly T[], item: T): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

function pushEvent(timeline: readonly TimelineEvent[], event: TimelineEvent): TimelineEvent[] {
  if (timeline.some((e) => e.id === event.id)) return [...timeline];
  return [event, ...timeline].slice(0, TIMELINE_LIMIT);
}

/** Redutor puro: aplica uma mensagem do WebSocket ao snapshot atual. */
export function applyMessage(snapshot: WallSnapshot | null, message: WallMessage): WallSnapshot | null {
  if (message.type === 'snapshot') return message.payload;
  if (!snapshot) return null;
  switch (message.type) {
    case 'monitor': {
      const monitor = message.payload;
      const incidents =
        monitor.status === 'OK' ? snapshot.incidents.filter((i) => i.monitorId !== monitor.id) : snapshot.incidents;
      return { ...snapshot, monitors: upsert(snapshot.monitors, monitor), incidents };
    }
    case 'incident':
      return { ...snapshot, incidents: upsert(snapshot.incidents, message.payload) };
    case 'event':
      return { ...snapshot, timeline: pushEvent(snapshot.timeline, message.payload) };
  }
}

export type WallConnectionState = ConnectionStatus | 'mock';

export interface WallState {
  snapshot: WallSnapshot | null;
  connection: WallConnectionState;
  /** Eventos recebidos ao vivo, destacados por 3 s na linha do tempo. */
  freshEventIds: ReadonlySet<string>;
  receive: (message: WallMessage) => void;
  setConnection: (connection: WallConnectionState) => void;
  acknowledgeLocal: (incidentId: string, by: string, at?: Date) => void;
}

export function createWallStore(initial: WallSnapshot | null = null) {
  return createStore<WallState>()((set) => ({
    snapshot: initial,
    connection: 'connecting',
    freshEventIds: new Set(),
    receive: (message) =>
      set((state) => {
        const snapshot = applyMessage(state.snapshot, message);
        if (message.type !== 'event') return { snapshot };
        const freshEventIds = new Set(state.freshEventIds);
        freshEventIds.add(message.payload.id);
        return { snapshot, freshEventIds };
      }),
    setConnection: (connection) => set({ connection }),
    acknowledgeLocal: (incidentId, by, at = new Date()) =>
      set((state) => {
        const snapshot = state.snapshot;
        const incident = snapshot?.incidents.find((i) => i.id === incidentId);
        if (!snapshot || !incident) return {};
        const acknowledgedAt = at.toISOString();
        const event: TimelineEvent = {
          id: `ack-${incidentId}`,
          at: acknowledgedAt,
          kind: 'ACK',
          title: `${by} reconheceu às ${formatTime(at)}`,
          detail: incident.monitorId,
        };
        const freshEventIds = new Set(state.freshEventIds);
        freshEventIds.add(event.id);
        return {
          snapshot: {
            ...snapshot,
            incidents: upsert(snapshot.incidents, { ...incident, acknowledgedBy: by, acknowledgedAt }),
            timeline: pushEvent(snapshot.timeline, event),
          },
          freshEventIds,
        };
      }),
  }));
}

export type WallStore = ReturnType<typeof createWallStore>;
