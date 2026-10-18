import { describe, expect, it } from 'vitest';
import type { Incident, MonitorView, TimelineEvent, WallSnapshot } from '@/shared/api/types';
import { applyMessage, createWallStore, TIMELINE_LIMIT } from './wallStore';

const monitor: MonitorView = {
  id: 'm1',
  name: 'Fila de conciliação',
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
    environment: 'Produção',
    groups: [{ id: 'g1', name: 'Pagamentos' }],
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
  it('snapshot substitui tudo', () => {
    const next = applyMessage(null, { type: 'snapshot', payload: snapshot() });
    expect(next?.environment).toBe('Produção');
  });

  it('sem snapshot ignora mensagens parciais', () => {
    expect(applyMessage(null, { type: 'monitor', payload: monitor })).toBeNull();
  });

  it('monitor existente é atualizado; novo é adicionado', () => {
    const base = snapshot();
    const updated = applyMessage(base, { type: 'monitor', payload: { ...monitor, status: 'DOWN', value: 349 } });
    expect(updated?.monitors).toHaveLength(1);
    expect(updated?.monitors[0]?.status).toBe('DOWN');
    const added = applyMessage(base, { type: 'monitor', payload: { ...monitor, id: 'm2' } });
    expect(added?.monitors).toHaveLength(2);
    expect(base.monitors).toHaveLength(1);
  });

  it('incidente é inserido, atualizado e removido quando resolvido', () => {
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

  it('evento entra no topo da linha do tempo e respeita o limite', () => {
    const many = snapshot({ timeline: Array.from({ length: TIMELINE_LIMIT }, (_, i) => event(`e${i}`)) });
    const next = applyMessage(many, { type: 'event', payload: event('novo') });
    expect(next?.timeline[0]?.id).toBe('novo');
    expect(next?.timeline).toHaveLength(TIMELINE_LIMIT);
  });

  it('evento repetido não duplica', () => {
    const base = snapshot({ timeline: [event('e1')] });
    expect(applyMessage(base, { type: 'event', payload: event('e1') })?.timeline).toHaveLength(1);
  });
});

describe('createWallStore', () => {
  it('começa vazio e conectando', () => {
    const store = createWallStore();
    expect(store.getState().snapshot).toBeNull();
    expect(store.getState().connection).toBe('connecting');
  });

  it('receive aplica mensagens e registra novos eventos como recentes', () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: snapshot() });
    store.getState().receive({ type: 'event', payload: event('e9') });
    expect(store.getState().snapshot?.timeline[0]?.id).toBe('e9');
    expect(store.getState().freshEventIds.has('e9')).toBe(true);
  });

  it('acknowledgeLocal marca o incidente e adiciona evento ACK', () => {
    const store = createWallStore();
    store.getState().receive({ type: 'snapshot', payload: snapshot({ incidents: [incident] }) });
    store.getState().acknowledgeLocal('i1', 'M. Chiodi', new Date(2026, 9, 18, 17, 4));
    const state = store.getState().snapshot;
    expect(state?.incidents[0]?.acknowledgedBy).toBe('M. Chiodi');
    expect(state?.timeline[0]?.kind).toBe('ACK');
    expect(state?.timeline[0]?.title).toContain('M. Chiodi');
  });

  it('setConnection atualiza o estado da conexão', () => {
    const store = createWallStore();
    store.getState().setConnection('mock');
    expect(store.getState().connection).toBe('mock');
  });
});
