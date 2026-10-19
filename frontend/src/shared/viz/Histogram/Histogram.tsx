import { useTranslation } from 'react-i18next';
import { useLocale } from '@/shared/i18n/useLocale';
import { safeText } from '@/shared/privacy';
import { VizFrame } from '../core/VizFrame';
import { formatAmount, percentile } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

export interface Bucket {
  from: number;
  to: number;
  count: number;
}

const MAX_BUCKETS = 12;

/** Equal-width buckets; about √n of them (2–12). */
export function histogramBuckets(samples: readonly number[]): Bucket[] {
  if (samples.length === 0) return [];
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const count = Math.min(MAX_BUCKETS, Math.max(2, Math.ceil(Math.sqrt(samples.length))));
  const width = (max - min) / count || 1;
  const buckets = Array.from({ length: count }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width, count: 0 }));
  for (const s of samples) {
    const index = Math.min(count - 1, Math.floor((s - min) / width));
    buckets[index]!.count += 1;
  }
  return buckets;
}

/** Mode 19: histogram (latency distribution) with the p95 marked. */
export function Histogram({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const samples = (data.samples ?? []).filter((s) => Number.isFinite(s));
  const buckets = histogramBuckets(samples);
  const tallest = Math.max(1, ...buckets.map((b) => b.count));
  const p95 = percentile(samples, 95);
  const p95Text = p95 === null ? '' : t('viz.histogram.p95', { value: formatAmount(p95, locale, data.unit) });
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const p95Left = p95 !== null && first && last ? ((p95 - first.from) / Math.max(1e-9, last.to - first.from)) * 100 : 0;
  return (
    <VizFrame mode="histogram" level={level} label={data.label} status={data.status} empty={samples.length === 0} className={className}>
      <span className="font-mono text-[0.85rem] font-semibold tabular-nums">{p95Text}</span>
      <div role="img" aria-label={`${safeText(data.label)}: ${p95Text}`} className="relative flex h-[6rem] items-end gap-[2px]">
        {buckets.map((b) => (
          <span
            key={b.from}
            data-testid="histogram-bucket"
            title={`${formatAmount(b.from, locale, data.unit, 0)}–${formatAmount(b.to, locale, data.unit, 0)}: ${b.count}`}
            className={`block h-full flex-1 origin-bottom rounded-t-[4px] bg-info ${markTransition(level)}`}
            style={{ transform: `scaleY(${b.count / tallest})` }}
          />
        ))}
        {p95 !== null && <span aria-hidden className="absolute inset-y-0 w-px border-l border-dashed border-text/60" style={{ left: `${p95Left}%` }} />}
      </div>
      <div className="flex justify-between font-mono text-[0.62rem] text-dim tabular-nums">
        <span>{first ? formatAmount(first.from, locale, data.unit, 0) : ''}</span>
        <span>{last ? formatAmount(last.to, locale, data.unit, 0) : ''}</span>
      </div>
    </VizFrame>
  );
}
