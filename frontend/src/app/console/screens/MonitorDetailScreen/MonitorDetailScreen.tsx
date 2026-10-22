import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import { formatClock, formatPercent, formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, Panel, StatusPill } from '@/shared/ui';
import { useConsole, useMonitors } from '../../ConsoleContext';
import { routeHref } from '../../routes';
import { MonitorHistoryPanel } from '../MonitorHistoryPanel';
import { ScreenStatus } from '../ScreenStatus';
import { targetUrlOf } from './monitorTarget';

/** FE-55 `open-detail`: `#/monitors/:id` — state, last check, conditions and incidents of one monitor. */
export function MonitorDetailScreen({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const { source, demo, operator } = useConsole();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['monitor', demo, id], queryFn: () => source.getMonitor(id) });
  const monitors = useMonitors();
  const incidents = useQuery({ queryKey: ['incidents', demo, 'monitor', id], queryFn: () => source.listIncidents({ monitorId: id }) });
  const view = detail.data?.status ?? monitors.data?.find((m) => m.id === id);
  const open = (incidents.data ?? []).find((i) => i.status === 'OPEN' && !i.acknowledgedBy);
  const url = targetUrlOf(detail.data?.definition);
  const now = new Date();

  const ack = useMutation({
    mutationFn: (incidentId: string) => source.acknowledgeIncidentRecord(incidentId, operator),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents', demo] }),
  });

  return (
    <>
      <a href={routeHref({ name: 'monitors' })} className="text-[0.85rem] text-info hover:underline">
        ← {t('screens.monitor.back')}
      </a>
      {!view && <ScreenStatus pending={detail.isPending || monitors.isPending} error={detail.error} />}
      {view && (
        <>
          <header className="flex flex-wrap items-center gap-[0.8rem]">
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">
              <SafeValue value={view.name} />
            </h1>
            <StatusPill status={view.status} />
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[0.85rem] text-info hover:underline">
                {t('screens.monitor.openTarget')}
              </a>
            )}
            {open && (
              <Button variant="primary" onClick={() => ack.mutate(open.id)} disabled={ack.isPending}>
                {t('screens.monitor.acknowledge')}
              </Button>
            )}
          </header>
          {ack.isSuccess && <p role="status" className="m-0 text-ok-text">{t('screens.monitor.acknowledged')}</p>}
          {ack.error && <p role="alert" className="m-0 text-down-text">{ack.error.message}</p>}
          <Panel>
            <dl className="m-0 grid grid-cols-2 gap-[0.8rem] sm:grid-cols-4">
              <div>
                <dt className="section-label">{t('screens.monitor.type')}</dt>
                <dd className="m-0 font-mono">{view.type}</dd>
              </div>
              <div>
                <dt className="section-label">{t('screens.monitor.reading')}</dt>
                <dd className="m-0 font-mono">{formatReading(view.value, view.unit, locale)}</dd>
              </div>
              <div>
                <dt className="section-label">{t('screens.monitor.latency')}</dt>
                <dd className="m-0 font-mono">{detail.data?.latency?.p95 != null ? `${detail.data.latency.p95} ms` : '—'}</dd>
              </div>
              <div>
                <dt className="section-label">{t('screens.monitor.uptime')}</dt>
                <dd className="m-0 font-mono">{detail.data?.uptime ? formatPercent(detail.data.uptime.ratio * 100, 2, locale) : '—'}</dd>
              </div>
            </dl>
          </Panel>
          {detail.data?.lastResult && (
            <Panel title={t('screens.monitor.conditions')}>
              <p className="m-0 text-[0.8rem] text-muted">
                {t('screens.monitor.lastCheck')}: {formatClock(detail.data.lastResult.checkedAt)}
              </p>
              <ul className="m-0 flex list-none flex-col gap-[0.3rem] p-0 text-[0.85rem]">
                {detail.data.lastResult.conditions.map((c) => (
                  <li key={c.expression} className="flex gap-[0.6rem]">
                    <span className={c.passed ? 'text-ok-text' : 'text-down-text'}>{t(c.passed ? 'screens.monitor.passed' : 'screens.monitor.failed')}</span>
                    <SafeValue value={c.expression} className="font-mono" />
                    {c.actual !== null && c.actual !== undefined && <SafeValue value={String(c.actual)} className="font-mono text-muted" />}
                  </li>
                ))}
              </ul>
              {detail.data.lastResult.error && (
                <p className="m-0 text-[0.85rem] text-down-text">
                  {t('screens.monitor.error')}: <SafeValue value={detail.data.lastResult.error} />
                </p>
              )}
            </Panel>
          )}
          <MonitorHistoryPanel monitorId={id} name={view.name} status={view.status} />
          <Panel title={t('screens.monitor.incidents')}>
            {(incidents.data ?? []).length === 0 ? (
              <p className="m-0 text-[0.85rem] text-muted">{t('screens.monitor.noIncidents')}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-[0.3rem] p-0 text-[0.85rem]">
                {(incidents.data ?? []).map((i) => (
                  <li key={i.id}>
                    <a href={routeHref({ name: 'incident', id: i.id })} className="text-info hover:underline">
                      {t(i.status === 'OPEN' ? 'screens.incidents.open' : 'screens.incidents.resolved')} · {formatRelative(i.openedAt, now, locale)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
