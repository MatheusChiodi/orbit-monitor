import { useTranslation } from 'react-i18next';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { categorical } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { formatAmount } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

/** Mode 10: stacked bar, category + several numbers. Keys keep their slot color across categories. */
export function StackedBar({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const categories = (data.categories ?? []).filter((c) => c.values);
  const keys = data.keys?.length ? data.keys : [...new Set(categories.flatMap((c) => Object.keys(c.values ?? {})))];
  const totals = categories.map((c) => keys.reduce((sum, k) => sum + Math.max(0, c.values?.[k] ?? 0), 0));
  const max = Math.max(0, ...totals) || 1;
  return (
    <VizFrame mode="stacked-bar" level={level} label={data.label} status={data.status} empty={categories.length === 0} className={className}>
      <ul aria-label={t('viz.legend')} className="m-0 flex list-none flex-wrap gap-[0.8rem] p-0 text-[0.72rem] text-muted">
        {keys.map((key, i) => (
          <li key={key} className="inline-flex items-center gap-[0.35rem]">
            <span aria-hidden className="inline-block size-[0.6rem] rounded-[2px]" style={{ background: categorical(i) }} />
            <SafeValue value={key} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-[0.45rem]">
        {categories.map((category, row) => {
          const total = totals[row] ?? 0;
          const name = safeText(category.name);
          const description = keys.map((k) => `${safeText(k)} ${formatAmount(category.values?.[k] ?? 0, locale, data.unit)}`).join(', ');
          return (
            <div key={`${row}-${category.name}`} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-[0.6rem] text-[0.8rem]">
              <SafeValue value={category.name} className="truncate" />
              <div role="img" aria-label={`${name}: ${description}`} className="flex h-[0.9rem] max-h-[24px] gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
                {keys.map((key, i) => {
                  const value = Math.max(0, category.values?.[key] ?? 0);
                  return (
                    <span
                      key={key}
                      data-testid="stack-segment"
                      className={`h-full first:rounded-l-none last:rounded-r-[4px] ${markTransition(level)}`}
                      style={{ flexGrow: value, flexBasis: 0, background: categorical(i), display: value === 0 ? 'none' : undefined }}
                    />
                  );
                })}
              </div>
              <span className="font-mono tabular-nums">{formatAmount(total, locale, data.unit)}</span>
            </div>
          );
        })}
      </div>
    </VizFrame>
  );
}
