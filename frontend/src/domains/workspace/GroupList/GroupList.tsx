import { useId, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import { groupSummary, sortExceptionsFirst } from '@/domains/monitor/status';
import type { Group, MonitorView } from '@/shared/api/types';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, Button, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface GroupListProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  onNewMonitor: () => void;
  canEdit?: boolean;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function GroupSection({ group, monitors }: { group: Group; monitors: MonitorView[] }) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const titleId = useId();
  const enter = useMotionPreset('enter');
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
      <header className="flex items-center justify-between border-b border-line px-[0.9rem] py-[0.6rem]">
        <h2 id={titleId} className="m-0 text-[1rem] font-semibold">
          <SafeValue value={group.name} />
        </h2>
        <span className="font-mono text-[0.8rem] text-muted">
          {status === 'OK' ? summary : `${summary} · ${t(`status.label.${status}`)}`}
        </span>
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
          {sortExceptionsFirst(monitors).map((m) => (
            <AnimatedItem
              as="tr"
              key={m.id}
              motionKind="reorder"
              data-status={m.status}
              className="border-b border-line last:border-0"
            >
              <td className="w-[7rem] px-[0.9rem] py-[0.5rem]">
                <span className="inline-flex items-center gap-[0.4rem]">
                  <StatusDot status={m.status} />
                  <span className={`text-[0.75rem] font-semibold ${TEXT_CLASS[m.status]}`}>{t(`status.label.${m.status}`)}</span>
                </span>
              </td>
              <td className="py-[0.5rem] font-medium">
                <SafeValue value={m.name} />
              </td>
              <td className="py-[0.5rem] font-mono text-[0.8rem] text-muted">{m.type}</td>
              <td className="py-[0.5rem] font-mono text-[0.8rem] text-muted">{m.rule ? ruleText(m.rule, locale) : '—'}</td>
              <td className="px-[0.9rem] py-[0.5rem] text-right font-mono">{formatReading(m.value, m.unit, locale)}</td>
            </AnimatedItem>
          ))}
          </AnimatePresence>
        </tbody>
      </table>
    </m.section>
  );
}

/** Console list of groups and monitors, with a text filter. */
export function GroupList({ groups, monitors, onNewMonitor, canEdit = true }: GroupListProps) {
  const { t } = useTranslation();
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
        <p className="text-muted">{t('console.monitors.empty')}</p>
      ) : (
        <AnimatePresence>
          {sections.map((s) => (
            <GroupSection key={s.group.id} group={s.group} monitors={s.monitors} />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
