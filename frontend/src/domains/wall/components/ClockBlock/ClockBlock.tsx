import { useTranslation } from 'react-i18next';
import type { OnCallNow } from '@/domains/alerting/oncall/oncallApi';
import { formatClock, formatTime } from '@/shared/format';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Panel } from '@/shared/ui/Panel';

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
      <p className="m-0 font-mono text-2xl font-semibold tabular-nums">
        <time dateTime={now.toISOString()}>{formatClock(now)}</time>
      </p>
      <p className="m-0 text-sm text-muted">{now.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      {onCall && (
        <section aria-label={t('wall.blocks.onCall')} className="mt-2 flex flex-col gap-1">
          <span className="section-label">{t('wall.blocks.onCall')}</span>
          {onCall.length === 0 ? (
            <span className="text-base text-muted">{t('wall.blocks.nobodyOnCall')}</span>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-base">
              {onCall.map((entry) => (
                <li key={entry.scheduleId}>
                  <SafeValue value={entry.scheduleName} surface="wall" className="text-muted" />
                  <span aria-hidden>: </span>
                  <SafeValue value={entry.person} surface="wall" className="font-semibold" />
                  {entry.shiftEndsAt && (
                    <span className="ml-2 font-mono text-xs text-muted">
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
