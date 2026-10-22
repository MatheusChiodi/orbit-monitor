import { ApiError, createApiCore, type ApiClientOptions } from '@/shared/api/client';
import type { EscalationStatus } from './escalationApi';

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
  const { request } = createApiCore(options);
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
