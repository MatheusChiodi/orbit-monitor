import type { HistoryRange } from '@/domains/telemetry/history/range';
import type { IncidentRecord } from '@/shared/api/consoleTypes';

const HOUR = 3_600_000;
const MAX = 31 * 24 * HOUR;

/** FE-58: one hour before the incident opened until one hour after it resolved (or now), at most 31 days. */
export function incidentWindow(incident: Pick<IncidentRecord, 'openedAt' | 'resolvedAt'>, now: Date): HistoryRange {
  const end = Math.min(now.getTime(), incident.resolvedAt ? Date.parse(incident.resolvedAt) + HOUR : now.getTime());
  const start = Math.max(Date.parse(incident.openedAt) - HOUR, end - MAX);
  return { preset: 'custom', from: new Date(start), to: new Date(end) };
}
