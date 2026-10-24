import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageHeader, useToast } from '@/shared/ui';
import { useConsole, useIncidents, useMonitors } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import type { IncidentFilter } from './incidentFilters';
import { IncidentList } from './IncidentList';

/** FE-39: `#/incidents` — incidents in memory, filtered by state, acknowledged or resolved in place. */
export function IncidentsScreen() {
  const { t } = useTranslation();
  const { source, demo, editable } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const incidents = useIncidents();
  const monitors = useMonitors();
  const [filter, setFilter] = useState<IncidentFilter>('all');
  const names = new Map((monitors.data ?? []).map((m) => [m.id, m.name]));

  const act = useMutation({
    mutationFn: ({ kind, id }: { kind: 'ack' | 'resolve'; id: string }) =>
      kind === 'ack' ? source.acknowledgeIncidentRecord(id) : source.resolveIncident(id),
    onSuccess: async (_, { kind }) => {
      toast({ title: t(kind === 'ack' ? 'ops.incidents.acknowledged' : 'ops.incidents.resolved'), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    },
  });

  return (
    <>
      <PageHeader title={t('screens.incidents.title')} description={t('ops.incidents.description')} />
      <ScreenStatus pending={incidents.isPending} error={incidents.error} />
      {act.error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {act.error.message}
        </p>
      )}
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
          onResolve={(id) => act.mutate({ kind: 'resolve', id })}
        />
      )}
    </>
  );
}
