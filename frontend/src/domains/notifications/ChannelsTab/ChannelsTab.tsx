import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Dialog, EmptyState, IconBell, IconPlus, Menu, StatusBadge, Table, useToast, type TableColumn } from '@/shared/ui';
import type { Channel, TestResult } from '../api/notificationsApi';
import { ChannelDialog } from '../ChannelDialog';
import { groupNames } from '../GroupScope';
import { LoadError } from '../LoadError';
import { deliveryErrorText } from '../model/deliveryError';
import { errorMessage, keys, useChannels, useGroupsList, useNotifications } from '../model/queries';

type TestState = { phase: 'sending' } | ({ phase: 'done' } & TestResult);
type Editing = { channel?: Channel } | null;

export interface ChannelsTabProps {
  /** Increments when something outside (the command palette) asks to add a channel. */
  addRequest?: number;
}

/** Channels: list, add/edit, send a test, delete. */
export function ChannelsTab({ addRequest = 0 }: ChannelsTabProps) {
  const { t } = useTranslation();
  const { api, editable } = useNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const list = useChannels();
  const groups = useGroupsList().data ?? [];
  const channels = list.data ?? [];
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Channel | null>(null);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  useEffect(() => {
    if (addRequest > 0 && editable) setEditing({});
  }, [addRequest, editable]);

  const sendTest = async (channel: Channel) => {
    setTests((s) => ({ ...s, [channel.id]: { phase: 'sending' } }));
    let result: TestResult;
    try {
      result = await api.testChannel(channel.id);
    } catch (e) {
      result = { delivered: false, error: errorMessage(e) };
    }
    setTests((s) => ({ ...s, [channel.id]: { phase: 'done', ...result } }));
    if (result.delivered) toast({ title: t('notificationSettings.channels.test.deliveredToast', { name: channel.name }), tone: 'OK' });
    else toast({ title: t('notificationSettings.channels.test.failedToast'), description: deliveryErrorText(t, result.error), tone: 'DOWN' });
    void queryClient.invalidateQueries({ queryKey: keys.deadLetters });
  };

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteChannel(id),
    onSuccess: async () => {
      setDeleting(null);
      toast({ title: t('notificationSettings.channels.deleted') });
      await queryClient.invalidateQueries({ queryKey: keys.channels });
    },
  });

  const onSaved = (channel: Channel, test: boolean) => {
    setEditing(null);
    toast({ title: t('notificationSettings.channels.saved'), tone: 'OK' });
    void queryClient.invalidateQueries({ queryKey: keys.channels });
    if (test) void sendTest(channel);
  };

  const add = editable ? (
    <Button variant="primary" onClick={() => setEditing({})}>
      <IconPlus />
      {t('notificationSettings.channels.add')}
    </Button>
  ) : null;

  const columns: TableColumn<Channel>[] = [
    {
      key: 'name',
      header: t('notificationSettings.channels.columns.name'),
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-text">{c.name}</span>
          {!c.enabled && <Badge>{t('notificationSettings.channels.paused')}</Badge>}
        </span>
      ),
    },
    { key: 'type', header: t('notificationSettings.channels.columns.type'), cell: (c) => t(`notificationSettings.types.${c.type}`) },
    { key: 'sends', header: t('notificationSettings.channels.columns.sends'), hideOnMobile: true, cell: (c) => t(`notificationSettings.severity.${c.minSeverity ?? 'WARN'}`) },
    { key: 'groups', header: t('notificationSettings.channels.columns.groups'), hideOnMobile: true, cell: (c) => groupNames(c.groupIds, groups, t('notificationSettings.allGroups')) },
    { key: 'test', header: t('notificationSettings.channels.columns.test'), cell: (c) => <TestStatus state={tests[c.id]} /> },
  ];
  if (editable) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'end',
      cell: (c) => (
        <Menu
          label={t('notificationSettings.channels.actions', { name: c.name })}
          align="end"
          items={[
            { id: 'test', label: t('notificationSettings.channels.sendTest'), onSelect: () => void sendTest(c), disabled: tests[c.id]?.phase === 'sending' },
            { id: 'edit', label: t('notificationSettings.channels.edit'), onSelect: () => setEditing({ channel: c }) },
            { id: 'delete', label: t('notificationSettings.channels.delete'), danger: true, onSelect: () => setDeleting(c) },
          ]}
        />
      ),
    });
  }

  return (
    <Card title={t('notificationSettings.channels.title')} description={t('notificationSettings.channels.description')} actions={channels.length > 0 ? add : null}>
      {list.isError ? (
        <LoadError onRetry={() => void list.refetch()} />
      ) : list.isPending ? null : channels.length === 0 ? (
        <EmptyState icon={IconBell} title={t('notificationSettings.channels.emptyTitle')} action={add} headingLevel={3}>
          {t('notificationSettings.channels.emptyBody')}
        </EmptyState>
      ) : (
        <Table caption={t('notificationSettings.channels.caption')} columns={columns} rows={channels} getRowKey={(c) => c.id} />
      )}
      <ChannelDialog
        open={editing !== null}
        channel={editing?.channel}
        groups={groups}
        takenIds={channels.map((c) => c.id)}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
      <Dialog
        open={deleting !== null}
        size="sm"
        onClose={() => setDeleting(null)}
        title={t('notificationSettings.channels.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('notificationSettings.channels.deleteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('notificationSettings.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t('notificationSettings.channels.deleteConfirm')}
            </Button>
          </>
        }
      />
    </Card>
  );
}

function TestStatus({ state }: { state: TestState | undefined }) {
  const { t } = useTranslation();
  if (!state) return <span className="text-sm text-dim">{t('notificationSettings.channels.test.never')}</span>;
  if (state.phase === 'sending') return <span className="text-sm text-muted" aria-live="polite">{t('notificationSettings.channels.test.sending')}</span>;
  return (
    <span aria-live="polite" className="block max-w-xs">
      {state.delivered ? (
        <StatusBadge status="OK">{t('notificationSettings.channels.test.delivered')}</StatusBadge>
      ) : (
        <StatusBadge status="DOWN">{t('notificationSettings.channels.test.failed', { error: deliveryErrorText(t, state.error) })}</StatusBadge>
      )}
    </span>
  );
}
