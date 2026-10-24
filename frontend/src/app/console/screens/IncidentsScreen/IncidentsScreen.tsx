import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { safeText } from '@/shared/privacy/redact';
import { Button, Dialog, PageHeader, useToast } from '@/shared/ui';
import { useConsole, useIncidents, useMonitors } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import type { IncidentFilter } from './incidentFilters';
import { IncidentList } from './IncidentList';

type Kind = 'ack' | 'resolve' | 'reopen';
const DONE = { ack: 'ops.incidents.acknowledged', resolve: 'ops.incidents.resolved', reopen: 'ops.incidents.reopened' } as const;

/** FE-39: `#/incidents` — incidents in memory, filtered by state, acknowledged or resolved in place. */
export function IncidentsScreen() {
  const { t } = useTranslation();
  const { source, demo, editable } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const incidents = useIncidents();
  const monitors = useMonitors();
  const [filter, setFilter] = useState<IncidentFilter>('all');
  const [resolving, setResolving] = useState<string | null>(null);
  const names = new Map((monitors.data ?? []).map((m) => [m.id, m.name]));

  const act = useMutation({
    mutationFn: ({ kind, id }: { kind: Kind; id: string }) =>
      kind === 'ack' ? source.acknowledgeIncidentRecord(id) : kind === 'resolve' ? source.resolveIncident(id) : source.reopenIncident(id),
    onSuccess: async (_, { kind }) => {
      toast({ title: t(DONE[kind]), tone: 'OK' });
      setResolving(null);
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    },
    onError: (error) => toast({ title: error.message, tone: 'DOWN' }),
  });
  const resolvingName = resolving ? names.get(incidents.data?.find((i) => i.id === resolving)?.monitorId ?? '') : undefined;

  return (
    <>
      <PageHeader title={t('screens.incidents.title')} description={t('ops.incidents.description')} />
      <ScreenStatus pending={incidents.isPending} error={incidents.error} />
      {incidents.data && (
        <IncidentList
          incidents={incidents.data}
          names={names}
          now={new Date()}
          editable={editable}
          filter={filter}
          onFilterChange={setFilter}
          busyId={act.isPending ? act.variables.id : null}
          onAcknowledge={(id) => act.mutate({ kind: 'ack', id })}
          onResolve={setResolving}
          onReopen={(id) => act.mutate({ kind: 'reopen', id })}
        />
      )}
      <Dialog
        open={resolving !== null}
        onClose={() => setResolving(null)}
        size="sm"
        title={t('ops.incidents.confirmResolveTitle', { name: safeText(resolvingName ?? t('screens.incidents.unknownMonitor')) })}
        description={t('ops.incidents.confirmResolveBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolving(null)}>
              {t('ops.incidents.cancel')}
            </Button>
            <Button variant="primary" loading={act.isPending} onClick={() => resolving && act.mutate({ kind: 'resolve', id: resolving })}>
              {t('ops.incidents.confirmResolve')}
            </Button>
          </>
        }
      />
    </>
  );
}
