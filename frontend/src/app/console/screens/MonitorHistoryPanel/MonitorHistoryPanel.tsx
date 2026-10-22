import { useId, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CoverageIndicator } from '@/domains/telemetry/history/CoverageIndicator';
import { HistoryRangePicker } from '@/domains/telemetry/history/HistoryRangePicker';
import { presetRange, resolutionFor, type HistoryRange } from '@/domains/telemetry/history/range';
import type { Status } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { Sparkline } from '@/shared/ui';
import { useConsole } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import { downShare, historyValues } from './historySeries';

export interface MonitorHistoryPanelProps {
  monitorId: string;
  name: string;
  status: Status;
  /** Starting period (an incident opens a window around it); 24 h otherwise. */
  initial?: HistoryRange;
}

/** FE-58: history window of one monitor from the 30-day store — range picker, coverage and chart. */
export function MonitorHistoryPanel({ monitorId, name, status, initial }: MonitorHistoryPanelProps) {
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
  const values = history.data ? historyValues(history.data) : [];
  const down = history.data ? downShare(history.data) : null;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-[0.6rem] rounded-[0.9rem] border border-line bg-s1 p-[1rem]">
      <h2 id={titleId} className="section-label m-0">
        {t('screens.history.title')}
      </h2>
      <HistoryRangePicker value={range} onChange={setRange} />
      {history.data?.coverage && <CoverageIndicator coverage={history.data.coverage} range={range} />}
      <ScreenStatus pending={history.isPending} error={history.error} />
      {history.data &&
        (values.length === 0 ? (
          <p className="m-0 text-[0.85rem] text-muted">{t('screens.history.empty')}</p>
        ) : (
          <>
            <Sparkline values={values} status={status} label={t('screens.history.chart', { name: safeText(name) })} className="h-[5rem] w-full" />
            {down !== null && <p className="m-0 text-[0.85rem] text-muted">{t('screens.history.down', { percent: down })}</p>}
          </>
        ))}
    </section>
  );
}
