import type { TFunction } from 'i18next';
import type { AppNotification } from '@/domains/alerting/NotificationCenter';
import type { BackendState, IncidentEventType, IncidentRecord } from '@/shared/api/consoleTypes';
import type { Status } from '@/shared/api/types';
import { routeHref } from '../routes';

const NOTIFIED: Partial<Record<IncidentEventType, 'opened' | 'resolved' | 'reopened' | 'severity'>> = {
  OPENED: 'opened',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
  SEVERITY_CHANGED: 'severity',
};

export interface FeedNotification extends AppNotification {
  href: string;
}

export function toStatus(state: BackendState): Status {
  return state === 'UNKNOWN' ? 'WARN' : state;
}

/** FE-38: state changes of the incidents in memory become in-app notifications (newest first in the bell). */
export function incidentFeed(
  incidents: readonly IncidentRecord[],
  monitorNames: ReadonlyMap<string, string>,
  t: TFunction,
): FeedNotification[] {
  const feed: FeedNotification[] = [];
  for (const incident of incidents) {
    const monitor = monitorNames.get(incident.monitorId) ?? t('screens.incidents.unknownMonitor');
    incident.events.forEach((event, index) => {
      const kind = NOTIFIED[event.type];
      if (!kind) return;
      feed.push({
        id: `${incident.id}:${index}`,
        severity: kind === 'resolved' ? 'OK' : toStatus(incident.severity),
        title: t(`screens.incidents.notification.${kind}`, { monitor }),
        detail: '',
        at: event.at,
        read: false,
        href: routeHref({ name: 'incident', id: incident.id }),
      });
    });
  }
  return feed;
}
