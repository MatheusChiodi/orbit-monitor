import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { Group, MonitorView } from '@/shared/api/types';
import { formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, FlashValue, Panel, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface AlsoActiveProps {
  monitors: readonly MonitorView[];
  groups: readonly Group[];
  now: Date;
}

/** Short list of the other problems, below the hero. */
export function AlsoActive({ monitors, groups, now }: AlsoActiveProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  return (
    <Panel title={t('wall.alsoActive.title')}>
      {monitors.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">{t('wall.alsoActive.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[0.45rem] p-0">
          <AnimatePresence>
          {monitors.slice(0, 5).map((m, index, shown) => (
            <AnimatedItem key={m.id} index={index} count={shown.length} className="flex items-center gap-[0.55rem] rounded-[0.45rem] bg-s2 px-[0.6rem] py-[0.45rem]">
              <StatusDot status={m.status} />
              <span className={`text-[0.68rem] font-semibold ${TEXT_CLASS[m.status]}`}>{t(`status.label.${m.status}`)}</span>
              <span className="min-w-0 flex-1">
                <SafeValue value={m.name} surface="wall" className="block truncate text-[0.88rem] font-semibold" />
                <SafeValue value={groupName.get(m.groupId)} surface="wall" className="block truncate text-[0.72rem] text-muted" />
              </span>
              <span className="text-right">
                <FlashValue value={m.value} className="block font-mono text-[0.85rem]">
                  {formatReading(m.value, m.unit, locale)}
                </FlashValue>
                <span className="block font-mono text-[0.68rem] text-dim">{formatElapsed(m.since, now, locale)}</span>
              </span>
            </AnimatedItem>
          ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
