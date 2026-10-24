import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { Group, MonitorView } from '@/shared/api/types';
import { formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem } from '@/shared/ui/AnimatedItem';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';
import { StatusDot } from '@/shared/ui/StatusPill';
import { TEXT_CLASS } from '@/shared/ui/tones';

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
        <p className="m-0 text-base text-muted">{t('wall.alsoActive.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <AnimatePresence>
          {monitors.slice(0, 5).map((m, index, shown) => (
            <AnimatedItem key={m.id} index={index} count={shown.length} className="flex items-center gap-2 rounded-sm bg-s2 px-2 py-2">
              <StatusDot status={m.status} />
              <span className={`text-xs font-semibold ${TEXT_CLASS[m.status]}`}>{t(`status.label.${m.status}`)}</span>
              <span className="min-w-0 flex-1">
                <SafeValue value={m.name} surface="wall" className="block truncate text-base font-semibold" />
                <SafeValue value={groupName.get(m.groupId)} surface="wall" className="block truncate text-xs text-muted" />
              </span>
              <span className="text-right">
                <FlashValue value={m.value} className="block font-mono text-base">
                  {formatReading(m.value, m.unit, locale)}
                </FlashValue>
                <span className="block font-mono text-xs text-dim">{formatElapsed(m.since, now, locale)}</span>
              </span>
            </AnimatedItem>
          ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
