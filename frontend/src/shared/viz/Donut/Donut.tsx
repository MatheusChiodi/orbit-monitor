import { useTranslation } from 'react-i18next';
import { formatPercent } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { MAX_DONUT_SLICES } from '../compatibility';
import { categorical } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

interface Slice {
  name: string;
  value: number;
  other?: boolean;
}

/** At most 6 slices: the 5 largest plus "Other". */
export function donutSlices(categories: readonly { name: string; value?: number }[]): Slice[] {
  const slices = categories
    .filter((c) => typeof c.value === 'number' && c.value > 0)
    .map((c) => ({ name: c.name, value: c.value as number }))
    .sort((a, b) => b.value - a.value);
  if (slices.length <= MAX_DONUT_SLICES) return slices;
  const kept = slices.slice(0, MAX_DONUT_SLICES - 1);
  const rest = slices.slice(MAX_DONUT_SLICES - 1).reduce((sum, s) => sum + s.value, 0);
  return [...kept, { name: '', value: rest, other: true }];
}

const R = 38;
const C = 2 * Math.PI * R;
/** Surface gap between slices, in circumference units. */
const GAP = 1.6;

/** Mode 11: donut, share of a whole. */
export function Donut({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const slices = donutSlices(data.categories ?? []);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const name = (s: Slice) => (s.other ? t('viz.donut.other') : safeText(s.name));
  const share = (s: Slice) => formatPercent(total ? Math.round((s.value / total) * 100) : 0, 0, locale);
  let offset = 0;
  return (
    <VizFrame mode="donut" level={level} label={data.label} status={data.status} empty={slices.length === 0} className={className}>
      <div className="flex items-center gap-[1rem]">
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={`${safeText(data.label)}: ${slices.map((s) => `${name(s)} ${share(s)}`).join(', ')}`}
          className="size-[6.5rem] shrink-0 -rotate-90"
        >
          <circle cx={50} cy={50} r={R} fill="none" stroke="var(--s3)" strokeWidth={14} />
          {slices.map((s, i) => {
            const length = total ? (s.value / total) * C : 0;
            const dash = Math.max(0, length - (slices.length > 1 ? GAP : 0));
            const circle = (
              <circle
                key={`${i}-${s.name}`}
                cx={50}
                cy={50}
                r={R}
                fill="none"
                stroke={s.other ? 'var(--muted)' : categorical(i)}
                strokeWidth={14}
                strokeDasharray={`${dash.toFixed(2)} ${(C - dash).toFixed(2)}`}
                strokeDashoffset={(-offset).toFixed(2)}
                className={markTransition(level)}
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-[0.3rem] p-0 text-[0.78rem]">
          {slices.map((s, i) => (
            <li key={`${i}-${s.name}`} className="flex min-w-0 items-center gap-[0.4rem]">
              <span aria-hidden className="inline-block size-[0.6rem] shrink-0 rounded-[2px]" style={{ background: s.other ? 'var(--muted)' : categorical(i) }} />
              {s.other ? <span className="truncate">{t('viz.donut.other')}</span> : <SafeValue value={s.name} className="truncate" />}
              <span className="ml-auto font-mono tabular-nums">{share(s)}</span>
            </li>
          ))}
        </ul>
      </div>
    </VizFrame>
  );
}
