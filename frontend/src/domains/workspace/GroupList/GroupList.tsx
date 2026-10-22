import { useId, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import { groupSummary } from '@/domains/monitor/status';
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
import { AnimatedItem, Button, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface GroupListProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  onNewMonitor: () => void;
  canEdit?: boolean;
  /** FE-55 `open-detail` card action. */
  onOpenMonitor?: (id: string) => void;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const ROW_PADDING = { compact: 'py-[0.25rem]', regular: 'py-[0.5rem]', detailed: 'py-[0.7rem]' } as const;

/** One monitor row; content and behavior come from the FE-55 card settings. */
function MonitorRow({ monitor: m, onOpenMonitor }: { monitor: MonitorView; onOpenMonitor?: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const card = useMonitorCardSettings(m.id);
  const [expanded, setExpanded] = useState(false);
  const show = (field: (typeof card.fields)[number]) => card.fields.includes(field);
  const interactions = useCardInteractions(card, {
    'open-detail': onOpenMonitor ? () => onOpenMonitor(m.id) : undefined,
    expand: card.expand === 'inline' ? () => setExpanded((e) => !e) : undefined,
  });
  const pad = ROW_PADDING[card.variant];
  const name = card.title || m.name;
  return (
    <>
      <AnimatedItem as="tr" id={`monitor-${m.id}`} motionKind="reorder" data-status={m.status} data-variant={card.variant} className={`border-b border-line last:border-0 ${card.hover === 'highlight' ? 'hover:bg-s2/60' : ''}`}>
        <td className={`w-[7rem] px-[0.9rem] ${pad}`}>
          <span className="inline-flex items-center gap-[0.4rem]">
            <StatusDot status={m.status} />
            <span className={`text-[0.75rem] font-semibold ${TEXT_CLASS[m.status]}`}>{t(`status.label.${m.status}`)}</span>
          </span>
        </td>
        <td className={`${pad} font-medium`} data-customizable="card.monitor">
          <span {...interactions} aria-expanded={interactions.role && card.expand === 'inline' ? expanded : undefined} title={card.hover === 'tooltip' ? safeText(`${name} · ${formatReading(m.value, m.unit, locale)}`) : undefined} className={interactions.role ? 'cursor-pointer rounded-[0.3rem] hover:underline focus-visible:underline' : undefined}>
            <CardIcon icon={card.icon} />
            <SafeValue value={name} />
          </span>
          <CustomizeHandle type="card.monitor" targetId={m.id} label={safeText(name)} />
          {card.subtitle && (
            <span className="block text-[0.75rem] font-normal text-muted">
              <SafeValue value={card.subtitle} />
            </span>
          )}
        </td>
        <td className={`${pad} font-mono text-[0.8rem] text-muted`}>{show('type') ? m.type : null}</td>
        <td className={`${pad} font-mono text-[0.8rem] text-muted`}>{show('rule') ? (m.rule ? ruleText(m.rule, locale) : '—') : null}</td>
        <td className={`px-[0.9rem] ${pad} text-right font-mono`}>{show('value') ? formatCardValue(m.value, card.unit || m.unit, locale, card.valueFormat) : null}</td>
      </AnimatedItem>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-[0.9rem] pb-[0.6rem]">
            <div role="region" aria-label={t('customization.card.details', { name })} className="flex flex-wrap gap-[1rem] text-[0.8rem] text-muted">
              <span className="font-mono">{m.type}</span>
              <span className="font-mono">{m.rule ? ruleText(m.rule, locale) : '—'}</span>
              <span className="font-mono">{formatReading(m.value, m.unit, locale)}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GroupSection({ group, monitors, onOpenMonitor }: { group: Group; monitors: MonitorView[]; onOpenMonitor?: (id: string) => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  const enter = useMotionPreset('enter');
  const settings = useGroupCardSettings(group.id);
  const { ok, total, status } = groupSummary(monitors);
  const summary = t('status.groupSummary', { ok, total });
  return (
    <m.section
      initial={enter.initial}
      animate={enter.animate}
      exit={enter.exit}
      transition={enter.transition}
      data-motion-level={enter.level}
      aria-labelledby={titleId}
      className="rounded-[0.9rem] border border-line bg-s1"
    >
      <header data-customizable="card.group" className="flex items-center justify-between border-b border-line px-[0.9rem] py-[0.6rem]">
        <h2 id={titleId} className="m-0 text-[1rem] font-semibold">
          <SafeValue value={settings.title || group.name} />
        </h2>
        <CustomizeHandle type="card.group" targetId={group.id} label={safeText(settings.title || group.name)} />
        {settings.summary && (
          <span className="font-mono text-[0.8rem] text-muted">
            {status === 'OK' ? summary : `${summary} · ${t(`status.label.${status}`)}`}
          </span>
        )}
      </header>
      <table className="w-full border-collapse text-[0.9rem]">
        <thead className="sr-only">
          <tr>
            <th>{t('console.monitors.columns.state')}</th>
            <th>{t('console.monitors.columns.monitor')}</th>
            <th>{t('console.monitors.columns.type')}</th>
            <th>{t('console.monitors.columns.rule')}</th>
            <th>{t('console.monitors.columns.value')}</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
          {orderMonitors(monitors, settings.order).map((m) => (
            <MonitorRow key={m.id} monitor={m} onOpenMonitor={onOpenMonitor} />
          ))}
          </AnimatePresence>
        </tbody>
      </table>
    </m.section>
  );
}

/** Console list of groups and monitors, with a text filter. */
export function GroupList({ groups, monitors, onNewMonitor, canEdit = true, onOpenMonitor }: GroupListProps) {
  const { t } = useTranslation();
  const { emptyText } = useGroupCardSettings(null);
  const [query, setQuery] = useState('');
  const needle = normalize(query.trim());
  const visible = needle ? monitors.filter((m) => normalize(m.name).includes(needle)) : monitors;
  const sections = groups
    .map((group) => ({ group, monitors: visible.filter((m) => m.groupId === group.id) }))
    .filter((s) => s.monitors.length > 0);

  return (
    <div className="flex flex-col gap-[1rem]">
      <div className="flex flex-wrap items-center gap-[0.8rem]">
        <input
          type="search"
          aria-label={t('console.monitors.filter')}
          placeholder={t('console.monitors.filter')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-[2.2rem] min-w-[14rem] flex-1 rounded-[0.45rem] border border-line-2 bg-s2 px-[0.7rem] text-text placeholder:text-dim focus:border-info focus:outline-none"
        />
        {canEdit && (
          <Button variant="primary" onClick={onNewMonitor}>
            {t('console.monitors.new')}
          </Button>
        )}
      </div>
      {sections.length === 0 ? (
        <p className="text-muted">{emptyText || t('console.monitors.empty')}</p>
      ) : (
        <AnimatePresence>
          {sections.map((s) => (
            <GroupSection key={s.group.id} group={s.group} monitors={s.monitors} onOpenMonitor={onOpenMonitor} />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
