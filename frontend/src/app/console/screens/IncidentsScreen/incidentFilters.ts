import type { IncidentRecord } from '@/shared/api/consoleTypes';

export const INCIDENT_FILTERS = ['all', 'open', 'acknowledged', 'resolved'] as const;
export type IncidentFilter = (typeof INCIDENT_FILTERS)[number];

/** Open = nobody acknowledged it yet; acknowledged = open and someone is on it; resolved = closed. */
export function matchesFilter(incident: IncidentRecord, filter: IncidentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'resolved') return incident.status === 'RESOLVED';
  if (incident.status !== 'OPEN') return false;
  return filter === 'acknowledged' ? Boolean(incident.acknowledgedBy) : !incident.acknowledgedBy;
}

/** Open incidents first, newest first inside each state. */
export function sortIncidents(incidents: readonly IncidentRecord[]): IncidentRecord[] {
  return [...incidents].sort(
    (a, b) => Number(a.status === 'RESOLVED') - Number(b.status === 'RESOLVED') || Date.parse(b.openedAt) - Date.parse(a.openedAt),
  );
}

export function countByFilter(incidents: readonly IncidentRecord[]): Record<IncidentFilter, number> {
  return Object.fromEntries(INCIDENT_FILTERS.map((f) => [f, incidents.filter((i) => matchesFilter(i, f)).length])) as Record<
    IncidentFilter,
    number
  >;
}
