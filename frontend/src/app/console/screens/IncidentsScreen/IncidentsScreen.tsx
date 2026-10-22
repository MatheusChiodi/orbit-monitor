import { useTranslation } from 'react-i18next';
import { formatRelative, formatTime } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { AnimatedItem, StatusDot, TEXT_CLASS } from '@/shared/ui';
import { useIncidents, useMonitors } from '../../ConsoleContext';
import { toStatus } from '../../NotificationsBell/incidentFeed';
import { routeHref } from '../../routes';
import { ScreenStatus, ScreenTitle } from '../ScreenStatus';

function IncidentList({ title, incidents, names }: { title: string; incidents: IncidentRecord[]; names: Map<string, string> }) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const now = new Date();
  if (incidents.length === 0) return null;
  return (
    <section className="flex flex-col gap-[0.4rem]">
      <h2 className="section-label m-0">{title}</h2>
      <ul aria-label={title} className="m-0 flex list-none flex-col gap-[0.4rem] p-0">
        {incidents.map((incident, index) => {
          const status = incident.status === 'RESOLVED' ? 'OK' : toStatus(incident.severity);
          return (
            <AnimatedItem key={incident.id} index={index} count={incidents.length} className="flex items-center gap-[0.7rem] rounded-[0.6rem] border border-line bg-s1 px-[0.8rem] py-[0.55rem]">
              <StatusDot status={status} />
              <span className={`w-[3.4rem] text-[0.75rem] font-semibold ${TEXT_CLASS[status]}`}>{t(`status.label.${status}`)}</span>
              <a href={routeHref({ name: 'incident', id: incident.id })} className="min-w-0 flex-1 font-semibold text-text hover:underline">
                <SafeValue value={names.get(incident.monitorId) ?? t('screens.incidents.unknownMonitor')} />
              </a>
              <span className="text-[0.78rem] text-muted">
                {!incident.acknowledgedBy
                  ? t('screens.incidents.notAcknowledged')
                  : incident.acknowledgedAt
                    ? t('screens.incidents.acknowledgedAt', { time: formatTime(incident.acknowledgedAt) })
                    : t('screens.incidents.acknowledged')}
              </span>
              <time dateTime={incident.openedAt} className="font-mono text-[0.75rem] text-dim">
                {formatRelative(incident.openedAt, now, locale)}
              </time>
            </AnimatedItem>
          );
        })}
      </ul>
    </section>
  );
}

/** FE-39: incidents in memory, open first (newest first inside each list). */
export function IncidentsScreen() {
  const { t } = useTranslation();
  const incidents = useIncidents();
  const monitors = useMonitors();
  const names = new Map((monitors.data ?? []).map((m) => [m.id, m.name]));
  const sorted = [...(incidents.data ?? [])].sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
  const open = sorted.filter((i) => i.status === 'OPEN');
  const resolved = sorted.filter((i) => i.status === 'RESOLVED');

  return (
    <>
      <ScreenTitle>{t('screens.incidents.title')}</ScreenTitle>
      <ScreenStatus pending={incidents.isPending} error={incidents.error} />
      {incidents.data && sorted.length === 0 && <p className="m-0 text-muted">{t('screens.incidents.empty')}</p>}
      <IncidentList title={t('screens.incidents.open')} incidents={open} names={names} />
      <IncidentList title={t('screens.incidents.resolved')} incidents={resolved} names={names} />
    </>
  );
}
