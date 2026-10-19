import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Sparkline } from '@/shared/ui/Sparkline';
import { VizFrame } from '../core/VizFrame';
import { useVizLevel } from '../core/useVizLevel';
import { toStatus, type ModeProps } from '../types';

type Trend = 'up' | 'down' | 'flat';

function trendOf(value: unknown, previous: number | null | undefined): Trend | null {
  if (typeof value !== 'number' || typeof previous !== 'number') return null;
  if (value === previous) return 'flat';
  return value > previous ? 'up' : 'down';
}

const ARROW: Record<Trend, string> = { up: '↑', down: '↓', flat: '→' };

/** Mode 1: big number + trend arrow + sparkline (single numeric value). */
export function BigNumber({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const value = data.value ?? null;
  const trend = trendOf(value, data.previous);
  const series = data.series ?? [];
  const status = toStatus(data.status);
  return (
    <VizFrame mode="big-number" level={level} label={data.label} status={data.status} empty={value === null} className={className}>
      <div className="flex items-baseline gap-[0.5rem]">
        <FlashValue value={typeof value === 'number' ? value : null} className="font-mono text-[2rem] font-semibold leading-none tabular-nums">
          <SafeValue value={value} format={(v) => (typeof v === 'number' ? formatNumber(v, locale) : String(v))} />
        </FlashValue>
        {data.unit && <span className="font-mono text-[0.85rem] text-muted">{safeText(data.unit)}</span>}
        {trend && (
          <span className="ml-auto inline-flex items-center gap-[0.25rem] text-[0.78rem] text-muted">
            <span aria-hidden>{ARROW[trend]}</span>
            <span>{t(`viz.trend.${trend}`)}</span>
          </span>
        )}
      </div>
      {series.length > 1 && <Sparkline values={series} status={status} label={t('viz.chart.label', { label: safeText(data.label), current: safeText(value) })} />}
    </VizFrame>
  );
}
