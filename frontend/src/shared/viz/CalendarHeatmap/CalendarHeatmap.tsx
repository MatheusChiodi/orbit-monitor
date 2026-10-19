import { useTranslation } from 'react-i18next';
import { useLocale } from '@/shared/i18n/useLocale';
import { DEFAULT_HISTORY_HOURS } from '../compatibility';
import { HeatGrid, type HeatRow } from '../core/HeatGrid';
import { VizFrame } from '../core/VizFrame';
import { formatAmount } from '../core/format';
import { useVizLevel } from '../core/useVizLevel';
import { weekdayNames } from '../WeekdayHourHeatmap/WeekdayHourHeatmap';
import type { ModeProps, VizDay, VizPoint } from '../types';

const WEEKS = 5;
const DAY_MS = 24 * 3600_000;
const pad2 = (n: number) => String(n).padStart(2, '0');

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local calendar day of an ISO date (`2026-10-18`), at noon to stay clear of DST edges. */
function parseDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

/** Daily averages of a numeric series (local days). */
export function daysFromPoints(points: readonly VizPoint[]): VizDay[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const p of points) {
    if (typeof p.value !== 'number') continue;
    const key = isoDate(new Date(p.at));
    const day = sums.get(key) ?? { total: 0, count: 0 };
    day.total += p.value;
    day.count += 1;
    sums.set(key, day);
  }
  return [...sums.entries()].map(([date, d]) => ({ date, value: d.total / d.count }));
}

/** Mode 13: calendar heatmap (daily uptime / daily totals), the last 5 weeks ending on the latest day. */
export function CalendarHeatmap({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const days = data.days?.length ? data.days : daysFromPoints(data.points ?? []);
  const byDate = new Map(days.map((d) => [d.date, d.value]));
  const latest = days.length ? days.map((d) => parseDay(d.date)).reduce((a, b) => (a > b ? a : b)) : new Date();
  // Weeks start on Monday; the grid ends on the week of the latest day.
  const lastMonday = new Date(latest.getTime() - ((latest.getDay() + 6) % 7) * DAY_MS);
  const firstMonday = new Date(lastMonday.getTime() - (WEEKS - 1) * 7 * DAY_MS);
  const names = weekdayNames(locale);
  const dayFormat = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
  const rows: HeatRow[] = Array.from({ length: WEEKS }, (_, week) => {
    const monday = new Date(firstMonday.getTime() + week * 7 * DAY_MS);
    return {
      key: isoDate(monday),
      label: dayFormat.format(monday),
      cells: names.map((_, weekday) => {
        const day = new Date(monday.getTime() + weekday * DAY_MS);
        const value = byDate.get(isoDate(day)) ?? null;
        const shown = value === null ? t('viz.noDataCell') : formatAmount(value, locale, data.unit);
        return { key: isoDate(day), name: t('viz.heatmap.cell', { when: dayFormat.format(day), value: shown }), value };
      }),
    };
  });
  const latestDay = days.find((d) => d.date === isoDate(latest));
  return (
    <VizFrame
      mode="calendar-heatmap"
      level={level}
      label={data.label}
      status={data.status}
      empty={days.length === 0}
      historyHours={data.historyHours ?? DEFAULT_HISTORY_HOURS}
      className={className}
    >
      {latestDay && latestDay.value !== null && (
        <p className="m-0 flex items-baseline gap-[0.5rem]">
          <span className="font-mono text-[1.15rem] font-semibold tabular-nums">{formatAmount(latestDay.value, locale, data.unit)}</span>
          <span className="font-mono text-[0.72rem] text-muted tabular-nums">{dayFormat.format(latest)}</span>
        </p>
      )}
      <HeatGrid label={data.label} rows={rows} level={level} columnCount={7} maxCell="1.6rem" columns={names.map((text, index) => ({ index, text }))} />
    </VizFrame>
  );
}
