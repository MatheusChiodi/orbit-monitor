import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { safeText } from '@/shared/privacy';
import { DEFAULT_HISTORY_HOURS } from '../compatibility';
import { STATUS_COLOR } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { formatAmount } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import { isStatus, type ModeProps } from '../types';

/** Mode 14: uptime ribbon, up/down history as colored segments, each named with its time and state. */
export function UptimeRibbon({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const segments = data.segments ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  return (
    <VizFrame
      mode="uptime-ribbon"
      level={level}
      label={data.label}
      status={data.status}
      empty={segments.length === 0}
      historyHours={data.historyHours ?? DEFAULT_HISTORY_HOURS}
      className={className}
    >
      {typeof data.uptime === 'number' && (
        <span className="font-mono text-[1.15rem] font-semibold tabular-nums">{t('viz.ribbon.uptime', { pct: formatAmount(data.uptime, locale, '%') })}</span>
      )}
      <div className="flex h-[1.1rem] gap-[2px]">
        {segments.map((s, i) => {
          const duration = Math.max(1, Date.parse(s.to) - Date.parse(s.from));
          const status = isStatus(s.status) ? s.status : null;
          const name = t('viz.ribbon.segment', {
            from: formatTime(s.from),
            to: formatTime(s.to),
            status: status ? t(`status.label.${status}`) : safeText(s.status),
          });
          return (
            <span
              key={`${i}-${s.from}`}
              role="img"
              aria-label={name}
              title={name}
              data-status={status ?? 'neutral'}
              className={`h-full rounded-[2px] ${markTransition(level)}`}
              style={{ flexGrow: duration, flexBasis: 0, background: STATUS_COLOR[status ?? 'neutral'] }}
            />
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[0.62rem] text-dim tabular-nums">
        <span>{first ? formatTime(first.from) : ''}</span>
        <span>{last ? formatTime(last.to) : ''}</span>
      </div>
    </VizFrame>
  );
}
