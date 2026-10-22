import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../mock';
import { createWallStore } from '../store';
import { acknowledge } from './wallFeed';

describe('CORE-06 wall acknowledge against the real API', () => {
  it('the REST answer (io.orbit.alerting.Incident, no impact/escalation) only updates who acknowledged and when', async () => {
    const snapshot = mockSnapshot('incident');
    const store = createWallStore(snapshot);
    store.getState().setConnection('open');
    const before = snapshot.incidents.find((i) => i.id === 'inc-reconciliation')!;
    const send = vi.fn().mockResolvedValue({
      id: 'inc-reconciliation',
      monitorId: 'reconciliation',
      status: 'OPEN',
      severity: 'DOWN',
      openedAt: before.openedAt,
      resolvedAt: null,
      acknowledgedBy: 'Ana',
      acknowledgedAt: '2026-10-22T10:00:00Z',
      ticket: null,
      flapping: false,
      parentId: null,
      events: [],
    });
    await acknowledge(store, 'inc-reconciliation', 'Ana', send);
    expect(send).toHaveBeenCalledWith('inc-reconciliation', 'Ana');
    const after = store.getState().snapshot!.incidents.find((i) => i.id === 'inc-reconciliation')!;
    expect(after).toEqual({ ...before, acknowledgedBy: 'Ana', acknowledgedAt: '2026-10-22T10:00:00Z' });
  });
});

describe('CORE-06 access policy on the wall', () => {
  it('a refused acknowledgement (403: LAN acknowledge disabled) is not faked locally', async () => {
    const { ApiError } = await import('@/shared/api/client');
    const store = createWallStore(mockSnapshot('incident'));
    store.getState().setConnection('open');
    await acknowledge(store, 'inc-reconciliation', 'Ana', vi.fn().mockRejectedValue(new ApiError(403, 'Access denied')));
    expect(store.getState().snapshot!.incidents.find((i) => i.id === 'inc-reconciliation')!.acknowledgedBy).toBeNull();
  });

  it('a network failure still marks it locally so the wall never gets stuck', async () => {
    const store = createWallStore(mockSnapshot('incident'));
    store.getState().setConnection('open');
    await acknowledge(store, 'inc-reconciliation', 'Ana', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(store.getState().snapshot!.incidents.find((i) => i.id === 'inc-reconciliation')!.acknowledgedBy).toBe('Ana');
  });
});
