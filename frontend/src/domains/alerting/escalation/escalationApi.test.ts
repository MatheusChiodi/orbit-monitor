import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/shared/api/types';
import { createEscalationApi, useNextEscalationStep } from './escalationApi';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const incident: Incident = {
  id: 'inc-1',
  monitorId: 'm1',
  severity: 'DOWN',
  openedAt: '2026-10-22T10:00:00Z',
  acknowledgedBy: null,
  acknowledgedAt: null,
  impact: [],
  escalatesAt: '2026-10-22T10:15:00Z',
};

describe('FE-40 escalation API (BE-27)', () => {
  it('reads the next step of an incident (GET /api/incidents/{id}/escalation)', async () => {
    const fetch = vi.fn(async () => json(200, { incidentId: 'inc-1', policyName: 'Payments', nextStep: { index: 1, name: 'Team lead', at: '2026-10-22T10:15:00Z' } }));
    const status = await createEscalationApi({ fetch }).forIncident('inc-1');
    expect(fetch).toHaveBeenCalledWith('/api/incidents/inc-1/escalation', expect.anything());
    expect(status).toEqual({ policyName: 'Payments', nextStep: { index: 1, name: 'Team lead', at: '2026-10-22T10:15:00Z' } });
  });

  it('reads the BE-27 flat shape (stepName, dueAt); 204 means no further step', async () => {
    const fetch = vi.fn(async () =>
      json(200, { incidentId: 'inc-1', monitorId: 'm1', policyId: 'p', policyName: 'Payments', stepIndex: 2, stepName: 'On-call SRE', dueAt: '2026-10-22T10:30:00Z', channelIds: [], onCall: 'Ana' }),
    );
    expect(await createEscalationApi({ fetch }).forIncident('inc-1')).toEqual({
      policyName: 'Payments',
      nextStep: { index: 2, name: 'On-call SRE', at: '2026-10-22T10:30:00Z' },
    });
    expect(await createEscalationApi({ fetch: vi.fn(async () => new Response(null, { status: 204 })) }).forIncident('inc-1')).toBeNull();
  });

  it('no policy (404) or a malformed answer means no next step', async () => {
    expect(await createEscalationApi({ fetch: vi.fn(async () => json(404, {})) }).forIncident('x')).toBeNull();
    const odd = await createEscalationApi({ fetch: vi.fn(async () => json(200, { nextStep: { name: 42 } })) }).forIncident('x');
    expect(odd).toEqual({ policyName: null, nextStep: null });
  });

  it('useNextEscalationStep prefers the name sent with the wall incident', () => {
    const load = vi.fn();
    const { result } = renderHook(() => useNextEscalationStep({ ...incident, nextStepName: 'On-call SRE' }, load));
    expect(result.current).toBe('On-call SRE');
    expect(load).not.toHaveBeenCalled();
  });

  it('useNextEscalationStep loads the name once per incident and deadline; hidden when acknowledged', async () => {
    const load = vi.fn(async () => ({ policyName: 'Payments', nextStep: { index: 1, name: 'Team lead', at: incident.escalatesAt! } }));
    const { result, rerender } = renderHook(({ value }) => useNextEscalationStep(value, load), { initialProps: { value: incident as Incident | null } });
    await waitFor(() => expect(result.current).toBe('Team lead'));
    rerender({ value: { ...incident } });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => rerender({ value: { ...incident, acknowledgedBy: 'Ana' } }));
    expect(result.current).toBeNull();
  });

  it('a failing load leaves the countdown without a step name', async () => {
    const load = vi.fn(async () => {
      throw new Error('offline');
    });
    const { result } = renderHook(() => useNextEscalationStep(incident, load));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
