import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import { currentLocale } from '@/shared/i18n/i18n';
import { layoutTransition } from '@/shared/motion';
import { Panel, SOFT_CLASS, StatusDot, TEXT_CLASS } from '@/shared/ui';
import type { GroupRow } from '../../selectors';

export interface MonitorMatrixProps {
  rows: readonly GroupRow[];
  /** Down monitors without an owner blink softly. */
  unownedMonitorIds: ReadonlySet<string>;
}

export function MonitorMatrix({ rows, unownedMonitorIds }: MonitorMatrixProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
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
              aria-label={row.group.name}
              className="grid grid-cols-1 gap-[0.45rem] md:grid-cols-[6.8rem_1fr]"
            >
              <div className="flex flex-col justify-center">
                <span className="truncate text-[0.88rem] font-semibold">{row.group.name}</span>
                <span className={`font-mono text-[0.68rem] ${status === 'OK' ? 'text-muted' : TEXT_CLASS[status]}`}>
                  {status === 'OK' ? summary : `${summary} · ${t(`status.label.${status}`)}`}
                </span>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-[0.4rem] p-0 sm:grid-cols-2 xl:grid-cols-3">
                {row.monitors.map((m) => {
                  const blink = m.status === 'DOWN' && unownedMonitorIds.has(m.id);
                  const surface = m.status === 'OK' ? 'bg-s2 border-line' : SOFT_CLASS[m.status];
                  return (
                    <motion.li
                      key={m.id}
                      layout="position"
                      transition={layoutTransition}
                      data-status={m.status}
                      className={`flex min-w-0 items-center gap-[0.45rem] rounded-[0.45rem] border px-[0.55rem] py-[0.35rem] transition-colors duration-[400ms] ${surface} ${blink ? 'anim-blink' : ''}`}
                    >
                      <StatusDot status={m.status} />
                      <span className="min-w-0 flex-1 truncate text-[0.78rem]" title={m.name}>
                        {m.name}
                      </span>
                      <span className="shrink-0 font-mono text-[0.72rem] text-muted">
                        {formatReading(m.value, m.unit, locale)}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
