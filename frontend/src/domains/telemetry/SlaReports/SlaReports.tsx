import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDuration, formatPercent } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, EmptyState, HistoryNotice, IconDownload, SegmentedControl, Table, type TableColumn } from '@/shared/ui';
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

interface ReportRow {
  id: string;
  name: string;
  /** Group of a monitor row; member count of a group row. */
  second: ReactNode;
  uptime: number | null;
  downMs: number;
  incidents: number;
}

/**
 * FE-43: uptime per group and per monitor over what the history store holds. Periods longer than the
 * coverage are flagged as partial and never presented as complete. Both tables share one column grid.
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
  const setPeriod = (id: SlaPeriodId) => {
    if (controlled === undefined) setInternal(id);
    onPeriodChange?.(id);
  };
  const periodControl = controls ?? (
    <SegmentedControl label={t('reports.period')} value={chosen.id} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.id, label: p.label }))} />
  );

  if (!historyStart || rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">{periodControl}</div>
        {coverageNote}
        <EmptyState title={t('ops.reports.emptyTitle')}>{t('ops.reports.emptyBody')}</EmptyState>
      </div>
    );
  }

  const cover = coverage({ requestedMs: period.hours * HOUR, historyStart, now });
  const availableHours = Math.min(windowHours, Math.floor(cover.availableMs / HOUR) || DEFAULT_WINDOW_HOURS);
  const groups = groupSla(rows);
  const membersOf = (name: string) => rows.filter((r) => r.groupName === name).length;

  const columns = (first: string, second: string): TableColumn<ReportRow>[] => [
    { key: 'name', header: first, cell: (r) => <SafeValue value={r.name} /> },
    { key: 'second', header: second, cell: (r) => r.second, className: 'w-48 text-muted' },
    {
      key: 'uptime',
      header: t('ops.reports.columns.availability'),
      align: 'end',
      mono: true,
      className: 'w-36',
      cell: (r) => (r.uptime === null ? '—' : formatPercent(r.uptime, 2, locale)),
    },
    { key: 'down', header: t('ops.reports.columns.downtime'), align: 'end', mono: true, className: 'w-36', cell: (r) => formatDuration(r.downMs) },
    { key: 'incidents', header: t('ops.reports.columns.incidents'), align: 'end', mono: true, className: 'w-28', cell: (r) => r.incidents },
  ];
  const groupRows: ReportRow[] = groups.map((g) => ({ ...g, second: membersOf(g.name) }));
  const monitorRows: ReportRow[] = rows.map((r) => ({ ...r, second: <SafeValue value={r.groupName} /> }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {periodControl}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button variant="secondary" onClick={() => onExport(slaToCsv(rows, { historyHours: availableHours }), 'text/csv')}>
            <IconDownload />
            {t('reports.exportCsv')}
          </Button>
          {onExportPdf && (
            <Button variant="secondary" onClick={() => onExportPdf(rows, { historyHours: availableHours, period: period.label })}>
              <IconDownload />
              {t('screens.reports.exportPdf')}
            </Button>
          )}
        </div>
      </div>
      {coverageNote ?? <HistoryNotice windowHours={availableHours} />}
      {!cover.complete && (
        <p role="status" className="m-0 text-base text-warn-text">
          {t('reports.partial', { hours: availableHours, period: period.label })}
        </p>
      )}
      <div data-partial={cover.complete ? 'false' : 'true'} className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="section-label m-0">{t('ops.reports.byGroup')}</h2>
          <Table
            caption={t('screens.reports.groupTable')}
            columns={columns(t('ops.reports.columns.group'), t('ops.reports.columns.monitors'))}
            rows={groupRows}
            getRowKey={(r) => r.id}
          />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="section-label m-0">{t('ops.reports.byMonitor')}</h2>
          <Table
            caption={t('reports.table')}
            columns={columns(t('ops.reports.columns.monitor'), t('ops.reports.columns.group'))}
            rows={monitorRows}
            getRowKey={(r) => r.id}
          />
        </section>
      </div>
    </div>
  );
}
