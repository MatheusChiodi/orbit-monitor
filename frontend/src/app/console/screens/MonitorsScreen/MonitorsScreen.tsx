import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BulkActions } from '@/domains/workspace/BulkActions';
import { GroupList } from '@/domains/workspace/GroupList';
import { GroupOrderEditor } from '@/domains/workspace/GroupOrderEditor';
import { Onboarding } from '@/domains/workspace/Onboarding';
import { OrbitRail, railMonitors } from '@/domains/workspace/OrbitRail';
import type { GroupOrder } from '@/shared/api/consoleEndpoints';
import type { GroupInput } from '@/shared/api/consoleTypes';
import { Button, IconPlus, Menu, PageHeader, useToast } from '@/shared/ui';
import { pausedBody, targetUrlOf } from '../MonitorDetailScreen';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { GroupManager } from './GroupManager';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** `#/`: the orbit rail, then every group in one grid; onboarding on an empty install. */
export function MonitorsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { access, editable, navigate, source, demo } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const [reordering, setReordering] = useState(false);
  const [managing, setManaging] = useState(false);
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const allGroups = groups.data ?? [];
  const allMonitors = monitors.data ?? [];
  const listed = railMonitors(allMonitors);
  const empty = !monitors.isPending && listed.length === 0;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['groups', demo] });
    await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
  };

  // FE-55 card actions: acknowledge the monitor's open incident; open its URL (else the detail).
  async function acknowledgeMonitor(monitorId: string) {
    try {
      const [open] = (await source.listIncidents({ status: 'OPEN', monitorId })).filter((i) => !i.acknowledgedBy);
      if (!open) return toast({ title: t('screens.monitor.noOpenIncident') });
      await source.acknowledgeIncidentRecord(open.id);
      toast({ title: t('ops.detail.acknowledgedToast'), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    } catch (error) {
      toast({ title: reason(error), tone: 'DOWN' });
    }
  }
  async function openTarget(monitorId: string) {
    const url = await source.getMonitor(monitorId).then((d) => targetUrlOf(d.definition), () => null);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else navigate({ name: 'monitor', id: monitorId });
  }

  // Bulk actions run one request per monitor; the toast says how it went.
  async function bulk(ids: readonly string[], action: (id: string) => Promise<unknown>, done: string) {
    const results = await Promise.allSettled(ids.map(action));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    toast(failed ? { title: t('ops.monitors.bulk.failed', { error: reason(failed.reason) }), tone: 'DOWN' } : { title: done, tone: 'OK' });
    setSelected(new Set());
    await refresh();
  }
  const pause = (ids: string[], paused: boolean) =>
    bulk(
      ids,
      async (id) => source.createMonitor(pausedBody((await source.getMonitor(id)).definition, paused)),
      t(paused ? 'ops.monitors.bulk.paused' : 'ops.monitors.bulk.resumed'),
    );
  const remove = (ids: string[]) => bulk(ids, (id) => source.deleteMonitor(id), t('ops.monitors.bulk.deleted', { count: ids.length }));
  const move = (ids: string[], target: string) => {
    const staying = allMonitors.filter((m) => m.groupId === target && !ids.includes(m.id)).map((m) => m.id);
    return bulk(
      [target],
      () => source.saveGroupOrder({ groupIds: allGroups.map((g) => g.id), monitors: { [target]: [...staying, ...ids] } }),
      t('ops.monitors.bulk.moved'),
    );
  };

  // FE-13: one PUT /api/groups/order per drop; the lists refresh from the API afterwards.
  const saveOrder = useMutation({
    mutationFn: (order: GroupOrder) => source.saveGroupOrder(order),
    onSuccess: refresh,
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });
  const ordered = groupIds ? groupIds.flatMap((id) => allGroups.filter((g) => g.id === id)) : allGroups;
  const monitorOrder = (): GroupOrder['monitors'] =>
    Object.fromEntries(ordered.map((g) => [g.id, allMonitors.filter((m) => m.groupId === g.id).map((m) => m.id)]));

  const saveGroup = async (group: GroupInput) => {
    await source.saveGroup(group);
    toast({ title: t('ops.monitors.groups.saved'), tone: 'OK' });
    await refresh();
  };
  const deleteGroup = async (id: string) => {
    await source.deleteGroup(id);
    toast({ title: t('ops.monitors.groups.deleted'), tone: 'OK' });
    await refresh();
  };

  const actions = editable && (
    <>
      {!empty && (
        <Menu
          label={t('ops.monitors.more')}
          items={[
            {
              id: 'reorder',
              label: reordering ? t('ops.monitors.reorderDone') : t('ops.monitors.reorder'),
              onSelect: () => {
                setReordering((r) => !r);
                setGroupIds(null);
              },
            },
            { id: 'groups', label: t('ops.monitors.manageGroups'), onSelect: () => setManaging(true) },
          ]}
        />
      )}
      <Button variant="primary" onClick={() => navigate({ name: 'new-monitor' })}>
        <IconPlus />
        {t('ops.monitors.add')}
      </Button>
    </>
  );

  return (
    <>
      <PageHeader title={t('ops.monitors.title')} description={empty ? undefined : t('ops.monitors.description')} actions={actions || undefined} />
      {(groups.isError || monitors.isError) && (
        <p role="alert" className="m-0 text-base text-down-text">
          {t('ops.monitors.loadError')}
        </p>
      )}
      {groups.isPending || monitors.isPending ? (
        <p className="m-0 text-base text-muted">{t('app.loading')}</p>
      ) : (
        <>
          <OrbitRail monitors={allMonitors} groups={allGroups} onOpen={(id) => navigate({ name: 'monitor', id })} />
          {empty ? (
            <Onboarding mode={access.mode} onStart={(kind) => navigate({ name: 'new-monitor', kind })} />
          ) : reordering ? (
            <>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setReordering(false)}>
                  {t('ops.monitors.reorderDone')}
                </Button>
              </div>
              <GroupOrderEditor
                groups={ordered}
                monitors={listed}
                onChange={(order) => saveOrder.mutate({ groupIds: ordered.map((g) => g.id), monitors: order })}
                onGroupsChange={(ids) => {
                  setGroupIds(ids);
                  saveOrder.mutate({ groupIds: ids, monitors: monitorOrder() });
                }}
              />
            </>
          ) : (
            <>
              <BulkActions
                selected={listed.filter((m) => selected.has(m.id))}
                groups={allGroups}
                mode={editable ? 'edit' : 'view-only'}
                onPause={(ids, paused) => void pause(ids, paused)}
                onMove={(ids, target) => void move(ids, target)}
                onDelete={(ids) => void remove(ids)}
                onClear={() => setSelected(new Set())}
              />
              <GroupList
                groups={allGroups}
                monitors={allMonitors}
                canEdit={editable}
                selected={selected}
                onSelectionChange={setSelected}
                onOpenMonitor={(id) => navigate({ name: 'monitor', id })}
                onAcknowledgeMonitor={(id) => void acknowledgeMonitor(id)}
                onOpenTarget={(id) => void openTarget(id)}
              />
            </>
          )}
        </>
      )}
      {editable && (
        <GroupManager
          open={managing}
          groups={allGroups}
          monitors={listed}
          onSave={saveGroup}
          onDelete={deleteGroup}
          onClose={() => setManaging(false)}
        />
      )}
    </>
  );
}
