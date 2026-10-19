import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { VizFrame } from '../core/VizFrame';
import { formatAmount } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

/** Mode 9: bar / ranking, category + number, largest first. One hue: bars encode magnitude, not identity. */
export function BarRanking({ data, animation, className }: ModeProps) {
  const locale = useLocale();
  const level = useVizLevel(animation);
  const rows = (data.categories ?? [])
    .filter((c) => typeof c.value === 'number')
    .map((c) => ({ name: c.name, value: c.value as number }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(0, ...rows.map((r) => r.value)) || 1;
  return (
    <VizFrame mode="bar-ranking" level={level} label={data.label} status={data.status} empty={rows.length === 0} className={className}>
      <ol className="m-0 flex list-none flex-col gap-[0.45rem] p-0">
        {rows.map((row, i) => (
          <li key={`${i}-${row.name}`} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-[0.6rem] text-[0.8rem]">
            <SafeValue value={row.name} className="truncate" />
            <div
              role="meter"
              aria-label={safeText(row.name)}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={row.value}
              className="h-[0.9rem] max-h-[24px]"
            >
              <span
                className={`block h-full w-full origin-left rounded-r-[4px] bg-info ${markTransition(level)}`}
                style={{ transform: `scaleX(${Math.max(0, row.value) / max})` }}
              />
            </div>
            <FlashValue value={row.value} className="font-mono tabular-nums">
              {formatAmount(row.value, locale, data.unit)}
            </FlashValue>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}
