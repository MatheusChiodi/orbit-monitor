import { useId, useState, type MouseEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { Group, MonitorView } from '@/shared/api/types';
import { CardIcon } from '@/shared/customization/CardIcon';
import { CustomizeHandle } from '@/shared/customization/CustomizeHandle';
import {
  formatCardValue,
  orderMonitors,
  useCardInteractions,
  useGroupCardSettings,
  useMonitorCardSettings,
} from '@/shared/customization/cards';
import { currentLocale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, Button, Checkbox, IconChevronRight, Menu, TextInput, type MenuItem } from '@/shared/ui';
import { MonitorStateBadge } from '../MonitorState';
import { ruleWords } from './ruleWords';

export interface GroupListProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  canEdit?: boolean;
  /** Row click and FE-55 `open-detail` card action. */
  onOpenMonitor?: (id: string) => void;
  /** FE-55 `acknowledge` card action (the monitor's open incident). */
  onAcknowledgeMonitor?: (id: string) => void;
  /** FE-55 `open-target` card action (the monitored URL, or the detail when there is none). */
  onOpenTarget?: (id: string) => void;
  /** Bulk selection (FE-31); the checkboxes show only when this is given and the client can edit. */
  selected?: ReadonlySet<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** "…" menu of each row (edit, pause, delete…); editors only. */
  rowActions?: (monitor: MonitorView) => readonly MenuItem[];
  /** "…" menu of each group header (rename, delete); not shown for "Ungrouped". */
  groupActions?: (group: Group) => readonly MenuItem[];
  /** @deprecated The screen header carries "Add monitor"; kept so older callers still type-check. */
  onNewMonitor?: () => void;
}

type CardHandlers = Pick<GroupListProps, 'onOpenMonitor' | 'onAcknowledgeMonitor' | 'onOpenTarget' | 'rowActions'>;

