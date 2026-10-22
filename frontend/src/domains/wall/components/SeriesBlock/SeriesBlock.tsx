import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutBlock } from '@/domains/workspace/layout/grid';
import { CoverageIndicator } from '@/domains/telemetry/history/CoverageIndicator';
import type { HistoryResponse } from '@/domains/telemetry/history/historyApi';
import { presetRange, resolutionFor, type HistoryRange } from '@/domains/telemetry/history/range';
import type { MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { Panel, Sparkline } from '@/shared/ui';

export type LoadHistory = (monitorId: string, range: Pick<HistoryRange, 'from' | 'to'>, resolution: ReturnType<typeof resolutionFor>) => Promise<HistoryResponse>;

export interface SeriesBlockProps {
  monitor: MonitorView | undefined;
  /** FE-58: history window; without it the block shows the live last 60 minutes. */
  range?: LayoutBlock['range'];
  loadHistory?: LoadHistory;
  now: Date;
}

/** History refresh on the wall; the 30-day store has hourly buckets beyond 24 h. */
const REFRESH_MS = 5 * 60_000;

interface Loaded {
  values: (number | null)[];
  response: HistoryResponse;
  range: Pick<HistoryRange, 'from' | 'to'>;
}

export function SeriesBlock({ monitor, range, loadHistory, now }: SeriesBlockProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<Loaded | null>(null);
  const monitorId = monitor?.id;
  const minute = Math.floor(now.getTime() / REFRESH_MS);

  useEffect(() => {
    if (!range || !loadHistory || !monitorId) return;
    let current = true;
    const period = presetRange(range, new Date(minute * REFRESH_MS));
    loadHistory(monitorId, period, resolutionFor(period))
      .then((response) => {
        const points = response.buckets?.map((b) => b.valueMean) ?? response.samples?.map((s) => s.value) ?? [];
        if (current) setHistory({ values: points, response, range: period });
      })
      .catch(() => current && setHistory(null));
    return () => {
      current = false;
    };
  }, [range, loadHistory, monitorId, minute]);

  if (!monitor) {
    return (
      <Panel title={t('wall.blocks.series')} className="h-full">
        <p className="m-0 text-[0.85rem] text-muted">{t('wall.blocks.monitorMissing')}</p>
      </Panel>
    );
  }
  const name = safeText(monitor.name, undefined, { surface: 'wall' });
  const window = range ? t(`wall.blocks.seriesRange.${range}`) : t('wall.blocks.series');
  const values = range ? (history?.values ?? []) : (monitor.series ?? []);
  return (
    <Panel title={t('wall.blocks.seriesOf', { name, range: window })} className="h-full">
      <Sparkline values={values} status={monitor.status} label={t('wall.blocks.seriesOf', { name, range: window })} className="h-[5rem] w-full" />
      {range && history && <CoverageIndicator coverage={history.response.coverage} range={history.range} />}
    </Panel>
  );
}
