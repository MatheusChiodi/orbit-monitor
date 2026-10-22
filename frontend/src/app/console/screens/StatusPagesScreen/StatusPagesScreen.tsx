import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StatusPageBuilder } from '@/domains/workspace/StatusPageBuilder';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { fromRecord, toRecord } from './statusPageRecords';

/** FE-44: `#/status-pages` — builder and saved pages from `/api/status-pages` (orbit.status-pages.json). */
export function StatusPagesScreen() {
  const { t } = useTranslation();
  const { source, demo, access } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const pages = useQuery({ queryKey: ['status-pages', demo], queryFn: source.listStatusPages });
  const [notice, setNotice] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: source.saveStatusPage,
    onSuccess: async (_, record) => {
      setNotice(t('screens.statusPages.saved', { title: record.title ?? record.slug }));
      await queryClient.invalidateQueries({ queryKey: ['status-pages', demo] });
    },
  });

  return (
    <>
      <ScreenTitle>{t('screens.statusPages.title')}</ScreenTitle>
      {notice && <p role="status" className="m-0 text-ok-text">{notice}</p>}
      {save.error && <p role="alert" className="m-0 text-down-text">{save.error.message}</p>}
      <ScreenStatus pending={pages.isPending} error={pages.error} />
      {pages.data && (
        <StatusPageBuilder
          groups={groups.data ?? []}
          monitors={monitors.data ?? []}
          pages={pages.data.map(fromRecord)}
          mode={access.mode}
          onSave={(draft) => save.mutate(toRecord(draft, pages.data))}
        />
      )}
    </>
  );
}
