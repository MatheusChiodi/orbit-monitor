import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BulkActions } from '@/domains/workspace/BulkActions';
import { GroupList } from '@/domains/workspace/GroupList';
import { GroupOrderEditor } from '@/domains/workspace/GroupOrderEditor';
import { Onboarding } from '@/domains/workspace/Onboarding';
import { OrbitRail, railMonitors } from '@/domains/workspace/OrbitRail';
import type { GroupOrder } from '@/shared/api/consoleEndpoints';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import {
  Button,
  Dialog,
  IconCopy,
  IconEdit,
  IconPause,
  IconPlay,
  IconPlus,
  IconTrash,
  Menu,
  PageHeader,
  useToast,
  type MenuItem,
} from '@/shared/ui';
import { targetUrlOf, useMonitorActions } from '../MonitorDetailScreen';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { useRouteAction } from '../../routes';
import { DeleteGroupDialog, GroupNameDialog, MoveMonitorDialog } from './GroupDialogs';
import { GroupManager } from './GroupManager';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** `#/`: the orbit rail, then every group in one grid with row and group actions; onboarding on an empty install. */
export function MonitorsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { access, editable, navigate, source, demo } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const actions = useMonitorActions();
  const [reordering, setReordering] = useState(false);
  const [managing, setManaging] = useState(false);
  const [naming, setNaming] = useState<{ group: Group | null } | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [moving, setMoving] = useState<MonitorView | null>(null);
  const [deleting, setDeleting] = useState<MonitorView | null>(null);
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const cancelDelete = useRef<HTMLButtonElement>(null);

  const allGroups = groups.data ?? [];
  const allMonitors = monitors.data ?? [];
  const listed = railMonitors(allMonitors);
  const empty = !monitors.isPending && listed.length === 0;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['groups', demo] });
    await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
  };

  // `?action=new-group` from the command palette.
  useRouteAction('new-group', () => editable && setNaming({ group: null }));

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

  const bulk = async (...args: Parameters<typeof actions.bulk>) => {
    await actions.bulk(...args);
    setSelected(new Set());
  };

  // FE-13: one PUT /api/groups/order per drop; the lists refresh from the API afterwards.
  const saveOrder = useMutation({
    mutationFn: (order: GroupOrder) => source.saveGroupOrder(order),
    onSuccess: async () => {
      toast({ title: t('screens.reorder.saved'), tone: 'OK' });
      await refresh();
    },
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
  const deleteGroup = async (id: string, moveTo?: string) => {
    await source.deleteGroup(id, moveTo);
    toast({ title: t('ops.monitors.groups.deleted'), tone: 'OK' });
    await refresh();
  };

  const rowActions = (m: MonitorView): MenuItem[] => [
    { id: 'edit', label: t('ops.detail.edit'), icon: IconEdit, onSelect: () => navigate({ name: 'edit-monitor', id: m.id }) },
    { id: 'duplicate', label: t('ops.detail.duplicate'), icon: IconCopy, onSelect: () => void actions.duplicate(m.id) },
    m.paused
      ? { id: 'resume', label: t('ops.detail.resume'), icon: IconPlay, onSelect: () => void actions.setPaused(m.id, false) }
      : { id: 'pause', label: t('ops.detail.pause'), icon: IconPause, onSelect: () => void actions.setPaused(m.id, true) },
    { id: 'run', label: t('ops.detail.run'), icon: IconPlay, disabled: m.paused, onSelect: () => void actions.run(m.id) },
    { id: 'move', label: t('ops.monitors.moveTo'), disabled: allGroups.length < 2, onSelect: () => setMoving(m) },
    { id: 'delete', label: t('ops.detail.delete'), icon: IconTrash, danger: true, onSelect: () => setDeleting(m) },
  ];
  const groupActions = (g: Group): MenuItem[] => [
    { id: 'rename', label: t('ops.monitors.groups.renameAction'), icon: IconEdit, onSelect: () => setNaming({ group: g }) },
    { id: 'delete', label: t('ops.monitors.groups.deleteAction'), icon: IconTrash, danger: true, onSelect: () => setDeletingGroup(g) },
  ];

  const header = editable && (
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
      <Button variant="secondary" onClick={() => setNaming({ group: null })}>
        <IconPlus />
        {t('ops.monitors.groups.new')}
      </Button>
      {/* On an empty install the onboarding tiles are the one invitation to add a monitor. */}
      {!empty && (
        <Button variant="primary" onClick={() => navigate({ name: 'new-monitor' })}>
          <IconPlus />
          {t('ops.monitors.add')}
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader title={t('ops.monitors.title')} description={empty ? undefined : t('ops.monitors.description')} actions={header || undefined} />
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
                onPause={(ids, paused) => void bulk(ids, paused ? 'pause' : 'resume')}
                onMove={(ids, target) => void bulk(ids, 'move', target)}
                onDelete={(ids) => void bulk(ids, 'delete')}
                onClear={() => setSelected(new Set())}
              />
              <GroupList
                groups={allGroups}
                monitors={allMonitors}
                canEdit={editable}
                selected={selected}
                onSelectionChange={setSelected}
                rowActions={rowActions}
                groupActions={groupActions}
                onOpenMonitor={(id) => navigate({ name: 'monitor', id })}
                onAcknowledgeMonitor={(id) => void acknowledgeMonitor(id)}
                onOpenTarget={(id) => void openTarget(id)}
              />
            </>
          )}
        </>
      )}
      {editable && (
        <>
          <GroupManager
            open={managing}
            groups={allGroups}
            monitors={listed}
            onSave={saveGroup}
            onRequestDelete={(g) => {
              setManaging(false);
              setDeletingGroup(g);
            }}
            onClose={() => setManaging(false)}
          />
          <GroupNameDialog open={naming !== null} group={naming?.group} groups={allGroups} onSave={saveGroup} onClose={() => setNaming(null)} />
          <DeleteGroupDialog group={deletingGroup} groups={allGroups} monitors={listed} onDelete={deleteGroup} onClose={() => setDeletingGroup(null)} />
          <MoveMonitorDialog monitor={moving} groups={allGroups} onMove={(id, groupId) => actions.move([id], groupId)} onClose={() => setMoving(null)} />
          <Dialog
            open={deleting !== null}
            onClose={() => setDeleting(null)}
            size="sm"
            initialFocus={cancelDelete}
            title={t('ops.detail.confirmTitle', { name: deleting ? safeText(deleting.name) : '' })}
            description={t('ops.detail.confirmBody')}
            footer={
              <>
                <Button ref={cancelDelete} variant="secondary" onClick={() => setDeleting(null)}>
                  {t('ops.detail.cancel')}
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (deleting && (await actions.remove(deleting.id))) setDeleting(null);
                  }}
                >
                  {t('ops.detail.confirm')}
                </Button>
              </>
            }
          />
        </>
      )}
    </>
  );
}
