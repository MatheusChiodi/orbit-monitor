import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaintenanceCalendar } from '@/domains/alerting/MaintenanceCalendar';
import { Button } from '@/shared/ui';
import { useConsole, useGroups } from '../../ConsoleContext';
import { ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { addWeeks, newMaintenanceItem, startOfWeek, toCalendarWindows } from './maintenanceItems';

/** FE-41: `#/maintenance` — week calendar backed by `/api/maintenance` (orbit.maintenance.json). */
export function MaintenanceScreen() {
  const { t } = useTranslation();
  const { source, demo, access } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const windows = useQuery({ queryKey: ['maintenance', demo], queryFn: source.listMaintenance });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [notice, setNotice] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: source.saveMaintenance,
    onSuccess: async (_, item) => {
      setNotice(t('screens.maintenance.saved', { title: item.name ?? item.id }));
      await queryClient.invalidateQueries({ queryKey: ['maintenance', demo] });
    },
  });

  return (
    <>
      <ScreenTitle>{t('screens.maintenance.title')}</ScreenTitle>
      <div className="flex flex-wrap gap-[0.4rem]">
        <Button variant="ghost" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
          {t('screens.maintenance.previousWeek')}
        </Button>
        <Button variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          {t('screens.maintenance.thisWeek')}
        </Button>
        <Button variant="ghost" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          {t('screens.maintenance.nextWeek')}
        </Button>
      </div>
      {notice && <p role="status" className="m-0 text-ok-text">{notice}</p>}
      {create.error && <p role="alert" className="m-0 text-down-text">{create.error.message}</p>}
      <ScreenStatus pending={windows.isPending || groups.isPending} error={windows.error ?? groups.error} />
      {windows.data && groups.data && (
        <MaintenanceCalendar
          windows={toCalendarWindows(windows.data)}
          groups={groups.data}
          weekStart={weekStart}
          mode={access.mode}
          onCreate={(window) => create.mutate(newMaintenanceItem(window))}
        />
      )}
    </>
  );
}
