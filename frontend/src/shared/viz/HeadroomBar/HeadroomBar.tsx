import { useTranslation } from 'react-i18next';
import { formatInteger, formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { TEXT_CLASS } from '@/shared/ui/tones';
import type { Status } from '@/shared/api/types';
import { STATUS_COLOR } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { headroomPct, ruleText, withUnit } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

/** Amber below 25% of headroom (docs/03-design.md, "Near threshold"). */
export const LOW_HEADROOM_PCT = 25;

function fillStatus(headroom: number): Status {
  if (headroom <= 0) return 'DOWN';
  return headroom < LOW_HEADROOM_PCT ? 'WARN' : 'OK';
}

/** Mode 4: headroom bar, distance to the threshold of a numeric rule. */
export function HeadroomBar({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const value = data.value ?? null;
  const headroom = typeof value === 'number' && data.rule ? headroomPct(value, data.rule) : null;
  const shown = headroom === null ? 0 : Math.round(Math.min(100, Math.max(0, headroom)));
  const fill = fillStatus(headroom ?? 0);
  return (
    <VizFrame mode="headroom-bar" level={level} label={data.label} status={data.status} empty={value === null} className={className}>
      <div className="flex items-center gap-[0.75rem]">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-[0.5rem] font-mono text-[0.85rem] tabular-nums">
            <FlashValue value={typeof value === 'number' ? value : null}>
              <SafeValue value={value} format={(v) => (typeof v === 'number' ? withUnit(formatNumber(v, locale), data.unit) : String(v))} />
            </FlashValue>
            {data.rule && <span className="truncate text-muted">{t('rule.text', { rule: ruleText(data.rule, locale) })}</span>}
          </div>
          <div
            role="meter"
            aria-label={safeText(data.label)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shown}
            className="mt-[0.4rem] h-[0.5rem] overflow-hidden rounded-full bg-s3"
          >
            <span
              data-fill={fill}
              className={`block h-full w-full origin-left rounded-full ${markTransition(level)}`}
              style={{ transform: `scaleX(${shown / 100})`, background: STATUS_COLOR[fill] }}
            />
          </div>
        </div>
        <span className={`font-mono text-[1.5rem] font-semibold tabular-nums ${TEXT_CLASS[fill]}`}>{`${formatInteger(shown, locale)}%`}</span>
      </div>
    </VizFrame>
  );
}
