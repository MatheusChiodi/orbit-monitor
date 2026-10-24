import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dialog, EmptyState, IconPlus, Menu, Table, useToast, type TableColumn } from '@/shared/ui';
import type { OnCallSchedule } from '../api/notificationsApi';
import { LoadError } from '../LoadError';
import { keys, useNotifications, useSchedules } from '../model/queries';
import { shortDateTime } from '../model/time';
import { ScheduleDialog, shiftLabel } from '../ScheduleDialog';

type Editing = { schedule?: OnCallSchedule } | null;

/** On-call: who is on call now, and the rotations behind it. */
export function OnCallTab() {
  const { t, i18n } = useTranslation();
  const { api, editable } = useNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const list = useSchedules();
  const now = useQuery({ queryKey: keys.onCallNow, queryFn: api.onCallNow, refetchInterval: 60_000 });
  const schedules = list.data ?? [];
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<OnCallSchedule | null>(null);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: keys.schedules }), queryClient.invalidateQueries({ queryKey: keys.onCallNow })]);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteSchedule(id),
    onSuccess: async () => {
      setDeleting(null);
      toast({ title: t('notificationSettings.oncall.deleted') });
      await refresh();
    },
  });

  const add = editable ? (
    <Button variant="primary" onClick={() => setEditing({})}>
      <IconPlus />
      {t('notificationSettings.oncall.add')}
    </Button>
  ) : null;

  const columns: TableColumn<OnCallSchedule>[] = [
    { key: 'name', header: t('notificationSettings.oncall.columns.name'), cell: (s) => <span className="font-medium text-text">{s.name}</span> },
    {
      key: 'rotation',
      header: t('notificationSettings.oncall.columns.rotation'),
      cell: (s) =>
        [t('notificationSettings.oncall.people', { count: s.people.length }), shiftLabel(t, s.shiftHours), s.overrides?.length ? t('notificationSettings.oncall.overrides', { count: s.overrides.length }) : '']
          .filter(Boolean)
          .join(' · '),
    },
    {
      key: 'now',
      header: t('notificationSettings.oncall.columns.now'),
      cell: (s) =>
        s.onCallNow ? (
          <span>
            <span className="text-text">{s.onCallNow}</span>
            {s.shiftEndsAt && <span className="text-muted"> · {t('notificationSettings.oncall.until', { time: shortDateTime(s.shiftEndsAt, i18n.language) })}</span>}
          </span>
        ) : (
          <span className="text-dim">{t('notificationSettings.oncall.nobody')}</span>
        ),
    },
  ];
  if (editable) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'end',
      cell: (s) => (
        <Menu
          label={t('notificationSettings.oncall.actions', { name: s.name })}
          align="end"
          items={[
            { id: 'edit', label: t('notificationSettings.oncall.edit'), onSelect: () => setEditing({ schedule: s }) },
            { id: 'delete', label: t('notificationSettings.oncall.delete'), danger: true, onSelect: () => setDeleting(s) },
          ]}
        />
      ),
    });
  }

  const nowEntries = now.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      {schedules.length > 0 && (
        <Card title={t('notificationSettings.oncall.nowTitle')}>
          {nowEntries.length === 0 ? (
            <p className="m-0 text-sm text-muted">{t('notificationSettings.oncall.nowEmpty')}</p>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {nowEntries.map((entry) => (
                <li key={`${entry.scheduleId}-${entry.person}`} className="flex flex-col gap-0.5 rounded-md border border-line bg-s2 p-3">
                  <span className="section-label">{entry.name}</span>
                  <span className="text-md font-semibold text-text">{entry.person}</span>
                  {entry.shiftEndsAt && <span className="text-sm text-muted">{t('notificationSettings.oncall.until', { time: shortDateTime(entry.shiftEndsAt, i18n.language) })}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <Card title={t('notificationSettings.oncall.title')} description={t('notificationSettings.oncall.description')} actions={schedules.length > 0 ? add : null}>
        {list.isError ? (
          <LoadError onRetry={() => void list.refetch()} />
        ) : list.isPending ? null : schedules.length === 0 ? (
          <EmptyState title={t('notificationSettings.oncall.emptyTitle')} action={add} headingLevel={3}>
            {t('notificationSettings.oncall.emptyBody')}
          </EmptyState>
        ) : (
          <Table caption={t('notificationSettings.oncall.caption')} columns={columns} rows={schedules} getRowKey={(s) => s.id} />
        )}
      </Card>
      <ScheduleDialog
        open={editing !== null}
        schedule={editing?.schedule}
        takenIds={schedules.map((s) => s.id)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast({ title: t('notificationSettings.oncall.saved'), tone: 'OK' });
          void refresh();
        }}
      />
      <Dialog
        open={deleting !== null}
        size="sm"
        onClose={() => setDeleting(null)}
        title={t('notificationSettings.oncall.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('notificationSettings.oncall.deleteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('notificationSettings.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t('notificationSettings.oncall.deleteConfirm')}
            </Button>
          </>
        }
      />
    </div>
  );
}
