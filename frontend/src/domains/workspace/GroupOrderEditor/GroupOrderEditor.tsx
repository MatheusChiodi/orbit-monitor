import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, Button, StatusDot } from '@/shared/ui';
import { moveBetweenGroups, moveItem, type GroupOrder } from '../reorder/reorder';

export interface GroupOrderEditorProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  /** Called with the full order (group id → monitor ids) when a move is dropped. */
  onChange: (order: GroupOrder) => void;
  editable?: boolean;
  /** Group order changes (move up/down); the parent re-renders `groups` in the new order. */
  onGroupsChange?: (groupIds: string[]) => void;
}

function initialOrder(groups: readonly Group[], monitors: readonly MonitorView[]): GroupOrder {
  return Object.fromEntries(groups.map((g) => [g.id, monitors.filter((m) => m.groupId === g.id).map((m) => m.id)]));
}

interface Grab {
  monitorId: string;
  before: GroupOrder;
}

/**
 * FE-13: monitors as sortable lists per group. Keyboard: Space grabs/drops, ArrowUp/Down move inside the
 * group, ArrowLeft/Right move to the previous/next group, Escape cancels; every move is announced.
 */
export function GroupOrderEditor({ groups, monitors, onChange, editable = true, onGroupsChange }: GroupOrderEditorProps) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<GroupOrder>(() => initialOrder(groups, monitors));
  const [grab, setGrab] = useState<Grab | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const focusId = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const byId = new Map(monitors.map((m) => [m.id, m]));

  useEffect(() => {
    setOrder(initialOrder(groups, monitors));
  }, [groups, monitors]);

  useEffect(() => {
    if (!focusId.current) return;
    const id = focusId.current;
    const group = Object.keys(order).find((g) => order[g]?.includes(id));
    // Query inside the current group: the old copy may still be leaving through AnimatePresence.
    root.current
      ?.querySelector<HTMLElement>(`[data-group="${CSS.escape(group ?? '')}"] [data-monitor-id="${CSS.escape(id)}"]`)
      ?.focus();
  });

  const name = (id: string) => safeText(byId.get(id)?.name ?? id);

  function groupOf(current: GroupOrder, id: string): string | undefined {
    return Object.keys(current).find((g) => current[g]?.includes(id));
  }

  function announceMove(next: GroupOrder, id: string) {
    const group = groupOf(next, id);
    const list = group ? next[group] ?? [] : [];
    setAnnouncement(t('layout.dnd.position', { name: name(id), position: list.indexOf(id) + 1, total: list.length }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    if (!editable) return;
    const group = groupOf(order, id);
    if (!group) return;
    const list = order[group] ?? [];
    const index = list.indexOf(id);
    if (event.key === ' ') {
      event.preventDefault();
      if (!grab) {
        setGrab({ monitorId: id, before: order });
        setAnnouncement(t('layout.dnd.grabbed', { name: name(id), x: 1, y: index + 1 }));
      } else {
        setGrab(null);
        onChange(order);
      }
      return;
    }
    if (event.key === 'Escape' && grab) {
      event.preventDefault();
      setOrder(grab.before);
      setGrab(null);
      setAnnouncement(t('layout.dnd.cancelled'));
      return;
    }
    if (!grab || grab.monitorId !== id) return;
    const ids = groups.map((g) => g.id);
    let next: GroupOrder | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      next = { ...order, [group]: moveItem(list, index, index + (event.key === 'ArrowDown' ? 1 : -1)) };
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const target = ids[ids.indexOf(group) + (event.key === 'ArrowRight' ? 1 : -1)];
      if (target) next = moveBetweenGroups(order, { monitorId: id, from: group, to: target, index });
    }
    if (next) {
      event.preventDefault();
      focusId.current = id;
      setOrder(next);
      announceMove(next, id);
    }
  }

  function moveGroup(index: number, delta: number) {
    const ids = groups.map((g) => g.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    onGroupsChange?.(ids);
    setAnnouncement(t('layout.dnd.position', { name: safeText(groups[index]!.name), position: index + delta + 1, total: ids.length }));
  }

  return (
    <div ref={root} className="flex flex-col gap-[0.8rem]">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {groups.map((group, index) => (
        <AnimatedItem as="div" motionKind="reorder" key={group.id} className="rounded-[0.6rem] border border-line bg-s1 p-[0.6rem]">
          <div className="mb-[0.4rem] flex items-center gap-[0.4rem]">
            <h3 className="section-label m-0 flex-1">
              <SafeValue value={group.name} />
            </h3>
            {editable && onGroupsChange && (
              <>
                <Button variant="ghost" aria-label={t('screens.reorder.up', { name: safeText(group.name) })} disabled={index === 0} onClick={() => moveGroup(index, -1)}>
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  aria-label={t('screens.reorder.down', { name: safeText(group.name) })}
                  disabled={index === groups.length - 1}
                  onClick={() => moveGroup(index, 1)}
                >
                  ↓
                </Button>
              </>
            )}
          </div>
          <ul
            role="listbox"
            data-group={group.id}
            aria-label={safeText(group.name)}
            aria-readonly={editable ? undefined : 'true'}
            className="m-0 flex list-none flex-col gap-[0.3rem] p-0"
          >
            <AnimatePresence initial={false}>
              {(order[group.id] ?? []).map((id) => {
                const monitor = byId.get(id);
                if (!monitor) return null;
                const grabbed = grab?.monitorId === id;
                return (
                  <AnimatedItem
                    key={id}
                    motionKind="reorder"
                    role="option"
                    aria-selected={grabbed}
                    tabIndex={0}
                    data-monitor-id={id}
                    onKeyDown={(e) => onKeyDown(e, id)}
                    className={`flex items-center gap-[0.5rem] rounded-[0.4rem] border px-[0.5rem] py-[0.35rem] text-[0.85rem] ${grabbed ? 'scale-[1.02] border-info' : 'border-line'}`}
                  >
                    <StatusDot status={monitor.status} />
                    <SafeValue value={monitor.name} />
                  </AnimatedItem>
                );
              })}
            </AnimatePresence>
          </ul>
        </AnimatedItem>
      ))}
    </div>
  );
}
