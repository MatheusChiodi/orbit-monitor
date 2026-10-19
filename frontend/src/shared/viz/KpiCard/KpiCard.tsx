import { formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { VizFrame } from '../core/VizFrame';
import { withUnit } from '../core/format';
import { useVizLevel } from '../core/useVizLevel';
import type { ModeProps } from '../types';

/** Mode 5: KPI card, several numbers in one row. */
export function KpiCard({ data, animation, className }: ModeProps) {
  const locale = useLocale();
  const level = useVizLevel(animation);
  const items = data.items ?? [];
  return (
    <VizFrame mode="kpi-card" level={level} label={data.label} status={data.status} empty={items.length === 0} className={className}>
      <ul className="m-0 grid list-none auto-cols-fr grid-flow-col gap-[0.5rem] p-0">
        {items.map((item, i) => (
          <li key={`${i}-${item.label}`} className="min-w-0 rounded-[0.5rem] bg-s2 px-[0.6rem] py-[0.5rem]">
            <SafeValue value={item.label} className="block truncate text-[0.72rem] text-muted" />
            <span className="block font-mono text-[1.15rem] font-semibold tabular-nums">
              <FlashValue value={typeof item.value === 'number' ? item.value : null}>
                <SafeValue
                  value={item.value}
                  field={item.label}
                  format={(v) => (typeof v === 'number' ? withUnit(formatNumber(v, locale), data.unit) : String(v))}
                />
              </FlashValue>
            </span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}
