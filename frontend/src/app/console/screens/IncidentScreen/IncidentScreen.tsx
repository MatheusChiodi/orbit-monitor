import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { IncidentPage } from '@/domains/alerting/IncidentPage';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { routeHref } from '../../routes';
import { MonitorHistoryPanel } from '../MonitorHistoryPanel';
import { ScreenStatus } from '../ScreenStatus';
import { incidentWindow } from './incidentWindow';
import { toIncidentDetail } from './incidentDetail';

type Action =
  | { kind: 'ack' | 'resolve' | 'reopen' }
  | { kind: 'comment'; text: string }
  | { kind: 'ticket'; ticket: string };

/** FE-39: `#/incidents/:id` — timeline, comments, acknowledge, ticket link and postmortem from the incident API. */
export function IncidentScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const { source, demo, access } = useConsole();
  const queryClient = useQueryClient();
  const key = ['incident', demo, id];
  const incident = useQuery({ queryKey: key, queryFn: () => source.getIncident(id), refetchInterval: 15_000 });
  const open = incident.data?.status === 'OPEN';
  // FE-40: next escalation step; the API answers 204 (null) once acknowledged or resolved.
  const escalation = useQuery({
    queryKey: ['incident-escalation', demo, id, incident.data?.acknowledgedBy ?? null],
    queryFn: () => source.getIncidentEscalation(id),
    enabled: open,
  });
  const monitors = useMonitors();
  const groups = useGroups();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const act = useMutation({
    mutationFn: (action: Action): Promise<IncidentRecord> => {
      if (action.kind === 'ack') return source.acknowledgeIncidentRecord(id);
      if (action.kind === 'resolve') return source.resolveIncident(id);
      if (action.kind === 'reopen') return source.reopenIncident(id);
      if (action.kind === 'comment') return source.commentIncident(id, action.text);
      if (action.kind === 'ticket') return source.linkIncidentTicket(id, action.ticket);
      throw new Error(`unknown action ${action.kind}`);
    },
    onSuccess: async (record) => {
      queryClient.setQueryData(key, record);
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    },
  });

  const backLink = (
    <a href={routeHref({ name: 'incidents' })} className="text-sm text-accent hover:underline">
      ← {t('screens.incidents.back')}
    </a>
  );
  const notFound = incident.error instanceof Error && /\(404\)|not found/i.test(incident.error.message);
  return (
    <>
      {!incident.data && backLink}
      {notFound ? (
        <p role="alert" className="m-0 text-muted">
          {t('screens.incidents.notFound')}
        </p>
      ) : (
        <ScreenStatus pending={incident.isPending} error={incident.error} />
      )}
      {act.error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {act.error.message}
        </p>
      )}
      {incident.data && (
        <IncidentPage
          key={incident.data.id}
          incident={{
            ...toIncidentDetail(incident.data, monitors.data ?? [], groups.data ?? [], t),
            ...(escalation.data ? { escalatesAt: escalation.data.dueAt } : {}),
          }}
          nextStep={escalation.data?.stepName ?? null}
          eyebrow={backLink}
          onResolve={() => act.mutate({ kind: 'resolve' })}
          onReopen={() => act.mutate({ kind: 'reopen' })}
          now={now}
          mode={access.mode}
          onAcknowledge={() => act.mutate({ kind: 'ack' })}
          onComment={(_, text) => act.mutate({ kind: 'comment', text })}
          onLinkTicket={(_, ticket) => act.mutate({ kind: 'ticket', ticket })}
        />
      )}
      {incident.data && (
        <MonitorHistoryPanel
          key={`history:${incident.data.id}`}
          monitorId={incident.data.monitorId}
          name={monitors.data?.find((m) => m.id === incident.data!.monitorId)?.name ?? t('screens.incidents.unknownMonitor')}
          status={incident.data.status === 'RESOLVED' ? 'OK' : incident.data.severity === 'DOWN' ? 'DOWN' : 'WARN'}
          initial={incidentWindow(incident.data, now)}
        />
      )}
    </>
  );
}
