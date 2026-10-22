import { useTranslation } from 'react-i18next';
import type { OnCallNow } from '@/domains/alerting/oncall/oncallApi';
import { formatClock, formatTime } from '@/shared/format';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Panel } from '@/shared/ui';

export interface ClockBlockProps {
  now: Date;
  /** BE-33: who is on call now; null while unknown (loading or offline). */
  onCall: readonly OnCallNow[] | null;
}

/** Wall clock block with "who is on call now" (BE-33). */
export function ClockBlock({ now, onCall }: ClockBlockProps) {
  const { t, i18n } = useTranslation();
  return (
    <Panel title={t('wall.blocks.clock')} className="h-full">
      <p className="m-0 font-mono text-[2.4rem] font-semibold tabular-nums">
        <time dateTime={now.toISOString()}>{formatClock(now)}</time>
      </p>
      <p className="m-0 text-[0.8rem] text-muted">{now.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      {onCall && (
        <section aria-label={t('wall.blocks.onCall')} className="mt-[0.6rem] flex flex-col gap-[0.25rem]">
          <span className="section-label">{t('wall.blocks.onCall')}</span>
          {onCall.length === 0 ? (
            <span className="text-[0.85rem] text-muted">{t('wall.blocks.nobodyOnCall')}</span>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-[0.2rem] p-0 text-[0.9rem]">
              {onCall.map((entry) => (
                <li key={entry.scheduleId}>
                  <SafeValue value={entry.scheduleName} surface="wall" className="text-muted" />
                  <span aria-hidden>: </span>
                  <SafeValue value={entry.person} surface="wall" className="font-semibold" />
                  {entry.shiftEndsAt && (
                    <span className="ml-[0.4rem] font-mono text-[0.75rem] text-muted">
                      {t('wall.blocks.onCallUntil', { time: formatTime(entry.shiftEndsAt) })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Panel>
  );
}
