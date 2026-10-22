import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GroupList } from '@/domains/workspace/GroupList';
import { GroupOrderEditor } from '@/domains/workspace/GroupOrderEditor';
import type { GroupOrder } from '@/shared/api/consoleEndpoints';
import { Button } from '@/shared/ui';
import { targetUrlOf } from '../MonitorDetailScreen';
import { LivingOrb } from '@/shared/fx/LivingOrb';
import { OrbitIntro } from '@/shared/fx/OrbitIntro';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { ScreenTitle } from '../ScreenStatus';

/** Orbit's own health check (BE-50, type `SELF`) is built in; only monitors the operator added count. */
const isConfiguredMonitor = (m: { type: string }) => m.type !== 'SELF';

/** Monitor list grouped by group, with the living orb (or the intro when empty). */
export function MonitorsScreen() {
  const { t } = useTranslation();
  const { editable, navigate, source, demo } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const [reordering, setReordering] = useState(false);
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [cardNotice, setCardNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // FE-55 card actions: acknowledge the monitor's open incident; open its URL (else the detail).
  async function acknowledgeMonitor(monitorId: string) {
    try {
      const [open] = (await source.listIncidents({ status: 'OPEN', monitorId })).filter((i) => !i.acknowledgedBy);
      if (!open) return setCardNotice({ ok: false, text: t('screens.monitor.noOpenIncident') });
      await source.acknowledgeIncidentRecord(open.id);
      setCardNotice({ ok: true, text: t('screens.monitor.acknowledged') });
      await queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
    } catch (error) {
      setCardNotice({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }
  }
  async function openTarget(monitorId: string) {
    const url = await source.getMonitor(monitorId).then((d) => targetUrlOf(d.definition), () => null);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else navigate({ name: 'monitor', id: monitorId });
  }

  // FE-13: one PUT /api/groups/order per drop; the lists refresh from the API afterwards.
  const save = useMutation({
    mutationFn: (order: GroupOrder) => source.saveGroupOrder(order),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['groups', demo] });
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
    },
  });
  const ordered = groupIds
    ? groupIds.flatMap((id) => (groups.data ?? []).filter((g) => g.id === id))
    : (groups.data ?? []);
  const monitorOrder = (): GroupOrder['monitors'] =>
    Object.fromEntries(ordered.map((g) => [g.id, (monitors.data ?? []).filter((m) => m.groupId === g.id).map((m) => m.id)]));

  return (
    <>
      <div className="flex flex-wrap items-center gap-[0.8rem]">
        <ScreenTitle>{t('console.monitors.title')}</ScreenTitle>
        {editable && (monitors.data ?? []).length > 0 && (
          <Button
            variant="ghost"
            aria-pressed={reordering}
            onClick={() => {
              setReordering((r) => !r);
              setSaved(false);
              setGroupIds(null);
            }}
          >
            {reordering ? t('screens.reorder.done') : t('screens.reorder.toggle')}
          </Button>
        )}
        {saved && <span role="status" className="text-[0.85rem] text-ok-text">{t('screens.reorder.saved')}</span>}
        {save.error && <span role="alert" className="text-[0.85rem] text-down-text">{save.error.message}</span>}
      </div>
      {cardNotice && (
        <p role={cardNotice.ok ? 'status' : 'alert'} className={`m-0 text-[0.85rem] ${cardNotice.ok ? 'text-ok-text' : 'text-warn-text'}`}>
          {cardNotice.text}
        </p>
      )}
      {(groups.isError || monitors.isError) && <p className="m-0 text-down-text">{t('console.monitors.loadError')}</p>}
      {groups.isPending || monitors.isPending ? (
        <p className="m-0 text-muted">{t('app.loading')}</p>
      ) : (
        <>
          {!(monitors.data ?? []).some(isConfiguredMonitor) ? (
            <div className="grid gap-[1rem] md:grid-cols-2">
              <OrbitIntro id="first-monitor" tilt />
              <OrbitIntro id="check-flow" tilt />
            </div>
          ) : (
            <LivingOrb
              interactive
              monitors={monitors.data ?? []}
              groups={groups.data ?? []}
              className="h-[19rem] w-full"
              onOpen={(id) => navigate({ name: 'monitor', id })}
            />
          )}
          {reordering ? (
            <GroupOrderEditor
              groups={ordered}
              monitors={monitors.data ?? []}
              onChange={(order) => save.mutate({ groupIds: ordered.map((g) => g.id), monitors: order })}
              onGroupsChange={(ids) => {
                setGroupIds(ids);
                save.mutate({ groupIds: ids, monitors: monitorOrder() });
              }}
            />
          ) : (
          <GroupList
            groups={groups.data ?? []}
            monitors={monitors.data ?? []}
            canEdit={editable}
            onNewMonitor={() => navigate({ name: 'new-monitor' })}
            onOpenMonitor={(id) => navigate({ name: 'monitor', id })}
            onAcknowledgeMonitor={(id) => void acknowledgeMonitor(id)}
            onOpenTarget={(id) => void openTarget(id)}
          />
          )}
        </>
      )}
    </>
  );
}
