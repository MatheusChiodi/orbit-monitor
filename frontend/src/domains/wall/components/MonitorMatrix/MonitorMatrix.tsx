import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import { currentLocale } from '@/shared/i18n/i18n';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, FlashValue, Panel, SOFT_CLASS, StatusDot, TEXT_CLASS } from '@/shared/ui';
import type { GroupRow } from '../../selectors';

export interface MonitorMatrixProps {
  rows: readonly GroupRow[];
  /** Down monitors without an owner blink softly. */
  unownedMonitorIds: ReadonlySet<string>;
}

export function MonitorMatrix({ rows, unownedMonitorIds }: MonitorMatrixProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const colors = useAnimationLevel() === 'off' ? 'transition-none' : 'transition-colors duration-[400ms]';
  return (
    <Panel title={t('wall.matrix.title')} className="h-full">
      <div className="flex min-h-0 flex-col gap-[0.55rem] overflow-hidden">
        {rows.map((row) => {
          const { ok, total, status } = row.summary;
          const summary = t('status.groupSummary', { ok, total });
          return (
            <div
              key={row.group.id}
              role="group"
              aria-label={safeText(row.group.name, undefined, { surface: 'wall' })}
              className="grid grid-cols-1 gap-[0.45rem] md:grid-cols-[6.8rem_1fr]"
            >
              <div className="flex flex-col justify-center">
                <SafeValue value={row.group.name} surface="wall" className="truncate text-[0.88rem] font-semibold" />
                <span className={`font-mono text-[0.68rem] ${status === 'OK' ? 'text-muted' : TEXT_CLASS[status]}`}>
                  {status === 'OK' ? summary : `${summary} · ${t(`status.label.${status}`)}`}
                </span>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-[0.4rem] p-0 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                {row.monitors.map((m, index) => {
                  const blink = m.status === 'DOWN' && unownedMonitorIds.has(m.id);
                  const surface = m.status === 'OK' ? 'bg-s2 border-line' : SOFT_CLASS[m.status];
                  return (
                    <AnimatedItem
                      key={m.id}
                      motionKind="reorder"
                      index={index}
                      count={row.monitors.length}
                      data-status={m.status}
                      className={`flex min-w-0 items-center gap-[0.45rem] rounded-[0.45rem] border px-[0.55rem] py-[0.35rem] ${colors} ${surface} ${blink ? 'anim-blink' : ''}`}
                    >
                      <StatusDot status={m.status} />
                      <span
                        className="min-w-0 flex-1 truncate text-[0.78rem]"
                        title={safeText(m.name, undefined, { surface: 'wall' })}
                      >
                        <SafeValue value={m.name} surface="wall" />
                      </span>
                      <FlashValue value={m.value} className="shrink-0 font-mono text-[0.72rem] text-muted">
                        {formatReading(m.value, m.unit, locale)}
                      </FlashValue>
                    </AnimatedItem>
                  );
                })}
                </AnimatePresence>
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
