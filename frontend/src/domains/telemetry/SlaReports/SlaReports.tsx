import { useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatDuration, formatPercent } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, Button, HistoryNotice } from '@/shared/ui';
import { coverage, groupSla, slaToCsv } from './sla';

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
  /** Controlled period (the screen fetches the matching range); internal state when omitted. */
  period?: SlaPeriodId;
  onPeriodChange?: (period: SlaPeriodId) => void;
  /** Retention of the history store in hours (CORE-22: 30 days); 24 h for the in-memory window. */
  windowHours?: number;
  /** PDF export (redacted like the CSV); the button shows only when provided. */
  onExportPdf?: (rows: readonly SlaRow[], meta: { historyHours: number; period: string }) => void;
  /** FE-58: the screen's period control (history range picker) replaces the built-in radios. */
  controls?: ReactNode;
  /** FE-58: coverage indicator of the history store, replacing the in-memory notice. */
  coverageNote?: ReactNode;
  /** Period chosen with `controls` (custom ranges included). */
  requested?: { hours: number; label: string };
}

const HOUR = 3_600_000;
const DEFAULT_WINDOW_HOURS = 24;
export const SLA_PERIODS = [
  { id: '24h', label: '24 h', hours: 24 },
  { id: '7d', label: '7 d', hours: 24 * 7 },
  { id: '30d', label: '30 d', hours: 24 * 30 },
] as const;
const PERIODS = SLA_PERIODS;
export type SlaPeriodId = (typeof SLA_PERIODS)[number]['id'];

/**
 * FE-43: uptime per monitor over what is actually in memory. Periods longer than the window are
 * flagged as partial and never presented as complete (Orbit has no database).
 */
export function SlaReports({
  rows,
  historyStart,
  now,
  onExport,
  period: controlled,
  onPeriodChange,
  windowHours = DEFAULT_WINDOW_HOURS,
  onExportPdf,
  controls,
  coverageNote,
  requested,
}: SlaReportsProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const [internal, setInternal] = useState<SlaPeriodId>('24h');
  const chosen = PERIODS.find((p) => p.id === (controlled ?? internal)) ?? PERIODS[0];
  const period = requested ?? chosen;
  const setPeriod = (p: (typeof PERIODS)[number]) => {
    if (controlled === undefined) setInternal(p.id);
    onPeriodChange?.(p.id);
  };

  if (!historyStart || rows.length === 0) {
    return (
      <div className="flex flex-col gap-[0.8rem]">
        {controls}
        {coverageNote}
        <p className="m-0 text-[0.85rem] text-muted">{t('reports.empty')}</p>
      </div>
    );
  }

  const cover = coverage({ requestedMs: period.hours * HOUR, historyStart, now });
  const availableHours = Math.min(windowHours, Math.floor(cover.availableMs / HOUR) || DEFAULT_WINDOW_HOURS);

  return (
    <div className="flex flex-col gap-[0.8rem]">
      {coverageNote ?? <HistoryNotice windowHours={availableHours} />}
      {controls ?? (
        <div role="radiogroup" aria-label={t('reports.period')} className="flex gap-[0.4rem]">
          {PERIODS.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-[0.45rem] border px-[0.6rem] py-[0.25rem] text-[0.85rem] ${p.id === chosen.id ? 'border-info text-info' : 'border-line-2 text-muted'}`}>
              <input type="radio" name="sla-period" className="sr-only" checked={p.id === chosen.id} onChange={() => setPeriod(p)} />
              {p.label}
            </label>
          ))}
        </div>
      )}
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
      <table aria-label={t('screens.reports.groupTable')} className="w-full border-collapse text-[0.85rem]">
        <thead className="text-left text-[0.75rem] text-muted">
          <tr>
            <th className="py-[0.3rem]">{t('form.group')}</th>
            <th className="text-right">%</th>
            <th className="text-right">⏱</th>
            <th className="text-right">#</th>
          </tr>
        </thead>
        <tbody>
          {groupSla(rows).map((group) => (
            <tr key={group.id} className="border-t border-line">
              <td className="py-[0.35rem]">
                <SafeValue value={group.name} />
              </td>
              <td className="text-right font-mono">{group.uptime === null ? '—' : formatPercent(group.uptime, 2, locale)}</td>
              <td className="text-right font-mono">{formatDuration(group.downMs)}</td>
              <td className="text-right font-mono">{group.incidents}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-[0.5rem]">
        <Button onClick={() => onExport(slaToCsv(rows, { historyHours: availableHours }), 'text/csv')}>{t('reports.exportCsv')}</Button>
        {onExportPdf && (
          <Button onClick={() => onExportPdf(rows, { historyHours: availableHours, period: period.label })}>{t('screens.reports.exportPdf')}</Button>
        )}
      </div>
    </div>
  );
}
