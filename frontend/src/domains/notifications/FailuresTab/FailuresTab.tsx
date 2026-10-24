import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, IconCheck, Table, type TableColumn } from '@/shared/ui';
import type { DeadLetter } from '../api/notificationsApi';
import { LoadError } from '../LoadError';
import { deliveryErrorText } from '../model/deliveryError';
import { keys, useChannels, useNotifications } from '../model/queries';

type Row = DeadLetter & { key: string };

/** Delivery failures (BE-36 dead letters): which channel, why, how many tries. Errors arrive masked. */
export function FailuresTab() {
  const { t } = useTranslation();
  const { api } = useNotifications();
  const list = useQuery({ queryKey: keys.deadLetters, queryFn: api.deadLetters });
  const channels = useChannels().data ?? [];
  const rows: Row[] = (list.data ?? []).map((d, i) => ({ ...d, key: `${d.channelId}-${i}` }));
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? t('notificationSettings.failures.unknownChannel', { id });

  const columns: TableColumn<Row>[] = [
    { key: 'channel', header: t('notificationSettings.failures.columns.channel'), cell: (d) => <span className="font-medium text-text">{channelName(d.channelId)}</span> },
    { key: 'reason', header: t('notificationSettings.failures.columns.reason'), cell: (d) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-text">{deliveryErrorText(t, d.error)}</span>
          <span className="break-words font-mono text-xs text-dim">{t('notificationSettings.failures.technical', { raw: d.error })}</span>
        </span>
      ),
    },
    { key: 'attempts', header: t('notificationSettings.failures.columns.attempts'), cell: (d) => t('notificationSettings.failures.attempts', { count: d.attempts }) },
  ];

  return (
    <Card
      title={t('notificationSettings.failures.title')}
      description={t('notificationSettings.failures.description')}
      actions={
        <Button size="sm" variant="secondary" loading={list.isFetching && !list.isPending} onClick={() => void list.refetch()}>
          {t('notificationSettings.failures.refresh')}
        </Button>
      }
    >
      {list.isError ? (
        <LoadError onRetry={() => void list.refetch()} />
      ) : list.isPending ? null : rows.length === 0 ? (
        <EmptyState icon={IconCheck} title={t('notificationSettings.failures.emptyTitle')} headingLevel={3}>
          {t('notificationSettings.failures.emptyBody')}
        </EmptyState>
      ) : (
        <Table caption={t('notificationSettings.failures.caption')} columns={columns} rows={rows} getRowKey={(d) => d.key} />
      )}
    </Card>
  );
}
