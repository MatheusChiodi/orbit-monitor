import type { Severity, WallSnapshot } from '@/shared/api/types';

export interface SimulatedIncident {
  monitorId: string;
  severity: Severity;
  now: Date;
}

/**
 * FE-17: "what if" — a copy of the snapshot where one monitor is failing with an open, unowned incident.
 * Nothing is sent anywhere; the result is flagged `simulated`.
 */
export function simulateIncident(snapshot: WallSnapshot, { monitorId, severity, now }: SimulatedIncident): WallSnapshot {
  const target = snapshot.monitors.find((m) => m.id === monitorId);
  if (!target) return snapshot;
  const at = now.toISOString();
  return {
    ...snapshot,
    simulated: true,
    monitors: snapshot.monitors.map((m) => (m.id === monitorId ? { ...m, status: severity, since: at } : m)),
    incidents: [
      {
        id: `sim-${monitorId}`,
        monitorId,
        severity,
        openedAt: at,
        acknowledgedBy: null,
        acknowledgedAt: null,
        impact: [],
        escalatesAt: null,
      },
      ...snapshot.incidents.filter((i) => i.monitorId !== monitorId),
    ],
  };
}
