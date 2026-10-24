import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaintenanceCalendar, type MaintenanceWindow, type WindowDraft } from '@/domains/alerting/MaintenanceCalendar';
import { PageHeader, useToast } from '@/shared/ui';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { useRouteAction } from '../../routes';
import { ScreenStatus } from '../ScreenStatus';
import { addWeeks, draftOfItem, fromOccurrences, maintenanceItemOf, startOfWeek } from './maintenanceItems';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** FE-41: `#/maintenance` — week calendar of `/api/maintenance/occurrences` (one-off and cron); windows are created, edited and deleted here. */
export function MaintenanceScreen() {
  const { t } = useTranslation();
  const { source, demo, access } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [newRequest, setNewRequest] = useState(0);
  const range = { from: weekStart.toISOString(), to: addWeeks(weekStart, 1).toISOString() };
  const windows = useQuery({
    queryKey: ['maintenance', demo, range.from],
    queryFn: () => source.listMaintenanceOccurrences(range),
  });
  // The saved items carry what the calendar does not show (cron, duration, reason) for editing.
  const items = useQuery({ queryKey: ['maintenance', demo, 'items'], queryFn: () => source.listMaintenance() });

  useRouteAction('new-window', () => setNewRequest((n) => n + 1));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['maintenance', demo] });
  const save = useMutation({
    mutationFn: (draft: WindowDraft) => source.saveMaintenance(maintenanceItemOf(draft)),
    onSuccess: async (_, draft) => {
      toast({ title: t(draft.id ? 'ops.maintenance.saved' : 'ops.maintenance.created'), tone: 'OK' });
      await refresh();
    },
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => source.deleteMaintenance(id),
    onSuccess: async () => {
      toast({ title: t('ops.maintenance.deleted'), tone: 'OK' });
      await refresh();
    },
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });

  const draftOf = (w: MaintenanceWindow) => {
    const item = (items.data ?? []).find((i) => i.id === w.windowId);
    return item ? draftOfItem(item, w) : undefined;
  };

  return (
    <>
      <PageHeader title={t('screens.maintenance.title')} description={t('ops.maintenance.description')} />
      <ScreenStatus pending={windows.isPending || groups.isPending} error={windows.error ?? groups.error} />
      {windows.data && groups.data && (
        <MaintenanceCalendar
          windows={fromOccurrences(windows.data)}
          groups={groups.data}
          monitors={monitors.data ?? []}
          weekStart={weekStart}
          mode={access.mode}
          newRequest={newRequest}
          draftOf={draftOf}
          onWeekChange={(week) => setWeekStart(startOfWeek(week))}
          onSave={(draft) => save.mutate(draft)}
          onDelete={(id) => remove.mutate(id)}
        />
      )}
    </>
  );
}
