import { ApiError, createApiCore, type ApiClientOptions } from '@/shared/api/client';
import type { OnCallNow } from './oncallApi';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function toEntries(payload: unknown): OnCallNow[] {
  const list = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
  return list.flatMap((raw) =>
    isRecord(raw) && typeof raw.scheduleId === 'string' && typeof raw.person === 'string'
      ? [
          {
            scheduleId: raw.scheduleId,
            scheduleName: typeof raw.scheduleName === 'string' ? raw.scheduleName : typeof raw.name === 'string' ? raw.name : raw.scheduleId,
            person: raw.person,
            shiftEndsAt: typeof raw.shiftEndsAt === 'string' ? raw.shiftEndsAt : null,
          },
        ]
      : [],
  );
}

export function createOnCallApi(options: Pick<ApiClientOptions, 'fetch' | 'baseUrl'> = {}) {
  const { request } = createApiCore(options);
  return {
    async now(): Promise<OnCallNow[]> {
      try {
        return toEntries(await request<unknown>('/api/oncall/now'));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return [];
        throw error;
      }
    },
  };
}
