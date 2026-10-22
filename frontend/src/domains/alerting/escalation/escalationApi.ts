import { useEffect, useState } from 'react';
import { ApiError, createApiClient, type ApiClientOptions } from '@/shared/api/client';
import type { Incident } from '@/shared/api/types';

/**
 * BE-27 escalation state of one incident: `GET /api/incidents/{id}/escalation` →
 * `{ incidentId, policyName, stepIndex, stepName, dueAt, … }`, 204 when acknowledged, resolved or
 * without a policy. The nested `{ nextStep: { index, name, at } }` shape is also accepted.
 */
export interface EscalationStep {
  index: number;
  name: string;
  at: string;
}

export interface EscalationStatus {
  policyName: string | null;
  nextStep: EscalationStep | null;
}

export type LoadEscalation = (incidentId: string) => Promise<EscalationStatus | null>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function toStatus(raw: unknown): EscalationStatus | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.stepName === 'string' && typeof raw.dueAt === 'string') {
    return {
      policyName: typeof raw.policyName === 'string' ? raw.policyName : null,
      nextStep: { index: typeof raw.stepIndex === 'number' ? raw.stepIndex : 0, name: raw.stepName, at: raw.dueAt },
    };
  }
  const step = raw.nextStep;
  const nextStep =
    isRecord(step) && typeof step.name === 'string' && typeof step.at === 'string'
      ? { index: typeof step.index === 'number' ? step.index : 0, name: step.name, at: step.at }
      : null;
  return { policyName: typeof raw.policyName === 'string' ? raw.policyName : null, nextStep };
}

export function createEscalationApi(options: Pick<ApiClientOptions, 'fetch' | 'baseUrl'> = {}) {
  const { request } = createApiClient(options);
  return {
    async forIncident(incidentId: string): Promise<EscalationStatus | null> {
      try {
        return toStatus(await request<unknown>(`/api/incidents/${encodeURIComponent(incidentId)}/escalation`));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  };
}

/**
 * FE-40: name of the next escalation step for the countdown. Uses `nextStepName` when the wall
 * incident carries it, otherwise asks the escalation API once per incident and deadline.
 */
export function useNextEscalationStep(incident: Incident | null, load?: LoadEscalation): string | null {
  const [loaded, setLoaded] = useState<{ key: string; name: string | null } | null>(null);
  const active = incident && !incident.acknowledgedBy && incident.escalatesAt ? incident : null;
  const inline = active?.nextStepName ?? null;
  const key = active ? `${active.id}@${active.escalatesAt}` : null;
  const incidentId = active?.id ?? null;

  useEffect(() => {
    if (!key || !incidentId || inline || !load) return;
    let current = true;
    load(incidentId)
      .then((status) => current && setLoaded({ key, name: status?.nextStep?.name ?? null }))
      .catch(() => current && setLoaded({ key, name: null }));
    return () => {
      current = false;
    };
  }, [key, incidentId, inline, load]);

  if (!active) return null;
  if (inline) return inline;
  return loaded?.key === key ? loaded.name : null;
}
