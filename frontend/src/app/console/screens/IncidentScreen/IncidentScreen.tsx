import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { IncidentPage, postmortemFileName, postmortemMarkdown } from '@/domains/alerting/IncidentPage';
import { ActiveSilence, SilenceDialog } from '@/domains/alerting/SilenceDialog';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { safeText } from '@/shared/privacy/redact';
import { Button, Dialog, IconCopy, IconDownload, useToast } from '@/shared/ui';
import { downloadBlob } from '../../download';
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
  const { toast } = useToast();
  const { source, demo, access, editable } = useConsole();
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [silencing, setSilencing] = useState(false);
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
    onSuccess: async (record, action) => {
      queryClient.setQueryData(key, record);
      const done = { ack: 'ops.incidents.acknowledged', resolve: 'ops.incidents.resolved', reopen: 'ops.incidents.reopened' } as const;
      if (action.kind in done) toast({ title: t(done[action.kind as keyof typeof done]), tone: 'OK' });
      setConfirmResolve(false);
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    },
    onError: (error) => toast({ title: error instanceof Error ? error.message : String(error), tone: 'DOWN' }),
  });
  const resolved = incident.data?.status === 'RESOLVED';
  // BE-34: MTTA / MTTR and the timeline, once the incident is resolved.
  const postmortem = useQuery({
    queryKey: ['postmortem', demo, id, incident.data?.resolvedAt ?? null],
    queryFn: () => source.getPostmortem(id),
    enabled: resolved,
  });
  const monitorName = monitors.data?.find((m) => m.id === incident.data?.monitorId)?.name ?? t('screens.incidents.unknownMonitor');

  async function copyPostmortem() {
    if (!postmortem.data) return;
    try {
      await navigator.clipboard.writeText(postmortemMarkdown(postmortem.data, t));
      toast({ title: t('ops.incidents.postmortemCopied'), tone: 'OK' });
    } catch {
      toast({ title: t('ops.incidents.copyFailed'), tone: 'WARN' });
    }
  }
  function downloadPostmortem() {
    if (!postmortem.data) return;
    downloadBlob(new Blob([postmortemMarkdown(postmortem.data, t)], { type: 'text/markdown' }), postmortemFileName(postmortem.data));
  }

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
      {incident.data && (
        <IncidentPage
          key={incident.data.id}
          incident={{
            ...toIncidentDetail(incident.data, monitors.data ?? [], groups.data ?? [], t),
            ...(escalation.data ? { escalatesAt: escalation.data.dueAt } : {}),
          }}
          nextStep={escalation.data?.stepName ?? null}
          eyebrow={backLink}
          onResolve={() => setConfirmResolve(true)}
          onReopen={() => act.mutate({ kind: 'reopen' })}
          now={now}
          mode={access.mode}
          onAcknowledge={() => act.mutate({ kind: 'ack' })}
          onComment={(_, text) => act.mutate({ kind: 'comment', text })}
          onLinkTicket={(_, ticket) => act.mutate({ kind: 'ticket', ticket })}
          extraActions={
            editable && (
              <Button variant="secondary" onClick={() => setSilencing(true)}>
                {t('ops.incidents.silence')}
              </Button>
            )
          }
          banner={<ActiveSilence target={incident.data.monitorId} source={source} editable={editable} />}
          postmortemActions={
            postmortem.data && (
              <span className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void copyPostmortem()}>
                  <IconCopy />
                  {t('ops.incidents.copyMarkdown')}
                </Button>
                <Button size="sm" variant="ghost" onClick={downloadPostmortem}>
                  <IconDownload />
                  {t('ops.incidents.downloadMarkdown')}
                </Button>
              </span>
            )
          }
        />
      )}
      {incident.data && editable && (
        <SilenceDialog open={silencing} onClose={() => setSilencing(false)} target={incident.data.monitorId} targetName={monitorName} source={source} />
      )}
      <Dialog
        open={confirmResolve}
        onClose={() => setConfirmResolve(false)}
        size="sm"
        title={t('ops.incidents.confirmResolveTitle', { name: safeText(monitorName) })}
        description={t('ops.incidents.confirmResolveBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmResolve(false)}>
              {t('ops.incidents.cancel')}
            </Button>
            <Button variant="primary" loading={act.isPending} onClick={() => act.mutate({ kind: 'resolve' })}>
              {t('ops.incidents.confirmResolve')}
            </Button>
          </>
        }
      />
      {incident.data && (
        <MonitorHistoryPanel
          key={`history:${incident.data.id}`}
          monitorId={incident.data.monitorId}
          name={monitorName}
          status={incident.data.status === 'RESOLVED' ? 'OK' : incident.data.severity === 'DOWN' ? 'DOWN' : 'WARN'}
          initial={incidentWindow(incident.data, now)}
        />
      )}
    </>
  );
}