interface Selection {
  selected: ReadonlySet<string>;
  toggle: (ids: readonly string[], on: boolean) => void;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Orbit's own health check (type `SELF`) is built in; only the monitors people added are listed. */
const isListed = (m: MonitorView) => (m.type as string) !== 'SELF';

const ROW_PADDING = { compact: 'py-1.5', regular: 'py-2.5', detailed: 'py-3.5' } as const;

/** One width per column for every group, so the columns line up down the page. */
const COL = {
  select: 'w-10 pl-3',
  status: 'hidden w-28 px-3 sm:table-cell',
  name: 'px-3 sm:pl-0',
  kind: 'hidden w-28 pr-3 lg:table-cell',
  rule: 'hidden w-56 pr-3 md:table-cell',
  value: 'w-24 pr-2 text-right sm:w-32',
  menu: 'w-10 text-right',
  open: 'w-10 pr-3 text-right',
} as const;

function HeaderCell({ className, children }: { className: string; children: string }) {
  return (
    <th scope="col" className={`${className} p-0`}>
      <span className="sr-only">{children}</span>
    </th>
  );
}

/** Clicks on the row's own controls (checkbox, link, card button) do not also open the monitor. */
function fromControl(event: MouseEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest('a, button, input, label, [role="button"]') !== null;
}

/** One monitor row; content and behavior come from the FE-55 card settings. */
function MonitorRow({ monitor: m, selection, onOpenMonitor, onAcknowledgeMonitor, onOpenTarget, rowActions }: { monitor: MonitorView; selection: Selection | null } & CardHandlers) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const card = useMonitorCardSettings(m.id);
  const [expanded, setExpanded] = useState(false);
  const show = (field: (typeof card.fields)[number]) => card.fields.includes(field);
  const interactions = useCardInteractions(card, {
    'open-detail': onOpenMonitor ? () => onOpenMonitor(m.id) : undefined,
    acknowledge: onAcknowledgeMonitor ? () => onAcknowledgeMonitor(m.id) : undefined,
    'open-target': onOpenTarget ? () => onOpenTarget(m.id) : undefined,
    expand: card.expand === 'inline' ? () => setExpanded((e) => !e) : undefined,
  });
  const pad = ROW_PADDING[card.variant];
  const name = card.title || m.name;
  const kind = t(`ops.monitors.kinds.${m.type}`, { defaultValue: m.type });
  const rule = m.rule ? ruleWords(m.rule, t, locale) : t('ops.monitors.noRule');
  return (
    <>
      <AnimatedItem
        as="tr"
        id={`monitor-${m.id}`}
        motionKind="reorder"
        data-status={m.status}
        data-variant={card.variant}
        onClick={(event: MouseEvent<HTMLElement>) => {
          if (!fromControl(event)) onOpenMonitor?.(m.id);
        }}
        className={`border-b border-line last:border-0 ${onOpenMonitor ? 'cursor-pointer' : ''} ${card.hover === 'highlight' ? 'hover:bg-s2' : ''}`}
      >
        {selection && (
          <td className={`${COL.select} ${pad}`}>
            <Checkbox
              label={<span className="sr-only">{t('ops.monitors.select', { name: safeText(name) })}</span>}
              checked={selection.selected.has(m.id)}
              onChange={(e) => selection.toggle([m.id], e.target.checked)}
            />
          </td>
        )}
        <td className={`${COL.status} ${pad}`}>
          <MonitorStateBadge monitor={m} />
        </td>
        <td className={`${COL.name} ${pad} min-w-0`} data-customizable="card.monitor">
          <span
            {...interactions}
            aria-expanded={interactions.role && card.expand === 'inline' ? expanded : undefined}
            title={card.hover === 'tooltip' ? safeText(`${name} · ${formatReading(m.value, m.unit, locale)}`) : undefined}
            className={`block truncate font-medium ${interactions.role ? 'rounded-sm hover:underline focus-visible:underline' : ''}`}
          >
            <CardIcon icon={card.icon} />
            <SafeValue value={name} />
          </span>
          <CustomizeHandle type="card.monitor" targetId={m.id} label={safeText(name)} />
          {card.subtitle && (
            <span className="block truncate text-xs text-muted">
              <SafeValue value={card.subtitle} />
            </span>
          )}
          {/* Small screens: the status and kind move to a second line of the card. */}
          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted sm:hidden">
            <MonitorStateBadge monitor={m} size="sm" />
            {show('type') && <span>{kind}</span>}
          </span>
        </td>
        <td className={`${COL.kind} ${pad} text-sm text-muted`}>{show('type') ? kind : null}</td>
        <td className={`${COL.rule} ${pad} text-sm text-muted`}>
          {show('rule') ? (
            <span title={m.rule ? ruleText(m.rule, locale) : undefined} className="block truncate">
              {rule}
            </span>
          ) : null}
        </td>
        <td className={`${COL.value} ${pad} font-mono text-sm`}>
          {show('value') ? formatCardValue(m.value, card.unit || m.unit, locale, card.valueFormat) : null}
        </td>
        {rowActions && (
          <td className={`${COL.menu} ${pad}`}>
            <Menu label={t('ops.monitors.rowActions', { name: safeText(name) })} size="sm" items={rowActions(m)} />
          </td>
        )}
        <td className={`${COL.open} ${pad}`}>
          <a
            href={`#/monitors/${encodeURIComponent(m.id)}`}
            aria-label={t('ops.monitors.open', { name: safeText(name) })}
            className="inline-flex size-7 items-center justify-center rounded-sm text-dim hover:bg-s3 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <IconChevronRight />
          </a>
        </td>
      </AnimatedItem>
      {expanded && (
        <tr>
          <td colSpan={6 + (selection ? 1 : 0) + (rowActions ? 1 : 0)} className="px-3 pb-2.5">
            <div role="region" aria-label={t('customization.card.details', { name })} className="flex flex-wrap gap-4 text-sm text-muted">
              <span>{kind}</span>
              <span className="font-mono">{m.rule ? ruleText(m.rule, locale) : '—'}</span>
              <span className="font-mono">{formatReading(m.value, m.unit, locale)}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GroupSection({ group, monitors, selection, groupActions, ...handlers }: { group: Group; monitors: MonitorView[]; selection: Selection | null; groupActions?: GroupListProps['groupActions'] } & CardHandlers) {
  const { t } = useTranslation();
  const titleId = useId();
  const enter = useMotionPreset('enter');
  const settings = useGroupCardSettings(group.id);
  const ok = monitors.filter((m) => m.status === 'OK').length;
  const title = settings.title || group.name;
  const ids = monitors.map((m) => m.id);
  const allSelected = selection !== null && ids.length > 0 && ids.every((id) => selection.selected.has(id));
  return (
    <m.section
      initial={enter.initial}
      animate={enter.animate}
      exit={enter.exit}
      transition={enter.transition}
      data-motion-level={enter.level}
      aria-labelledby={titleId}
      data-surface="panel"
      className="overflow-hidden rounded-md border border-line bg-s1"
    >
      <header data-customizable="card.group" className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        {selection && (
          <Checkbox
            label={<span className="sr-only">{t('ops.monitors.selectGroup', { name: safeText(title) })}</span>}
            checked={allSelected}
            onChange={(e) => selection.toggle(ids, e.target.checked)}
          />
        )}
        <h2 id={titleId} className="m-0 min-w-0 flex-1 truncate text-md font-semibold">
          <SafeValue value={title} />
        </h2>
        <CustomizeHandle type="card.group" targetId={group.id} label={safeText(title)} />
        {settings.summary && <span className="shrink-0 font-mono text-xs text-muted">{t('ops.monitors.groupSummary', { ok, total: monitors.length })}</span>}
        {groupActions && group.id !== '' && <Menu label={t('ops.monitors.groupActions', { name: safeText(title) })} size="sm" items={groupActions(group)} />}
      </header>
      <table className="w-full table-fixed border-collapse text-base">
        {/* Zero-height header: names the columns for screen readers and fixes the widths (table-fixed reads the first row). */}
        <thead>
          <tr>
            {selection && <HeaderCell className={COL.select}>{t('ops.monitors.columns.select')}</HeaderCell>}
            <HeaderCell className={COL.status}>{t('ops.monitors.columns.status')}</HeaderCell>
            <HeaderCell className={COL.name}>{t('ops.monitors.columns.name')}</HeaderCell>
            <HeaderCell className={COL.kind}>{t('ops.monitors.columns.kind')}</HeaderCell>
            <HeaderCell className={COL.rule}>{t('ops.monitors.columns.rule')}</HeaderCell>
            <HeaderCell className={COL.value}>{t('ops.monitors.columns.value')}</HeaderCell>
            {handlers.rowActions && <HeaderCell className={COL.menu}>{t('ops.monitors.columns.actions')}</HeaderCell>}
            <HeaderCell className={COL.open}>{t('ops.monitors.columns.open')}</HeaderCell>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {orderMonitors(monitors, settings.order).map((m) => (
              <MonitorRow key={m.id} monitor={m} selection={selection} {...handlers} />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </m.section>
  );
}

/** Console list of groups and monitors: one grid for every group, a text filter and optional selection. */
export function GroupList({ groups, monitors, canEdit = true, selected, onSelectionChange, onNewMonitor: _legacy, rowActions, groupActions, ...handlers }: GroupListProps) {
  const { t } = useTranslation();
  const { emptyText } = useGroupCardSettings(null);
  const [query, setQuery] = useState('');
  const needle = normalize(query.trim());
  const listed = monitors.filter(isListed);
  const visible = needle ? listed.filter((m) => normalize(m.name).includes(needle)) : listed;
  const known = new Set(groups.map((g) => g.id));
  const ungrouped: Group = { id: '', name: t('ops.monitors.ungrouped') };
  const sections = [...groups, ungrouped]
    .map((group) => ({
      group,
      monitors: visible.filter((m) => (group.id === '' ? !known.has(m.groupId) : m.groupId === group.id)),
    }))
    .filter((s) => s.monitors.length > 0);

  const selection: Selection | null =
    canEdit && onSelectionChange
      ? {
          selected: selected ?? new Set(),
          toggle: (ids, on) => {
            const next = new Set(selected);
            ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
            onSelectionChange(next);
          },
        }
      : null;

  return (
    <div className="flex flex-col gap-4">
      {listed.length > 0 && (
        <TextInput
          type="search"
          aria-label={t('ops.monitors.filter')}
          placeholder={t('ops.monitors.filter')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      )}
      {sections.length === 0 ? (
        needle ? (
          <div className="flex flex-wrap items-center gap-3 text-base text-muted">
            <p className="m-0">{emptyText || t('ops.monitors.noMatch', { query: query.trim() })}</p>
            <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
              {t('ops.monitors.clearFilter')}
            </Button>
          </div>
        ) : (
          emptyText && <p className="m-0 text-base text-muted">{emptyText}</p>
        )
      ) : (
        <AnimatePresence>
          {sections.map((s) => (
            <GroupSection key={s.group.id || 'ungrouped'} group={s.group} monitors={s.monitors} selection={selection} rowActions={canEdit ? rowActions : undefined} groupActions={canEdit ? groupActions : undefined} {...handlers} />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
