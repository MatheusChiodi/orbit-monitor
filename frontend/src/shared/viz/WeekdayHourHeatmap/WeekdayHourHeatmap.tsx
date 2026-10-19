import { useTranslation } from 'react-i18next';
import type { Locale } from '@/shared/i18n/i18n';
import { useLocale } from '@/shared/i18n/useLocale';
import { DEFAULT_HISTORY_HOURS } from '../compatibility';
import { HeatGrid, type HeatRow } from '../core/HeatGrid';
import { VizFrame } from '../core/VizFrame';
import { formatAmount } from '../core/format';
import { useVizLevel } from '../core/useVizLevel';
import type { ModeProps, VizCell, VizPoint } from '../types';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Short weekday names starting on Monday (weekday 0), e.g. "Mon" / "seg.". */
export function weekdayNames(locale: Locale): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2026-10-19 is a Monday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2026, 9, 19 + i)));
}

/** Averages a numeric series into hour × weekday cells (local time). */
export function cellsFromPoints(points: readonly VizPoint[]): VizCell[] {
  const sums = new Map<string, { weekday: number; hour: number; total: number; count: number }>();
  for (const p of points) {
    if (typeof p.value !== 'number') continue;
    const d = new Date(p.at);
    const weekday = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    const key = `${weekday}-${hour}`;
    const cell = sums.get(key) ?? { weekday, hour, total: 0, count: 0 };
    cell.total += p.value;
    cell.count += 1;
    sums.set(key, cell);
  }
  return [...sums.values()].map((c) => ({ weekday: c.weekday, hour: c.hour, value: c.total / c.count }));
}

/** Mode 12: hour × weekday heatmap (seasonality). */
export function WeekdayHourHeatmap({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const cells = data.cells?.length ? data.cells : cellsFromPoints(data.points ?? []);
  const days = weekdayNames(locale);
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c.value]));
  const rows: HeatRow[] = days.map((day, weekday) => ({
    key: String(weekday),
    label: day,
    cells: Array.from({ length: 24 }, (_, hour) => {
      const value = byKey.get(`${weekday}-${hour}`) ?? null;
      const shown = value === null ? t('viz.noDataCell') : formatAmount(value, locale, data.unit, 1);
      return { key: `${weekday}-${hour}`, name: t('viz.heatmap.cell', { when: `${day} ${pad2(hour)}:00`, value: shown }), value };
    }),
  }));
  const peak = cells.reduce<VizCell | null>((best, c) => (c.value !== null && (!best || c.value > (best.value ?? -Infinity)) ? c : best), null);
  return (
    <VizFrame
      mode="weekday-hour-heatmap"
      level={level}
      label={data.label}
      status={data.status}
      empty={cells.length === 0}
      historyHours={data.historyHours ?? DEFAULT_HISTORY_HOURS}
      className={className}
    >
      {peak && peak.value !== null && (
        <p className="m-0 flex items-baseline gap-[0.5rem]">
          <span className="font-mono text-[1.15rem] font-semibold tabular-nums">{formatAmount(peak.value, locale, data.unit, 1)}</span>
          <span className="font-mono text-[0.72rem] text-muted tabular-nums">{`${days[peak.weekday] ?? ''} ${pad2(peak.hour)}:00`}</span>
        </p>
      )}
      <HeatGrid
        label={data.label}
        rows={rows}
        level={level}
        columnCount={24}
        columns={[0, 6, 12, 18].map((h) => ({ index: h, text: pad2(h) }))}
      />
    </VizFrame>
  );
}
