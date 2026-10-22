import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SlaReports, slaToPdf, type SlaPeriodId } from '@/domains/telemetry/SlaReports';
import { formatClock } from '@/shared/format';
import { useConsole, useGroups, useIncidents, useMonitors } from '../../ConsoleContext';
import { downloadBlob } from '../../download';
import { ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { periodRange, toSlaRow } from './slaRows';

const stamp = (now: Date) => now.toISOString().slice(0, 10);

/** FE-43: `#/reports` — uptime per monitor from the history store, CSV and PDF export (redacted). */
export function ReportsScreen() {
  const { t } = useTranslation();
  const { source, demo } = useConsole();
  const monitors = useMonitors();
  const groups = useGroups();
  const incidents = useIncidents();
  const [period, setPeriod] = useState<SlaPeriodId>('24h');
  const [now] = useState(() => new Date());
  const range = useMemo(() => periodRange(period, now), [period, now]);
  const coverage = useQuery({ queryKey: ['history-coverage', demo], queryFn: source.getHistoryCoverage });
  const list = monitors.data ?? [];
  const summaries = useQueries({
    queries: list.map((m) => ({
      queryKey: ['history-summary', demo, m.id, range.from, range.to],
      queryFn: () => source.getHistorySummary(m.id, range),
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
      <ScreenTitle>{t('screens.reports.title')}</ScreenTitle>
      <ScreenStatus pending={pending} error={error} />
      {!pending && !error && (
        <SlaReports
          rows={rows}
          historyStart={coverage.data?.oldest ?? null}
          now={now}
          period={period}
          onPeriodChange={setPeriod}
          windowHours={(coverage.data?.retentionDays ?? 1) * 24}
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
