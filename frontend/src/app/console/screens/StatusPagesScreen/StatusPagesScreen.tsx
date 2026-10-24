import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StatusPageBuilder, StatusPageLink } from '@/domains/workspace/StatusPageBuilder';
import { PageHeader } from '@/shared/ui';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import { fromRecord, toRecord } from './statusPageRecords';

/** FE-44: `#/status-pages` — builder and saved pages from `/api/status-pages` (orbit.status-pages.json). */
export function StatusPagesScreen() {
  const { t } = useTranslation();
  const { source, demo, access } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const pages = useQuery({ queryKey: ['status-pages', demo], queryFn: source.listStatusPages });
  const [saved, setSaved] = useState<{ title: string; slug: string } | null>(null);

  const save = useMutation({
    mutationFn: source.saveStatusPage,
    onSuccess: async (_, record) => {
      setSaved({ title: record.title ?? record.slug, slug: record.slug });
      await queryClient.invalidateQueries({ queryKey: ['status-pages', demo] });
    },
  });

  return (
    <>
      <PageHeader title={t('screens.statusPages.title')} description={t('ops.statusPages.description')} />
      {saved && (
        <p role="status" className="m-0 mb-4 flex flex-wrap items-center gap-3 text-base text-ok-text">
          <span>{t('screens.statusPages.saved', { title: saved.title })}</span>
          <StatusPageLink title={saved.title} slug={saved.slug} />
        </p>
      )}
      {save.error && <p role="alert" className="m-0 mb-4 text-base text-down-text">{save.error.message}</p>}
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
