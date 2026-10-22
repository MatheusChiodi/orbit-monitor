import { useEffect, useState } from 'react';

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

