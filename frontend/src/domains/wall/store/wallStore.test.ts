import { describe, expect, it } from 'vitest';
import type { Incident, MonitorView, TimelineEvent, WallSnapshot } from '@/shared/api/types';
import { applyMessage, createWallStore, TIMELINE_LIMIT } from './wallStore';

const monitor: MonitorView = {
  id: 'm1',
  name: 'Reconciliation queue',
  groupId: 'g1',
  type: 'SQL',
  status: 'OK',
  value: 120,
  since: '2026-10-18T16:00:00.000Z',
};

const incident: Incident = {
  id: 'i1',
  monitorId: 'm1',
  severity: 'DOWN',
  openedAt: '2026-10-18T17:00:00.000Z',
  acknowledgedBy: null,
  acknowledgedAt: null,
  impact: [],
  escalatesAt: null,
};

function snapshot(extra: Partial<WallSnapshot> = {}): WallSnapshot {
  return {
    generatedAt: '2026-10-18T17:00:00.000Z',
    environment: 'Production',
    groups: [{ id: 'g1', name: 'Payments' }],
    monitors: [monitor],
    incidents: [],
    timeline: [],
    uptime24h: 99.9,
    lastRecoveryAt: null,
    ...extra,
  };
}

function event(id: string): TimelineEvent {
  return { id, at: '2026-10-18T17:00:00.000Z', kind: 'INFO', title: id, detail: '' };
}

describe('applyMessage', () => {
  it('a snapshot replaces everything', () => {
    const next = applyMessage(null, { type: 'snapshot', payload: snapshot() });
    expect(next?.environment).toBe('Production');
  });

  it('without a snapshot partial messages are ignored', () => {
    expect(applyMessage(null, { type: 'monitor', payload: monitor })).toBeNull();
  });

  it('an existing monitor is updated; a new one is added', () => {
    const base = snapshot();
    const updated = applyMessage(base, { type: 'monitor', payload: { ...monitor, status: 'DOWN', value: 349 } });
    expect(updated?.monitors).toHaveLength(1);
    expect(updated?.monitors[0]?.status).toBe('DOWN');
    const added = applyMessage(base, { type: 'monitor', payload: { ...monitor, id: 'm2' } });
    expect(added?.monitors).toHaveLength(2);
    expect(base.monitors).toHaveLength(1);
  });

  it('an incident is inserted, updated and removed on recovery', () => {
    const opened = applyMessage(snapshot(), { type: 'incident', payload: incident });
    expect(opened?.incidents).toHaveLength(1);
    const acked = applyMessage(opened, {
      type: 'incident',
      payload: { ...incident, acknowledgedBy: 'Ana', acknowledgedAt: '2026-10-18T17:04:00.000Z' },
    });
    expect(acked?.incidents[0]?.acknowledgedBy).toBe('Ana');
    const recovered = applyMessage(acked, { type: 'monitor', payload: { ...monitor, status: 'OK' } });
    expect(recovered?.incidents).toHaveLength(0);
  });

  it('an event goes to the top of the timeline and respects the limit', () => {
    const many = snapshot({ timeline: Array.from({ length: TIMELINE_LIMIT }, (_, i) => event(`e${i}`)) });
    const next = applyMessage(many, { type: 'event', payload: event('novo') });
    expect(next?.timeline[0]?.id).toBe('novo');
    expect(next?.timeline).toHaveLength(TIMELINE_LIMIT);
  });

  it('a repeated event is not duplicated', () => {
    const base = snapshot({ timeline: [event('e1')] });
    expect(applyMessage(base, { type: 'event', payload: event('e1') })?.timeline).toHaveLength(1);
  });
});

describe('createWallStore', () => {
  it('starts empty and connecting', () => {
    const store = createWallStore();
    expect(store.getState().snapshot).toBeNull();
    expect(store.getState().connection).toBe('connecting');
  });

  it('receive applies messages and marks new events as fresh', () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: snapshot() });
    store.getState().receive({ type: 'event', payload: event('e9') });
    expect(store.getState().snapshot?.timeline[0]?.id).toBe('e9');
    expect(store.getState().freshEventIds.has('e9')).toBe(true);
  });

  it('acknowledgeLocal marks the incident and adds an ACK event in the active locale', () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: snapshot({ incidents: [incident] }) });
    store.getState().acknowledgeLocal('i1', 'M. Chiodi', new Date(2026, 9, 18, 17, 4));
    const state = store.getState().snapshot;
    expect(state?.incidents[0]?.acknowledgedBy).toBe('M. Chiodi');
    expect(state?.timeline[0]?.kind).toBe('ACK');
    expect(state?.timeline[0]?.title).toBe('M. Chiodi acknowledged at 17:04');
    const pt = createWallStore();
    pt.getState().receive({ type: 'snapshot', payload: snapshot({ incidents: [incident] }) });
    pt.getState().acknowledgeLocal('i1', 'M. Chiodi', new Date(2026, 9, 18, 17, 4), 'pt-BR');
    expect(pt.getState().snapshot?.timeline[0]?.title).toBe('M. Chiodi reconheceu às 17:04');
  });

  it('setConnection updates the connection state', () => {
    const store = createWallStore();
    store.getState().setConnection('mock');
    expect(store.getState().connection).toBe('mock');
  });
});
