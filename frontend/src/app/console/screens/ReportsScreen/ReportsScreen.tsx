import { useMemo, useState } from 'react';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CoverageIndicator } from '@/domains/telemetry/history/CoverageIndicator';
import { HistoryRangePicker } from '@/domains/telemetry/history/HistoryRangePicker';
import { presetRange, type HistoryRange, type StoreCoverage } from '@/domains/telemetry/history/range';
import { SlaReports, slaToPdf } from '@/domains/telemetry/SlaReports';
import { formatClock } from '@/shared/format';
import { useConsole, useGroups, useIncidents, useMonitors } from '../../ConsoleContext';
import { downloadBlob } from '../../download';
import { PageHeader } from '@/shared/ui';
import { ScreenStatus } from '../ScreenStatus';
import { toSlaRow } from './slaRows';

const HOUR = 3_600_000;

const stamp = (now: Date) => now.toISOString().slice(0, 10);

function storeCoverage(info: { oldest: string | null; newest: string | null; retentionDays: number; rawWritesEnabled: boolean }): StoreCoverage {
  return { oldest: info.oldest, newest: info.newest ?? new Date().toISOString(), retentionDays: info.retentionDays, rawWritesEnabled: info.rawWritesEnabled };
}

/** FE-43: `#/reports` — uptime per monitor from the history store, CSV and PDF export (redacted). */
export function ReportsScreen() {
  const { t } = useTranslation();
  const { source, demo } = useConsole();
  const monitors = useMonitors();
  const groups = useGroups();
  const incidents = useIncidents();
  // FE-58: one period control for the whole screen (presets or a custom range up to 31 days).
  const [period, setPeriod] = useState<HistoryRange>(() => presetRange('24h'));
  const now = period.to;
  const range = useMemo(() => ({ from: period.from.toISOString(), to: period.to.toISOString() }), [period]);
  const hours = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / HOUR));
  const label = period.preset === 'custom' ? t('historyRange.presets.custom') : t(`historyRange.presets.${period.preset}`);
  const coverage = useQuery({ queryKey: ['history-coverage', demo], queryFn: source.getHistoryCoverage });
  const list = monitors.data ?? [];
  const summaries = useQueries({
    queries: list.map((m) => ({
      queryKey: ['history-summary', demo, m.id, range.from, range.to],
      queryFn: () => source.getHistorySummary(m.id, range),
      placeholderData: keepPreviousData,
    })),
  });

  const rows = list.flatMap((monitor, i) => {
    const summary = summaries[i]?.data;
    if (!summary) return [];
    const groupName = groups.data?.find((g) => g.id === monitor.groupId)?.name ?? '';
    return [toSlaRow(monitor, groupName, summary, incidents.data ?? [])];
  });
  const pending = coverage.isPending || monitors.isPending || summaries.some((s) => s.isPending);
  const error = coverage.error ?? summaries.find((s) => s.error)?.error ?? null;

  return (
    <>
      <PageHeader title={t('screens.reports.title')} description={t('ops.reports.description')} />
      <ScreenStatus pending={pending} error={error} />
      {!pending && !error && (
        <SlaReports
          rows={rows}
          historyStart={coverage.data?.oldest ?? null}
          now={now}
          windowHours={(coverage.data?.retentionDays ?? 1) * 24}
          requested={{ hours, label }}
          controls={<HistoryRangePicker value={period} onChange={setPeriod} />}
          coverageNote={coverage.data && <CoverageIndicator coverage={storeCoverage(coverage.data)} range={period} />}
          onExport={(content, mime) => downloadBlob(new Blob([content], { type: mime }), `orbit-sla-${stamp(now)}.csv`)}
          onExportPdf={(pdfRows, meta) => {
            const header = [
              t('screens.reports.pdfTitle'),
              t('screens.reports.pdfPeriod', { from: range.from, to: range.to }),
              t('reports.history', { hours: meta.historyHours }),
              t('screens.reports.pdfGenerated', { at: `${stamp(now)} ${formatClock(now.toISOString())}` }),
            ];
            const bytes = slaToPdf(pdfRows, { header });
            downloadBlob(new Blob([bytes.slice().buffer], { type: 'application/pdf' }), `orbit-sla-${stamp(now)}.pdf`);
          }}
        />
      )}
    </>
  );
}
