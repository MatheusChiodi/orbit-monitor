import { SLA_PERIODS, type SlaPeriodId, type SlaRow } from '@/domains/telemetry/SlaReports';
import type { HistorySummary } from '@/shared/api/consoleTypes';
import type { MonitorView } from '@/shared/api/types';

const HOUR = 3_600_000;

export function periodRange(period: SlaPeriodId, now: Date): { from: string; to: string } {
  const hours = SLA_PERIODS.find((p) => p.id === period)!.hours;
  return { from: new Date(now.getTime() - hours * HOUR).toISOString(), to: now.toISOString() };
}

/** Down time is the down share of the samples over the covered span (BE-20 counts WARN as up). */
export function toSlaRow(
  monitor: MonitorView,
  groupName: string,
  summary: HistorySummary,
  incidents: readonly { monitorId: string; openedAt: string }[],
): SlaRow {
  const span = Date.parse(summary.to) - Date.parse(summary.from);
  const from = Date.parse(summary.from);
  const to = Date.parse(summary.to);
  return {
    id: monitor.id,
    name: monitor.name,
    groupName,
    uptime: summary.samples > 0 ? summary.uptimePercent : null,
    downMs: summary.samples > 0 ? Math.round((summary.down / summary.samples) * span) : 0,
    incidents: incidents.filter((i) => i.monitorId === monitor.id && Date.parse(i.openedAt) >= from && Date.parse(i.openedAt) <= to).length,
  };
}
