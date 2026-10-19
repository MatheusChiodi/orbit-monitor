import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatDuration, formatPercent } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, Button, HistoryNotice } from '@/shared/ui';
import { coverage, slaToCsv } from './sla';

export interface SlaRow {
  id: string;
  name: string;
  groupName: string;
  /** Percentage points over the available window; null when nothing was measured. */
  uptime: number | null;
  downMs: number;
  incidents: number;
}

export interface SlaReportsProps {
  rows: readonly SlaRow[];
  /** First point still in backend memory; null right after a restart. */
  historyStart: string | null;
  now: Date;
  onExport: (content: string, mime: string) => void;
}

const HOUR = 3_600_000;
const WINDOW_HOURS = 24;
const PERIODS = [
  { id: '24h', label: '24 h', hours: 24 },
  { id: '7d', label: '7 d', hours: 24 * 7 },
  { id: '30d', label: '30 d', hours: 24 * 30 },
] as const;

/**
 * FE-43: uptime per monitor over what is actually in memory. Periods longer than the window are
 * flagged as partial and never presented as complete (Orbit has no database).
 */
export function SlaReports({ rows, historyStart, now, onExport }: SlaReportsProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0]);

  if (!historyStart || rows.length === 0) return <p className="m-0 text-[0.85rem] text-muted">{t('reports.empty')}</p>;

  const cover = coverage({ requestedMs: period.hours * HOUR, historyStart, now });
  const availableHours = Math.min(WINDOW_HOURS, Math.floor(cover.availableMs / HOUR) || WINDOW_HOURS);

  return (
    <div className="flex flex-col gap-[0.8rem]">
      <HistoryNotice windowHours={availableHours} />
      <div role="radiogroup" aria-label={t('reports.period')} className="flex gap-[0.4rem]">
        {PERIODS.map((p) => (
          <label key={p.id} className={`cursor-pointer rounded-[0.45rem] border px-[0.6rem] py-[0.25rem] text-[0.85rem] ${p.id === period.id ? 'border-info text-info' : 'border-line-2 text-muted'}`}>
            <input type="radio" name="sla-period" className="sr-only" checked={p.id === period.id} onChange={() => setPeriod(p)} />
            {p.label}
          </label>
        ))}
      </div>
      {!cover.complete && (
        <p role="status" className="m-0 text-[0.85rem] text-warn-text">
          {t('reports.partial', { hours: availableHours, period: period.label })}
        </p>
      )}
      <table aria-label={t('reports.table')} data-partial={cover.complete ? 'false' : 'true'} className="w-full border-collapse text-[0.85rem]">
        <thead className="text-left text-[0.75rem] text-muted">
          <tr>
            <th className="py-[0.3rem]">{t('console.monitors.columns.monitor')}</th>
            <th>{t('form.group')}</th>
            <th className="text-right">%</th>
            <th className="text-right">⏱</th>
            <th className="text-right">#</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {rows.map((row, index) => (
              <AnimatedItem as="tr" key={row.id} index={index} count={rows.length} className="border-t border-line">
                <td className="py-[0.35rem]">
                  <SafeValue value={row.name} />
                </td>
                <td>
                  <SafeValue value={row.groupName} />
                </td>
                <td className="text-right font-mono">{row.uptime === null ? '—' : formatPercent(row.uptime, 2, locale)}</td>
                <td className="text-right font-mono">{formatDuration(row.downMs)}</td>
                <td className="text-right font-mono">{row.incidents}</td>
              </AnimatedItem>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      <div>
        <Button onClick={() => onExport(slaToCsv(rows, { historyHours: availableHours }), 'text/csv')}>{t('reports.exportCsv')}</Button>
      </div>
    </div>
  );
}
