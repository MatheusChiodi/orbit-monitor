import { presetRange, type HistoryRange } from '@/domains/telemetry/history/range';
import type { IncidentRecord } from '@/shared/api/consoleTypes';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX = 31 * DAY;

/**
 * FE-58: the same 24 h default as the monitor detail when the incident fits in it; an older incident gets
 * one hour before it opened until one hour after it resolved (or now), at most 31 days.
 */
export function incidentWindow(incident: Pick<IncidentRecord, 'openedAt' | 'resolvedAt'>, now: Date): HistoryRange {
  if (now.getTime() - Date.parse(incident.openedAt) <= DAY - HOUR) return presetRange('24h', now);
  const end = Math.min(now.getTime(), incident.resolvedAt ? Date.parse(incident.resolvedAt) + HOUR : now.getTime());
  const start = Math.max(Date.parse(incident.openedAt) - HOUR, end - MAX);
  return { preset: 'custom', from: new Date(start), to: new Date(end) };
}
