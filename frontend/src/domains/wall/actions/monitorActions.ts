import type { CardAction } from '@/shared/customization/definitions/cards';
import type { WallSnapshot } from '@/shared/api/types';

export interface MonitorActionHosts {
  onAcknowledge: (incidentId: string) => void;
  navigate: (url: string) => void;
}

/**
 * FE-55 card actions on the wall. `acknowledge` acknowledges the monitor's open, unacknowledged
 * incident (view-only LAN clients may acknowledge). The wall carries no check target or detail page,
 * so `open-detail` and `open-target` open the console: the incident page when there is an open
 * incident, otherwise the monitor's row in the monitor list.
 */
export function createMonitorActionHandler(snapshot: WallSnapshot, hosts: MonitorActionHosts) {
  return (action: CardAction, monitorId: string): void => {
    const incident = snapshot.incidents.find((i) => i.monitorId === monitorId);
    if (action === 'acknowledge') {
      if (incident && !incident.acknowledgedBy) hosts.onAcknowledge(incident.id);
      return;
    }
    if (action === 'open-detail' || action === 'open-target') {
      hosts.navigate(
        incident ? `/index.html#/incidents/${encodeURIComponent(incident.id)}` : `/index.html#monitor-${encodeURIComponent(monitorId)}`,
      );
    }
  };
}
