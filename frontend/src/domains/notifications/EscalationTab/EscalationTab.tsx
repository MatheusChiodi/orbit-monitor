import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dialog, EmptyState, IconPlus, Menu, Table, useToast, type TableColumn } from '@/shared/ui';
import type { EscalationPolicy, UpcomingStep } from '../api/notificationsApi';
import { groupNames } from '../GroupScope';
import { LoadError } from '../LoadError';
import { keys, useChannels, useGroupsList, useNotifications, useSchedules } from '../model/queries';
import { relativeFromNow } from '../model/time';
import { PolicyDialog } from '../PolicyDialog';

type Editing = { policy?: EscalationPolicy } | null;

/** Escalation policies (timed steps) plus the escalations waiting on open incidents. */
export function EscalationTab() {
  const { t } = useTranslation();
  const { api, editable } = useNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: keys.policies, queryFn: api.listPolicies });
  const channels = useChannels().data ?? [];
  const schedules = useSchedules().data ?? [];
  const groups = useGroupsList().data ?? [];
  const policies = list.data ?? [];
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<EscalationPolicy | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePolicy(id),
    onSuccess: async () => {
      setDeleting(null);
      toast({ title: t('notificationSettings.escalation.deleted') });
      await queryClient.invalidateQueries({ queryKey: keys.policies });
    },
  });

  const add = editable ? (
    <Button variant="primary" onClick={() => setEditing({})}>
      <IconPlus />
      {t('notificationSettings.escalation.add')}
    </Button>
  ) : null;

  const columns: TableColumn<EscalationPolicy>[] = [
    { key: 'name', header: t('notificationSettings.escalation.columns.name'), cell: (p) => <span className="font-medium text-text">{p.name}</span> },
    { key: 'groups', header: t('notificationSettings.escalation.columns.groups'), hideOnMobile: true, cell: (p) => groupNames(p.groupIds, groups, t('notificationSettings.allGroups')) },
    {
      key: 'steps',
      header: t('notificationSettings.escalation.columns.steps'),
      cell: (p) =>
        t('notificationSettings.escalation.stepsSummary', {
          count: p.steps.length,
          timeline: p.steps
            .map((s) => (s.afterMinutes === 0 ? t('notificationSettings.escalation.immediately') : t('notificationSettings.escalation.minutes', { count: s.afterMinutes })))
            .join(' → '),
        }),
    },
  ];
  if (editable) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'end',
      cell: (p) => (
        <Menu
          label={t('notificationSettings.escalation.actions', { name: p.name })}
          align="end"
          items={[
            { id: 'edit', label: t('notificationSettings.escalation.edit'), onSelect: () => setEditing({ policy: p }) },
            { id: 'delete', label: t('notificationSettings.escalation.delete'), danger: true, onSelect: () => setDeleting(p) },
          ]}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('notificationSettings.escalation.title')} description={t('notificationSettings.escalation.description')} actions={policies.length > 0 ? add : null}>
        {list.isError ? (
          <LoadError onRetry={() => void list.refetch()} />
        ) : list.isPending ? null : policies.length === 0 ? (
          <EmptyState title={t('notificationSettings.escalation.emptyTitle')} action={add} headingLevel={3}>
            {t('notificationSettings.escalation.emptyBody')}
          </EmptyState>
        ) : (
          <Table caption={t('notificationSettings.escalation.caption')} columns={columns} rows={policies} getRowKey={(p) => p.id} />
        )}
      </Card>
      <UpcomingCard channelName={(id) => channels.find((c) => c.id === id)?.name ?? id} />
      <PolicyDialog
        open={editing !== null}
        policy={editing?.policy}
        channels={channels}
        schedules={schedules}
        groups={groups}
        takenIds={policies.map((p) => p.id)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast({ title: t('notificationSettings.escalation.saved'), tone: 'OK' });
          void queryClient.invalidateQueries({ queryKey: keys.policies });
        }}
      />
      <Dialog
        open={deleting !== null}
        size="sm"
        onClose={() => setDeleting(null)}
        title={t('notificationSettings.escalation.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('notificationSettings.escalation.deleteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('notificationSettings.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t('notificationSettings.escalation.deleteConfirm')}
            </Button>
          </>
        }
      />
    </div>
  );
}

function UpcomingCard({ channelName }: { channelName: (id: string) => string }) {
  const { t, i18n } = useTranslation();
  const { api } = useNotifications();
  const upcoming = useQuery({ queryKey: keys.upcoming, queryFn: api.upcoming, refetchInterval: 30_000 });
  const rows = upcoming.data ?? [];
  const monitors = useQuery({ queryKey: keys.monitors, queryFn: api.listMonitors, enabled: rows.length > 0 }).data ?? [];
  const monitorName = (id: string) => monitors.find((m) => m.id === id)?.name ?? id;

  return (
    <Card title={t('notificationSettings.escalation.upcoming.title')} description={t('notificationSettings.escalation.upcoming.description')}>
      {upcoming.isError ? (
        <LoadError onRetry={() => void upcoming.refetch()} />
      ) : upcoming.isPending ? null : rows.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t('notificationSettings.escalation.upcoming.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {rows.map((u: UpcomingStep) => {
            const due = relativeFromNow(u.dueAt, i18n.language) ?? t('notificationSettings.escalation.upcoming.overdue');
            const step = u.stepName ?? t('notificationSettings.escalation.upcoming.step', { n: u.stepIndex + 1 });
            const who = [u.channelIds.map(channelName).join(', '), u.onCall ? t('notificationSettings.escalation.upcoming.onCall', { name: u.onCall }) : '']
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={`${u.incidentId}-${u.stepIndex}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <a href={`#/incidents/${encodeURIComponent(u.incidentId)}`} className="font-medium text-text underline-offset-2 hover:underline focus-visible:underline">
                    {monitorName(u.monitorId)}
                  </a>
                  <span className="text-sm text-muted">
                    {u.policyName} · {step}
                    {who && ` · ${t('notificationSettings.escalation.upcoming.notifies', { who })}`}
                  </span>
                </div>
                <span className="font-mono text-sm text-warn-text">{due}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
