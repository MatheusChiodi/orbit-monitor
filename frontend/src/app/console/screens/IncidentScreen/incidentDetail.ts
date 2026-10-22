import type { TFunction } from 'i18next';
import type { IncidentDetail } from '@/domains/alerting/IncidentPage';
import type { IncidentEventRecord, IncidentRecord } from '@/shared/api/consoleTypes';
import type { Group, MonitorView, Severity, TimelineKind } from '@/shared/api/types';

function severityOf(record: IncidentRecord): Severity {
  return record.severity === 'DOWN' ? 'DOWN' : 'WARN';
}

function kindOf(event: IncidentEventRecord, severity: Severity): TimelineKind {
  switch (event.type) {
    case 'RESOLVED':
      return 'OK';
    case 'ACKNOWLEDGED':
      return 'ACK';
    case 'TICKET_LINKED':
    case 'COMMENTED':
      return 'INFO';
    default:
      return severity;
  }
}

/** Maps the backend incident record to what the incident page renders (names resolved, comments apart). */
export function toIncidentDetail(
  record: IncidentRecord,
  monitors: readonly MonitorView[],
  groups: readonly Group[],
  t: TFunction,
): IncidentDetail {
  const monitor = monitors.find((m) => m.id === record.monitorId);
  const group = groups.find((g) => g.id === monitor?.groupId);
  const severity = severityOf(record);
  const comments: IncidentDetail['comments'] = [];
  const events: IncidentDetail['events'] = [];
  record.events.forEach((event, index) => {
    const id = `${record.id}:${index}`;
    if (event.type === 'COMMENTED') {
      comments.push({ id, at: event.at, author: event.actor, text: event.detail ?? '' });
      return;
    }
    events.push({
      id,
      at: event.at,
      kind: kindOf(event, severity),
      title: t(`screens.incidents.events.${event.type}`, { actor: event.actor }),
      detail: event.detail ?? '',
    });
  });
  return {
    id: record.id,
    monitorId: record.monitorId,
    severity,
    openedAt: record.openedAt,
    acknowledgedBy: record.acknowledgedBy,
    acknowledgedAt: record.acknowledgedAt,
    impact: record.impact ?? [],
    escalatesAt: record.escalatesAt ?? null,
    monitorName: monitor?.name ?? t('screens.incidents.unknownMonitor'),
    groupName: group?.name ?? '',
    resolvedAt: record.resolvedAt,
    ticket: record.ticket,
    events,
    comments,
  };
}
