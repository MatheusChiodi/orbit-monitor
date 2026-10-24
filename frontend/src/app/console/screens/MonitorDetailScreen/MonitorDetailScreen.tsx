import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import { formatClock, formatPercent, formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import {
  Button,
  Dialog,
  IconArrowLeft,
  IconEdit,
  IconExternal,
  IconPause,
  IconPlay,
  Menu,
  PageHeader,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { useConsole, useMonitors } from '../../ConsoleContext';
import { routeHref } from '../../routes';
import { MonitorHistoryPanel } from '../MonitorHistoryPanel';
import { ScreenStatus } from '../ScreenStatus';
import { duplicateBody, isPaused, pausedBody, savedMonitorId } from './monitorActions';
import { targetUrlOf } from './monitorTarget';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

function Stat({ label, children, empty }: { label: string; children?: ReactNode; empty?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="section-label">{label}</dt>
      {empty ? (
        <dd className="m-0 flex flex-col">
          <span className="text-base text-muted">{t('ops.detail.notEnough')}</span>
          <span className="text-xs text-dim">{t('ops.detail.notEnoughHint')}</span>
        </dd>
      ) : (
        <dd className="m-0 truncate font-mono text-lg">{children}</dd>
      )}
    </div>
  );
}

/** `#/monitors/:id`: state, actions (edit, pause, duplicate, delete), stats, last check, history and incidents. */
export function MonitorDetailScreen({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const { toast } = useToast();
  const { source, demo, editable, navigate } = useConsole();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['monitor', demo, id], queryFn: () => source.getMonitor(id) });
  const monitors = useMonitors();
  const incidents = useQuery({ queryKey: ['incidents', demo, 'monitor', id], queryFn: () => source.listIncidents({ monitorId: id }) });
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const view = detail.data?.status ?? monitors.data?.find((m) => m.id === id);
  const definition = detail.data?.definition;
  const paused = isPaused(definition);
  const open = (incidents.data ?? []).find((i) => i.status === 'OPEN' && !i.acknowledgedBy);
  const url = targetUrlOf(definition);
  const now = new Date();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['monitor', demo, id] });
    await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
  };
  const fail = (error: unknown) => toast({ title: reason(error), tone: 'DOWN' });

  const ack = useMutation({
    mutationFn: (incidentId: string) => source.acknowledgeIncidentRecord(incidentId),
    onSuccess: async () => {
      toast({ title: t('ops.detail.acknowledgedToast'), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    },
    onError: fail,
  });
  const pause = useMutation({
    mutationFn: (next: boolean) => source.createMonitor(pausedBody(definition ?? {}, next)),
    onSuccess: async (_, next) => {
      toast({ title: t(next ? 'ops.detail.pausedToast' : 'ops.detail.resumedToast'), tone: 'OK' });
      await refresh();
    },
    onError: fail,
  });
  const duplicate = useMutation({
    mutationFn: () => source.createMonitor(duplicateBody(definition ?? {}, t('ops.detail.copyName', { name: view?.name ?? '' }))),
    onSuccess: async (saved) => {
      toast({ title: t('ops.detail.duplicatedToast'), description: t('ops.detail.duplicatedHint'), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
      const copy = savedMonitorId(saved);
      navigate(copy ? { name: 'edit-monitor', id: copy } : { name: 'monitors' });
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => source.deleteMonitor(id),
    onSuccess: async () => {
      setConfirming(false);
      toast({ title: t('ops.detail.deletedToast'), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
      navigate({ name: 'monitors' });
    },
    onError: fail,
  });

  const back = (
    <a href={routeHref({ name: 'monitors' })} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
      <IconArrowLeft />
      {t('ops.detail.back')}
    </a>
  );

  if (!view) {
    return (
      <>
        {back}
        <ScreenStatus pending={detail.isPending || monitors.isPending} error={detail.error} />
      </>
    );
  }

  const name = safeText(view.name);
  const actions = (
    <>
      {open && (
        <Button variant="primary" onClick={() => ack.mutate(open.id)} loading={ack.isPending}>
          {t('screens.monitor.acknowledge')}
        </Button>
      )}
      {editable && definition && (
        <>
          <Button variant="secondary" title={t('ops.detail.editHint')} onClick={() => navigate({ name: 'edit-monitor', id })}>
            <IconEdit />
            {t('ops.detail.edit')}
          </Button>
          <Button variant="secondary" title={paused ? undefined : t('ops.detail.pauseHint')} loading={pause.isPending} onClick={() => pause.mutate(!paused)}>
            {paused ? <IconPlay /> : <IconPause />}
            {t(paused ? 'ops.detail.resume' : 'ops.detail.pause')}
          </Button>
          <Menu
            label={t('ops.detail.actions')}
            items={[
              { id: 'duplicate', label: t('ops.detail.duplicate'), onSelect: () => duplicate.mutate(), disabled: duplicate.isPending },
              { id: 'delete', label: t('ops.detail.delete'), danger: true, onSelect: () => setConfirming(true) },
            ]}
          />
        </>
      )}
    </>
  );

  const latency = detail.data?.latency?.p95;
  const uptime = detail.data?.uptime;

  return (
    <>
      <PageHeader
        eyebrow={back}
        title={<SafeValue value={view.name} />}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {paused ? <StatusBadge status="neutral">{t('ops.detail.paused')}</StatusBadge> : <StatusBadge status={view.status} />}
            <span>{t(`ops.monitors.kinds.${view.type}`, { defaultValue: view.type })}</span>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                {t('ops.detail.openTarget')}
                <IconExternal />
              </a>
            )}
          </span>
        }
        actions={actions}
      />
      {paused && (
        <p role="status" className="m-0 rounded-md border border-line bg-s2 px-4 py-2 text-base text-muted">
          {t('ops.detail.pausedHint')}
        </p>
      )}
      <section data-surface="panel" aria-label={t('ops.detail.reading')} className="rounded-md border border-line bg-s1 p-4">
        <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t('ops.detail.kind')}>
            <span className="font-sans text-base">{t(`ops.monitors.kinds.${view.type}`, { defaultValue: view.type })}</span>
          </Stat>
          <Stat label={t('ops.detail.reading')}>{formatReading(view.value, view.unit, locale)}</Stat>
          <Stat label={t('ops.detail.latency')} empty={latency == null}>
            {`${latency} ms`}
          </Stat>
          <Stat label={t('ops.detail.uptime')} empty={!uptime}>
            {uptime ? formatPercent(uptime.ratio * 100, 2, locale) : null}
          </Stat>
        </dl>
      </section>
      {detail.data?.lastResult && (
        <section data-surface="panel" aria-labelledby="monitor-checks" className="flex flex-col gap-2 rounded-md border border-line bg-s1 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="monitor-checks" className="section-label m-0">
              {t('ops.detail.checks')}
            </h2>
            <span className="font-mono text-xs text-dim">{t('ops.detail.lastCheck', { time: formatClock(detail.data.lastResult.checkedAt) })}</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-base">
            {detail.data.lastResult.conditions.map((c) => (
              <li key={c.expression} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusBadge status={c.passed ? 'OK' : c.level === 'WARN' ? 'WARN' : 'DOWN'} size="sm">
                  {t(c.passed ? 'ops.detail.passed' : 'ops.detail.failed')}
                </StatusBadge>
                <SafeValue value={c.expression} className="font-mono text-sm" />
                {c.actual !== null && c.actual !== undefined && <SafeValue value={String(c.actual)} className="font-mono text-sm text-muted" />}
              </li>
            ))}
          </ul>
          {detail.data.lastResult.error && (
            <p className="m-0 text-sm text-down-text">
              {t('ops.detail.error')}: <SafeValue value={detail.data.lastResult.error} />
            </p>
          )}
        </section>
      )}
      <MonitorHistoryPanel monitorId={id} name={view.name} status={view.status} rule={view.rule} unit={view.unit} />
      <section data-surface="panel" aria-labelledby="monitor-incidents" className="flex flex-col gap-2 rounded-md border border-line bg-s1 p-4">
        <h2 id="monitor-incidents" className="section-label m-0">
          {t('ops.detail.incidents')}
        </h2>
        {(incidents.data ?? []).length === 0 ? (
          <p className="m-0 text-base text-muted">{t('ops.detail.noIncidents')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0 text-base">
            {(incidents.data ?? []).map((i) => (
              <li key={i.id}>
                <a href={routeHref({ name: 'incident', id: i.id })} className="flex items-center gap-3 py-2 hover:text-accent">
                  <StatusBadge status={i.status === 'OPEN' ? (i.severity === 'WARN' ? 'WARN' : 'DOWN') : 'OK'} size="sm">
                    {t(i.status === 'OPEN' ? 'ops.detail.incidentOpen' : 'ops.detail.incidentResolved')}
                  </StatusBadge>
                  <span className="text-muted">{formatRelative(i.openedAt, now, locale)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        initialFocus={cancelRef}
        title={t('ops.detail.confirmTitle', { name })}
        description={t('ops.detail.confirmBody')}
        footer={
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirming(false)}>
              {t('ops.detail.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {t('ops.detail.confirm')}
            </Button>
          </>
        }
      />
    </>
  );
}
