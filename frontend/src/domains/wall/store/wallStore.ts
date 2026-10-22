import { createStore } from 'zustand/vanilla';
import type { ConnectionStatus } from '@/shared/api/wallSocket';
import type { TimelineEvent, WallMessage, WallSnapshot } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { DEFAULT_LOCALE, messages, type Locale } from '@/shared/i18n/i18n';

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

/** Pure reducer: applies a WebSocket message to the current snapshot. */
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
  /** Events received live, highlighted for 3 s on the timeline. */
  freshEventIds: ReadonlySet<string>;
  /** When the last message arrived (FE-46 stale data indicator). */
  lastUpdateAt: string | null;
  receive: (message: WallMessage) => void;
  setConnection: (connection: WallConnectionState) => void;
  /** Marks an incident acknowledged on this wall only (demo, or the API could not be reached). */
  acknowledgeLocal: (incidentId: string, at?: Date, locale?: Locale) => void;
}

/** Local acknowledgements have no server-recorded client kind yet. */
export const LOCAL_ACK_ACTOR = 'unknown';

export function createWallStore(initial: WallSnapshot | null = null) {
  return createStore<WallState>()((set) => ({
    snapshot: initial,
    lastUpdateAt: null,
    connection: 'connecting',
    freshEventIds: new Set(),
    receive: (message) =>
      set((state) => {
        const snapshot = applyMessage(state.snapshot, message);
        const lastUpdateAt = new Date().toISOString();
        if (message.type !== 'event') return { snapshot, lastUpdateAt };
        const freshEventIds = new Set(state.freshEventIds);
        freshEventIds.add(message.payload.id);
        return { snapshot, freshEventIds, lastUpdateAt };
      }),
    setConnection: (connection) => set({ connection }),
    acknowledgeLocal: (incidentId, at = new Date(), locale = DEFAULT_LOCALE) =>
      set((state) => {
        const snapshot = state.snapshot;
        const incident = snapshot?.incidents.find((i) => i.id === incidentId);
        if (!snapshot || !incident) return {};
        const acknowledgedAt = at.toISOString();
        const event: TimelineEvent = {
          id: `ack-${incidentId}`,
          at: acknowledgedAt,
          kind: 'ACK',
          title: messages(locale).wall.ack.doneAt.replace('{{time}}', formatTime(at)),
          detail: incident.monitorId,
        };
        const freshEventIds = new Set(state.freshEventIds);
        freshEventIds.add(event.id);
        return {
          snapshot: {
            ...snapshot,
            incidents: upsert(snapshot.incidents, { ...incident, acknowledgedBy: LOCAL_ACK_ACTOR, acknowledgedAt }),
            timeline: pushEvent(snapshot.timeline, event),
          },
          freshEventIds,
        };
      }),
  }));
}

export type WallStore = ReturnType<typeof createWallStore>;
