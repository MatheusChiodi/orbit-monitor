import { useEffect, useState } from 'react';
import { ApiError, createApiClient, type ApiClientOptions } from '@/shared/api/client';

/**
 * BE-33 "who is on call now" for the wall clock block. Assumed contract:
 * `GET /api/oncall/now` → `[{ scheduleId, name, person, shiftEndsAt }]` (BE-33; `scheduleName` also accepted).
 */
export interface OnCallNow {
  scheduleId: string;
  scheduleName: string;
  person: string;
  shiftEndsAt: string | null;
}

export type LoadOnCall = () => Promise<OnCallNow[]>;

/** Shifts change rarely; a refresh every 5 minutes is enough and keeps the wall quiet. */
export const ONCALL_REFRESH_MS = 5 * 60_000;

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
  const { request } = createApiClient(options);
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

/** null = not known (loading, offline); [] = nobody on call. */
export function useOnCallNow(load: LoadOnCall | undefined, enabled: boolean): OnCallNow[] | null {
  const [entries, setEntries] = useState<OnCallNow[] | null>(null);
  useEffect(() => {
    if (!enabled || !load) return;
    let current = true;
    const refresh = () =>
      load()
        .then((next) => current && setEntries(next))
        .catch(() => {});
    void refresh();
    const timer = setInterval(() => void refresh(), ONCALL_REFRESH_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [load, enabled]);
  return enabled ? entries : null;
}
