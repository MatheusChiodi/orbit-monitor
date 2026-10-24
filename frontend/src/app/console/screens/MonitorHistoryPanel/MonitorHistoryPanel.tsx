import { useId, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CoverageIndicator } from '@/domains/telemetry/history/CoverageIndicator';
import { HistoryRangePicker } from '@/domains/telemetry/history/HistoryRangePicker';
import { presetRange, resolutionFor, type HistoryRange } from '@/domains/telemetry/history/range';
import { HistoryChart } from '@/domains/telemetry/history/HistoryChart';
import { IconDownload } from '@/shared/ui';
import type { Rule, Status } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { useConsole } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import { downShare, historyPoints } from './historySeries';

export interface MonitorHistoryPanelProps {
  monitorId: string;
  name: string;
  status: Status;
  /** Starting period (an incident opens a window around it); 24 h otherwise. */
  initial?: HistoryRange;
  /** Main rule: its limit is drawn on the chart. */
  rule?: Rule;
  unit?: string;
  /** CSV download of the shown period (live mode only). */
  exportHref?: (range: HistoryRange) => string;
}

/** FE-58: history window of one monitor from the 30-day store — range picker, coverage and chart. */
export function MonitorHistoryPanel({ monitorId, name, status, initial, rule, unit, exportHref }: MonitorHistoryPanelProps) {
  const { t } = useTranslation();
  const { source, demo } = useConsole();
  const titleId = useId();
  const [range, setRange] = useState<HistoryRange>(() => initial ?? presetRange('24h'));
  const history = useQuery({
    queryKey: ['history', demo, monitorId, range.from.toISOString(), range.to.toISOString()],
    queryFn: () =>
      source.getHistory(monitorId, { from: range.from.toISOString(), to: range.to.toISOString() }, resolutionFor(range)),
    placeholderData: keepPreviousData,
  });
  const points = history.data ? historyPoints(history.data) : [];
  const down = history.data ? downShare(history.data) : null;

  return (
    <section aria-labelledby={titleId} data-surface="panel" className="flex flex-col gap-3 rounded-md border border-line bg-s1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="section-label m-0">
          {t('screens.history.title')}
        </h2>
        <div className="flex flex-wrap items-start gap-3">
          <HistoryRangePicker value={range} onChange={setRange} />
          {exportHref && (
            <a
              href={exportHref(range)}
              download
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-2 px-3 text-sm text-text hover:bg-s2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <IconDownload />
              {t('ops.detail.exportCsv')}
            </a>
          )}
        </div>
      </div>
      {history.data?.coverage && <CoverageIndicator coverage={history.data.coverage} range={range} />}
      <ScreenStatus pending={history.isPending} error={history.error} />
      {history.data &&
        (points.every((p) => p.value === null) ? (
          <p className="m-0 text-base text-muted">{t('screens.history.empty')}</p>
        ) : (
          <>
            <HistoryChart
              points={points}
              limit={rule?.limit ?? null}
              unit={unit}
              status={status}
              label={t('screens.history.chart', { name: safeText(name) })}
            />
            {down !== null && <p className="m-0 text-sm text-muted">{t('screens.history.down', { percent: down })}</p>}
          </>
        ))}
    </section>
  );
}
