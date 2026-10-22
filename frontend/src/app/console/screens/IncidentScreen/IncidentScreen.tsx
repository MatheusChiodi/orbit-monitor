import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { IncidentPage } from '@/domains/alerting/IncidentPage';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { routeHref } from '../../routes';
import { ScreenStatus } from '../ScreenStatus';
import { toIncidentDetail } from './incidentDetail';

type Action = { kind: 'ack' } | { kind: 'comment'; text: string } | { kind: 'ticket'; ticket: string };

/** FE-39: `#/incidents/:id` — timeline, comments, acknowledge, ticket link and postmortem from the incident API. */
export function IncidentScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const { source, demo, access, operator } = useConsole();
  const queryClient = useQueryClient();
  const key = ['incident', demo, id];
  const incident = useQuery({ queryKey: key, queryFn: () => source.getIncident(id), refetchInterval: 15_000 });
  const monitors = useMonitors();
  const groups = useGroups();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const act = useMutation({
    mutationFn: (action: Action): Promise<IncidentRecord> => {
      if (action.kind === 'ack') return source.acknowledgeIncidentRecord(id, operator);
      if (action.kind === 'comment') return source.commentIncident(id, operator, action.text);
      return source.linkIncidentTicket(id, operator, action.ticket);
    },
    onSuccess: async (record) => {
      queryClient.setQueryData(key, record);
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    },
  });

  const notFound = incident.error instanceof Error && /\(404\)|not found/i.test(incident.error.message);
  return (
    <>
      <a href={routeHref({ name: 'incidents' })} className="text-[0.85rem] text-info hover:underline">
        ← {t('screens.incidents.back')}
      </a>
      {notFound ? (
        <p role="alert" className="m-0 text-muted">
          {t('screens.incidents.notFound')}
        </p>
      ) : (
        <ScreenStatus pending={incident.isPending} error={incident.error} />
      )}
      {act.error && (
        <p role="alert" className="m-0 text-[0.85rem] text-down-text">
          {act.error.message}
        </p>
      )}
      {incident.data && (
        <IncidentPage
          key={incident.data.id}
          incident={toIncidentDetail(incident.data, monitors.data ?? [], groups.data ?? [], t)}
          now={now}
          mode={access.mode}
          onAcknowledge={() => act.mutate({ kind: 'ack' })}
          onComment={(_, text) => act.mutate({ kind: 'comment', text })}
          onLinkTicket={(_, ticket) => act.mutate({ kind: 'ticket', ticket })}
        />
      )}
    </>
  );
}
