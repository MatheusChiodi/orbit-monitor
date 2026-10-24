import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaintenanceCalendar } from '@/domains/alerting/MaintenanceCalendar';
import { PageHeader, useToast } from '@/shared/ui';
import { useConsole, useGroups } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import { addWeeks, fromOccurrences, newMaintenanceItem, startOfWeek } from './maintenanceItems';

/** FE-41: `#/maintenance` — week calendar of `/api/maintenance/occurrences` (one-off and cron); new windows are PUT. */
export function MaintenanceScreen() {
  const { t } = useTranslation();
  const { source, demo, access } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const range = { from: weekStart.toISOString(), to: addWeeks(weekStart, 1).toISOString() };
  const windows = useQuery({
    queryKey: ['maintenance', demo, range.from],
    queryFn: () => source.listMaintenanceOccurrences(range),
  });

  const create = useMutation({
    mutationFn: source.saveMaintenance,
    onSuccess: async (_, item) => {
      toast({ title: t('screens.maintenance.saved', { title: item.name ?? item.id }), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: ['maintenance', demo] });
    },
  });

  return (
    <>
      <PageHeader title={t('screens.maintenance.title')} description={t('ops.maintenance.description')} />
      {create.error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {create.error.message}
        </p>
      )}
      <ScreenStatus pending={windows.isPending || groups.isPending} error={windows.error ?? groups.error} />
      {windows.data && groups.data && (
        <MaintenanceCalendar
          windows={fromOccurrences(windows.data)}
          groups={groups.data}
          weekStart={weekStart}
          mode={access.mode}
          onWeekChange={(week) => setWeekStart(startOfWeek(week))}
          onCreate={(window) => create.mutate(newMaintenanceItem(window))}
        />
      )}
    </>
  );
}
