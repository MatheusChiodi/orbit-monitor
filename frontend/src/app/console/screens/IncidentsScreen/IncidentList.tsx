import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { formatDuration, formatRelative, formatTime } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, Button, EmptyState, IconAlert, SegmentedControl, StatusBadge } from '@/shared/ui';
import { toStatus } from '../../NotificationsBell/incidentFeed';
import { routeHref } from '../../routes';
import { countByFilter, INCIDENT_FILTERS, matchesFilter, sortIncidents, type IncidentFilter } from './incidentFilters';

export interface IncidentListProps {
  incidents: readonly IncidentRecord[];
  names: ReadonlyMap<string, string>;
  now: Date;
  /** Editors resolve; every client may acknowledge (BE-26). */
  editable: boolean;
  filter: IncidentFilter;
  onFilterChange: (filter: IncidentFilter) => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  /** Editors only: brings a resolved incident back. */
  onReopen?: (id: string) => void;
  /** Id of the incident whose action is in flight. */
  busyId?: string | null;
}

/** State line of a row: who is on it, or when it was resolved and how long it lasted. */
function stateText(incident: IncidentRecord, t: TFunction): string {
  if (incident.status === 'RESOLVED' && incident.resolvedAt) {
    return t('ops.incidents.resolvedLasted', {
      time: formatTime(incident.resolvedAt),
      duration: formatDuration(Date.parse(incident.resolvedAt) - Date.parse(incident.openedAt)),
    });
  }
  if (!incident.acknowledgedBy) return t('screens.incidents.notAcknowledged');
  return incident.acknowledgedAt
    ? t('screens.incidents.acknowledgedAt', { time: formatTime(incident.acknowledgedAt) })
    : t('screens.incidents.acknowledged');
}

/** FE-39: incidents filtered by state, with acknowledge / resolve on each open row. */
export function IncidentList({ incidents, names, now, editable, filter, onFilterChange, onAcknowledge, onResolve, onReopen, busyId = null }: IncidentListProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const counts = countByFilter(incidents);
  const visible = sortIncidents(incidents).filter((i) => matchesFilter(i, filter));

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label={t('ops.incidents.filter')}
        value={filter}
        onChange={onFilterChange}
        options={INCIDENT_FILTERS.map((value) => ({
          value,
          label: (
            <span className="inline-flex items-center gap-1.5">
              {t(`ops.incidents.filters.${value}`)}
              <span className="font-mono text-xs text-dim">{counts[value]}</span>
            </span>
          ),
        }))}
      />
      {visible.length === 0 ? (
        <EmptyState icon={IconAlert} title={t(`ops.incidents.emptyTitle.${filter}`)}>
          {t(`ops.incidents.emptyBody.${filter}`)}
        </EmptyState>
      ) : (
        <ul aria-label={t('ops.incidents.list')} className="m-0 flex list-none flex-col gap-2 p-0">
          {visible.map((incident, index) => {
            const open = incident.status === 'OPEN';
            const status = open ? toStatus(incident.severity) : 'OK';
            const name = names.get(incident.monitorId) ?? t('screens.incidents.unknownMonitor');
            const busy = busyId === incident.id;
            return (
              <AnimatedItem
                key={incident.id}
                index={index}
                count={visible.length}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-s1 px-4 py-3 hover:bg-s2"
              >
                <StatusBadge status={status} className="w-20" />
                <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                  <a href={routeHref({ name: 'incident', id: incident.id })} className="truncate font-semibold text-text hover:underline">
                    <SafeValue value={name} />
                  </a>
                  <span className="text-sm text-muted">{stateText(incident, t)}</span>
                </div>
                <time dateTime={incident.openedAt} className="font-mono text-xs text-dim">
                  {t('ops.incidents.openedAgo', { time: formatRelative(incident.openedAt, now, locale) })}
                </time>
                {open && (
                  <span className="flex gap-2">
                    {!incident.acknowledgedBy && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy}
                        aria-label={`${t('ops.incidents.acknowledge')} ${safeText(name)}`}
                        onClick={() => onAcknowledge(incident.id)}
                      >
                        {t('ops.incidents.acknowledge')}
                      </Button>
                    )}
                    {editable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy}
                        aria-label={`${t('ops.incidents.resolve')} ${safeText(name)}`}
                        onClick={() => onResolve(incident.id)}
                      >
                        {t('ops.incidents.resolve')}
                      </Button>
                    )}
                  </span>
                )}
                {!open && editable && onReopen && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy}
                    aria-label={`${t('ops.incidents.reopen')} ${safeText(name)}`}
                    onClick={() => onReopen(incident.id)}
                  >
                    {t('ops.incidents.reopen')}
                  </Button>
                )}
              </AnimatedItem>
            );
          })}
        </ul>
      )}
    </div>
  );
}
