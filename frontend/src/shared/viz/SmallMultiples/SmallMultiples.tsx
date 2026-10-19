import { useTranslation } from 'react-i18next';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Sparkline } from '@/shared/ui/Sparkline';
import { VizFrame } from '../core/VizFrame';
import { formatAmount } from '../core/format';
import { useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

/** Mode 18: small multiples, one sparkline per category on its own scale; the name, not a color, identifies it. */
export function SmallMultiples({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const categories = (data.categories ?? []).filter((c) => Array.isArray(c.series));
  return (
    <VizFrame mode="small-multiples" level={level} label={data.label} status={data.status} empty={categories.length === 0} className={className}>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-[0.5rem] p-0">
        {categories.map((c, i) => {
          const series = c.series ?? [];
          const value = c.value ?? series[series.length - 1] ?? null;
          const shown = typeof value === 'number' ? formatAmount(value, locale, data.unit) : '—';
          return (
            <li key={`${i}-${c.name}`} className="min-w-0 rounded-[0.5rem] bg-s2 px-[0.6rem] py-[0.45rem]">
              <div className="flex items-baseline justify-between gap-[0.4rem] text-[0.75rem]">
                <SafeValue value={c.name} className="truncate text-muted" />
                <FlashValue value={typeof value === 'number' ? value : null} className="font-mono font-semibold tabular-nums">
                  {shown}
                </FlashValue>
              </div>
              <Sparkline values={series} status="INFO" label={t('viz.chart.label', { label: safeText(c.name), current: shown })} />
            </li>
          );
        })}
      </ul>
    </VizFrame>
  );
}
