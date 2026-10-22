import { useEffect, useState } from 'react';
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

/**
 * FE-40: name of the next escalation step for the countdown. Uses `nextStep.name` when the wall
 * incident carries it, otherwise asks the escalation API once per incident and deadline.
 */
export function useNextEscalationStep(incident: Incident | null, load?: LoadEscalation): string | null {
  const [loaded, setLoaded] = useState<{ key: string; name: string | null } | null>(null);
  const active = incident && !incident.acknowledgedBy && incident.escalatesAt ? incident : null;
  const inline = active?.nextStep?.name ?? null;
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

