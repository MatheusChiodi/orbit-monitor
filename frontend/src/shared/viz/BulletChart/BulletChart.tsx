import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { STATUS_COLOR } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import { toStatus, type ModeProps } from '../types';

/** Qualitative bands are neutral steps, strongest first; the value bar alone carries the state color. */
const BAND_OPACITY = [0.3, 0.2, 0.12, 0.07];

/** Mode 3: bullet chart (value vs target over qualitative bands). */
export function BulletChart({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const value = data.value ?? null;
  const bands = [...(data.bands ?? [])].sort((a, b) => (a.to ?? Infinity) - (b.to ?? Infinity));
  const numeric = typeof value === 'number' ? value : 0;
  const scaleMax = Math.max(numeric, data.target ?? 0, ...bands.map((b) => b.to ?? 0)) || 1;
  const pct = (n: number) => `${((Math.max(0, n) / scaleMax) * 100).toFixed(2)}%`;
  return (
    <VizFrame mode="bullet" level={level} label={data.label} status={data.status} empty={value === null} className={className}>
      <div className="flex items-baseline justify-between gap-[0.5rem]">
        <span className="font-mono text-[1.5rem] font-semibold tabular-nums">
          <FlashValue value={typeof value === 'number' ? value : null}>
            <SafeValue value={value} format={(v) => (typeof v === 'number' ? formatNumber(v, locale) : String(v))} />
          </FlashValue>
        </span>
        {data.unit && <span className="font-mono text-[0.78rem] text-muted">{safeText(data.unit)}</span>}
        {data.target !== undefined && (
          <span className="ml-auto font-mono text-[0.78rem] text-muted tabular-nums">
            {t('viz.bullet.target', { value: formatNumber(data.target, locale) })}
          </span>
        )}
      </div>
      <div
        role="meter"
        aria-label={safeText(data.label)}
        aria-valuemin={0}
        aria-valuemax={scaleMax}
        aria-valuenow={numeric}
        className="relative h-[1.4rem] overflow-hidden rounded-[0.3rem] bg-s2"
      >
        {bands.map((band, i) => {
          const start = i === 0 ? 0 : (bands[i - 1]!.to ?? 0);
          const end = band.to ?? scaleMax;
          return (
            <span
              key={`${start}-${end}`}
              data-testid="bullet-band"
              data-status={band.status ?? 'neutral'}
              className="absolute inset-y-0"
              style={{ left: pct(start), width: pct(end - start), background: 'var(--muted)', opacity: BAND_OPACITY[i] ?? 0.07 }}
            />
          );
        })}
        <span
          className={`absolute inset-y-[0.45rem] left-0 w-full origin-left rounded-r-[4px] ${markTransition(level)}`}
          style={{ transform: `scaleX(${Math.min(1, numeric / scaleMax)})`, background: STATUS_COLOR[toStatus(data.status)] }}
        />
        {data.target !== undefined && (
          <span aria-hidden className="absolute inset-y-[0.15rem] w-[2px] bg-text" style={{ left: pct(data.target) }} />
        )}
      </div>
    </VizFrame>
  );
}
