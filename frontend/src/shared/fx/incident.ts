import type { Incident } from '@/shared/api/types';

/** docs/03-design.md §4.2: "Incident state wins" while a DOWN incident has no owner. */
export function hasUnacknowledgedDown(incidents: readonly Incident[]): boolean {
  return incidents.some((incident) => incident.severity === 'DOWN' && !incident.acknowledgedBy);
}
