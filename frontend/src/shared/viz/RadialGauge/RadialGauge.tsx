import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { STATUS_COLOR } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { withUnit } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import { toStatus, type ModeProps } from '../types';

const SWEEP = 240;
const R = 42;
const ARC_LENGTH = (2 * Math.PI * R * SWEEP) / 360;

/** Point on the gauge circle; 0° is the start of the sweep (bottom-left). */
function polar(deg: number): [number, number] {
  const rad = ((deg - 90 - SWEEP / 2) * Math.PI) / 180;
  return [50 + R * Math.cos(rad), 50 + R * Math.sin(rad)];
}

const [sx, sy] = polar(0);
const [ex, ey] = polar(SWEEP);
const TRACK = `M${sx.toFixed(2)},${sy.toFixed(2)} A${R},${R} 0 1 1 ${ex.toFixed(2)},${ey.toFixed(2)}`;

/** Mode 2: radial gauge (value between min and max). Out-of-range values clamp the arc but print as they are. */
export function RadialGauge({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const min = data.min ?? 0;
  const max = data.max ?? 100;
  const value = data.value ?? null;
  const numeric = typeof value === 'number';
  const clamped = numeric ? Math.min(max, Math.max(min, value)) : min;
  const fraction = max > min ? (clamped - min) / (max - min) : 0;
  const format = (v: number) => withUnit(formatNumber(v, locale), data.unit);
  const text = numeric ? format(value) : safeText(value);
  return (
    <VizFrame mode="radial-gauge" level={level} label={data.label} status={data.status} empty={value === null} className={className}>
      <div
        role="meter"
        aria-label={safeText(data.label)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={text}
        className="relative mx-auto aspect-square w-full max-w-[11rem]"
      >
        <svg viewBox="0 0 100 100" aria-hidden className="block size-full">
          <path d={TRACK} fill="none" stroke="var(--s3)" strokeWidth={8} strokeLinecap="round" />
          <path
            d={TRACK}
            fill="none"
            stroke={STATUS_COLOR[toStatus(data.status)]}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${(fraction * ARC_LENGTH).toFixed(2)} ${ARC_LENGTH.toFixed(2)}`}
            className={markTransition(level)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <FlashValue value={numeric ? value : null} className="font-mono text-[1.4rem] font-semibold tabular-nums">
            <SafeValue value={value} format={(v) => (typeof v === 'number' ? format(v) : String(v))} />
          </FlashValue>
        </div>
      </div>
      <div className="flex justify-between font-mono text-[0.68rem] text-muted tabular-nums">
        <span>{t('viz.gauge.min', { value: formatNumber(min, locale) })}</span>
        <span>{t('viz.gauge.max', { value: formatNumber(max, locale) })}</span>
      </div>
    </VizFrame>
  );
}
